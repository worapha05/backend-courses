/**
 * Streams + secure multipart upload
 * Run: npm run expert:streams
 */
import express from 'express';
import multer from 'multer';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../uploads');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT ?? 3041;

const ALLOWED = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain']);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    return cb(null, true);
  },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

/** Demonstrate streaming copy without loading whole file into RAM */
app.post('/api/stream-copy', async (req, res, next) => {
  try {
    const sourceName = 'sample-source.txt';
    const sourcePath = path.join(UPLOAD_DIR, sourceName);
    await fs.writeFile(sourcePath, 'line-1\nline-2\nline-3\n'.repeat(1000));

    const destPath = path.join(UPLOAD_DIR, `copy-${randomUUID()}.txt`);
    await pipeline(createReadStream(sourcePath), createWriteStream(destPath));

    res.json({
      data: {
        source: sourceName,
        dest: path.basename(destPath),
        note: 'Copied via stream.pipeline',
      },
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: { message: err.message, code: err.code } });
    }
    if (err) {
      return res.status(400).json({ error: { message: err.message } });
    }
    if (!req.file) {
      return res.status(400).json({ error: { message: 'file field is required' } });
    }
    return res.status(201).json({
      data: {
        storedAs: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype,
      },
    });
  });
});

app.get('/api/download/:name', (req, res) => {
  const name = path.basename(req.params.name); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, name);
  const stream = createReadStream(filePath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  stream.pipe(res);
  stream.on('error', (err) => {
    if (!res.headersSent) res.status(404).json({ error: { message: 'File not found' } });
    else res.destroy(err);
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: { message: err.message } });
});

app.listen(PORT, () => {
  console.log(`Streams/uploads demo on http://localhost:${PORT}`);
});
