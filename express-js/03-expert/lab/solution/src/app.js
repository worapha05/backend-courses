import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { healthRouter } from './routes/health.routes.js';
import { filesRouter } from './routes/files.routes.js';
import { notesRouter } from './routes/notes.routes.js';
import { sanitizeObject } from './middleware/sanitize.js';
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] ?? randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(
        JSON.stringify({
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
          pid: process.pid,
        }),
      );
    });
    next();
  });

  app.use(express.json({ limit: '50kb' }));
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Upload rate limit exceeded', code: 'RATE_LIMIT' } },
  });

  app.use('/health', healthRouter);
  app.use('/api/upload', uploadLimiter);
  app.use('/api', filesRouter);
  app.use('/api/notes', notesRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
}
