/**
 * Zod + Joi validation middleware demo
 * Run: npm run intermediate:validation
 */
import express from 'express';
import { z } from 'zod';
import Joi from 'joi';
import { validateBodyZod, validateBodyJoi } from './validate.js';

const app = express();
const PORT = process.env.PORT ?? 3021;

app.use(express.json({ limit: '50kb' }));

const zodSchema = z
  .object({
    email: z.string().trim().email().max(254),
    age: z.number().int().min(13).max(120),
    role: z.enum(['user', 'admin']).default('user'),
  })
  .strict();

const joiSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  tags: Joi.array().items(Joi.string().trim().max(32)).max(10).default([]),
  published: Joi.boolean().default(false),
}).unknown(false);

app.post('/api/zod/users', validateBodyZod(zodSchema), (req, res) => {
  res.status(201).json({ data: req.body, via: 'zod' });
});

app.post('/api/joi/articles', validateBodyJoi(joiSchema), (req, res) => {
  res.status(201).json({ data: req.body, via: 'joi' });
});

app.use((err, _req, res, _next) => {
  res.status(err.status ?? 500).json({ error: { message: err.message } });
});

app.listen(PORT, () => {
  console.log(`Validation demo on http://localhost:${PORT}`);
  console.log('POST /api/zod/users {"email":"a@b.com","age":20}');
  console.log('POST /api/joi/articles {"title":"Hello","tags":["api"]}');
});
