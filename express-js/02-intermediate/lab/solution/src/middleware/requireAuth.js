import jwt from 'jsonwebtoken';
import { HttpError } from './HttpError.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Unauthorized'));
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
      issuer: 'shopforge',
      audience: 'api',
    });
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}
