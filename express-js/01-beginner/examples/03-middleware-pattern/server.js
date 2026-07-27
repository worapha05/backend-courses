/**
 * Middleware pattern — logger, request-id, timing
 * Run: npm run beginner:middleware
 */
import express from 'express';
import { requestLogger } from './requestLogger.js';
import { requireJson } from './requireJson.js';

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(requestLogger);
app.use(express.json({ limit: '50kb' }));

app.get('/api/ping', (req, res) => {
  res.json({ pong: true, requestId: req.requestId });
});

app.post('/api/echo', requireJson, (req, res) => {
  res.json({
    youSent: req.body,
    requestId: req.requestId,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found', requestId: req.requestId } });
});

app.listen(PORT, () => {
  console.log(`Middleware demo on http://localhost:${PORT}`);
});
