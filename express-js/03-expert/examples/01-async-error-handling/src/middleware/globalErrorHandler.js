import { AppError } from '../errors/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Cannot ${req.method} ${req.path}`, { code: 'NOT_FOUND' }));
}

export function globalErrorHandler(err, req, res, _next) {
  const isOperational = err.isOperational === true;
  const status = err.status ?? 500;

  const body = {
    error: {
      message: isOperational ? err.message : 'Internal Server Error',
      code: err.code ?? (isOperational ? 'APP_ERROR' : 'INTERNAL_ERROR'),
      requestId: req.requestId,
    },
  };

  if (isOperational && err.details) {
    body.error.details = err.details;
  }

  if (!isOperational || status >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: req.requestId,
        message: err.message,
        stack: err.stack,
      }),
    );
  }

  res.status(status).json(body);
}
