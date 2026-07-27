import express from 'express';
import { productsRouter } from './routes/products.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/products', productsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
