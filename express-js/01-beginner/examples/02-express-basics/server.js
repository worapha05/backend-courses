/**
 * Express basics — routing, req/res, JSON body
 * Run: npm run beginner:express
 */
import express from 'express';
import { booksRouter } from './books.router.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'express-basics' });
});

app.use('/api/books', booksRouter);

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: { message: `Cannot ${req.method} ${req.path}` },
  });
});

app.listen(PORT, () => {
  console.log(`Express basics listening on http://localhost:${PORT}`);
});
