import { AppError } from '../errors/AppError.js';

const DANGEROUS = /<\s*script|javascript:|onerror\s*=|onload\s*=/i;

export function rejectDangerousHtml(field = 'body') {
  return (req, _res, next) => {
    const value = req.body?.[field];
    if (typeof value === 'string' && DANGEROUS.test(value)) {
      return next(
        new AppError(400, `Field "${field}" contains disallowed HTML/JS content`, {
          code: 'XSS_REJECTED',
        }),
      );
    }
    return next();
  };
}
