import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.status(200).json({ status: 'live', pid: process.pid });
});

healthRouter.get('/ready', (_req, res) => {
  if (process.env.READY === '0') {
    return res.status(503).json({ status: 'not_ready', db: 'down', pid: process.pid });
  }
  return res.status(200).json({
    status: 'ready',
    db: 'up',
    pool: { min: 2, max: 10 },
    pid: process.pid,
  });
});
