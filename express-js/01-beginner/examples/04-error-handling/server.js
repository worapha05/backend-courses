/**
 * Error handling — asyncHandler + central error middleware
 * Run: npm run beginner:errors
 */
import express from 'express';
import { asyncHandler } from './asyncHandler.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';
import { HttpError } from './HttpError.js';

const app = express();
const PORT = process.env.PORT ?? 3003;

const items = new Map([['1', { id: '1', name: 'Keyboard' }]]);

app.use(express.json());

app.get('/api/sync-error', (_req, _res) => {
  throw new HttpError(400, 'Sync boom — Express catches this');
});

app.get(
  '/api/async-error',
  asyncHandler(async () => {
    await Promise.reject(new HttpError(503, 'Upstream unavailable'));
  }),
);

app.get(
  '/api/items/:id',
  asyncHandler(async (req, res) => {
    const item = items.get(req.params.id);
    if (!item) {
      throw new HttpError(404, `Item ${req.params.id} not found`);
    }
    res.json({ data: item });
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Error handling demo on http://localhost:${PORT}`);
});
