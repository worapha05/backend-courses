/**
 * Async excellence + global error middleware
 * Run: npm run expert:async
 */
import express from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from './errors/AppError.js';
import { asyncHandler } from './middleware/asyncHandler.js';
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler.js';
import { installProcessGuards } from './processGuards.js';

installProcessGuards();

const app = express();
const PORT = process.env.PORT ?? 3040;

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use(express.json());

app.get('/api/ok', (_req, res) => {
  res.json({ ok: true });
});

app.get(
  '/api/operational',
  asyncHandler(async () => {
    throw new AppError(422, 'Invalid business state', {
      code: 'INVALID_STATE',
      details: { field: 'status' },
    });
  }),
);

app.get(
  '/api/boom',
  asyncHandler(async () => {
    // programmer error — isOperational false by default for plain Error
    throw new Error('Unexpected null reference simulation');
  }),
);

app.get(
  '/api/async-reject',
  asyncHandler(async () => {
    await Promise.reject(
      new AppError(503, 'Payment provider timeout', { code: 'UPSTREAM_TIMEOUT' }),
    );
  }),
);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  console.log(`Async error demo on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`shutting down on ${signal}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
