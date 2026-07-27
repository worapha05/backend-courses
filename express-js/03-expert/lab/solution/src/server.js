import { createApp } from './app.js';
import { installProcessGuards } from './processGuards.js';

installProcessGuards();

const PORT = Number(process.env.PORT ?? 3050);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`AetherUpload on http://localhost:${PORT} (pid ${process.pid})`);
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', msg: 'shutdown', signal, pid: process.pid }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
