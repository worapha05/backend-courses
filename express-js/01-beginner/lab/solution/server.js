/**
 * Lab 1 solution — Mini Task API
 * Run: npm run beginner:lab
 */
import express from 'express';
import { requestLogger } from './requestLogger.js';
import { tasksRouter } from './tasks.router.js';
import { notFoundHandler, errorHandler } from './errorHandler.js';

const app = express();
const PORT = process.env.PORT ?? 3010;

app.use(requestLogger);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/tasks', tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TaskBoard Lite on http://localhost:${PORT}`);
});
