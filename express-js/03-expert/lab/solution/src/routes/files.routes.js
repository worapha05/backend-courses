import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream, promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../errors/AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/png', 'image/jpeg', 'application/pdf']);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new AppError(400, 'Unsupported file type', { code: 'BAD_FILE_TYPE' }));
    }
    return cb(null, true);
  },
});

export const filesRouter = Router();

filesRouter.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.message, { code: err.code }));
    }
    if (err) return next(err);
    if (!req.file) {
      return next(new AppError(400, 'file field is required', { code: 'FILE_REQUIRED' }));
    }
    return res.status(201).json({
      data: {
        storedAs: req.file.filename,
        size: req.file.size,
        mime: req.file.mimetype,
      },
    });
  });
});

filesRouter.get(
  '/files/:name',
  asyncHandler(async (req, res) => {
    const name = path.basename(req.params.name);
    const filePath = path.join(UPLOAD_DIR, name);

    // Ensure resolved path stays inside upload dir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      throw new AppError(400, 'Invalid file name', { code: 'BAD_PATH' });
    }

    await fs.access(resolved).catch(() => {
      throw new AppError(404, 'File not found', { code: 'NOT_FOUND' });
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    const stream = createReadStream(resolved);
    stream.pipe(res);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: { message: 'Stream failed', code: 'STREAM_ERROR' } });
      } else {
        res.destroy(err);
      }
    });
  }),
);
