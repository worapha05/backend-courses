import express from 'express';
import { pathToFileURL } from 'node:url';

/** Simulated dependency health (flip with READY=0 to fail readiness) */
function checkDependencies() {
  if (process.env.READY === '0') {
    return { ok: false, db: 'down' };
  }
  return { ok: true, db: 'up', pool: { min: 2, max: 10 } };
}

export function createApp() {
  const app = express();

  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'live', pid: process.pid });
  });

  app.get('/health/ready', (_req, res) => {
    const deps = checkDependencies();
    if (!deps.ok) {
      return res.status(503).json({ status: 'not_ready', ...deps, pid: process.pid });
    }
    return res.status(200).json({ status: 'ready', ...deps, pid: process.pid });
  });

  app.get('/api/whoami', (_req, res) => {
    res.json({
      data: {
        pid: process.pid,
        tip: 'Hit this endpoint repeatedly — PIDs may rotate across workers',
      },
    });
  });

  return app;
}

export function startServer(port) {
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Worker ${process.pid} listening on :${port}`);
  });

  const shutdown = (signal) => {
    console.log(`Worker ${process.pid} got ${signal}`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

// Allow: node app.js (single process) for PM2 / local debug
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  startServer(Number(process.env.PORT ?? 3043));
}
