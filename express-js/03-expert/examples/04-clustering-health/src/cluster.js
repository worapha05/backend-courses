/**
 * Cluster primary — forks workers
 * Run: WEB_CONCURRENCY=2 npm run expert:cluster
 */
import cluster from 'node:cluster';
import os from 'node:os';
import { startServer } from './app.js';

const PORT = Number(process.env.PORT ?? 3043);

if (cluster.isPrimary) {
  const concurrency = Number(process.env.WEB_CONCURRENCY) || Math.min(2, os.availableParallelism());

  console.log(`Primary ${process.pid} starting ${concurrency} workers`);
  for (let i = 0; i < concurrency; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} exited (${signal || code}) — forking new one`);
    cluster.fork();
  });
} else {
  startServer(PORT);
}
