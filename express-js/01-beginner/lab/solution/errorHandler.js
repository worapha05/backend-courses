import { HttpError } from './HttpError.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Cannot ${req.method} ${req.path}`));
}

export function errorHandler(err, req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;
  const isProd = process.env.NODE_ENV === 'production';

  const body = {
    error: {
      message: status >= 500 && isProd ? 'Internal Server Error' : err.message,
      status,
      requestId: req.requestId,
    },
  };

  if (!isProd && status >= 500) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}
