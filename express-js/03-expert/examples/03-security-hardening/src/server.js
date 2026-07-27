/**
 * Production security middleware demo
 * Run: npm run expert:security
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { sanitizeObject } from './middleware/sanitize.js';
import { rejectDangerousHtml } from './middleware/xssGuard.js';
import { safeFindUser } from './safeQuery.js';

const app = express();
const PORT = process.env.PORT ?? 3042;

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    credentials: true,
  }),
);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts, try later' } },
});

app.use(globalLimiter);
app.use(express.json({ limit: '50kb' }));
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: { message: 'email and password required as strings' } });
  }
  // Demo only — always fake success after validation
  return res.json({ data: { token: 'demo-token', email } });
});

app.get('/api/users/lookup', (req, res) => {
  try {
    const user = safeFindUser(req.query.email);
    if (!user) return res.status(404).json({ error: { message: 'Not found' } });
    return res.json({ data: user });
  } catch (err) {
    return res.status(400).json({ error: { message: err.message } });
  }
});

app.post('/api/comments', rejectDangerousHtml('body'), (req, res) => {
  res.status(201).json({ data: { body: req.body.body } });
});

app.listen(PORT, () => {
  console.log(`Security hardening demo on http://localhost:${PORT}`);
});
