import { randomUUID } from 'node:crypto';

/**
 * Structured request logger with request id propagation.
 */
export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const entry = {
      level: 'info',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    console.log(JSON.stringify(entry));
  });

  next();
}
