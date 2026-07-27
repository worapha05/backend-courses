export function notFoundHandler(req, res, next) {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;
  const isProd = process.env.NODE_ENV === 'production';

  const body = {
    error: {
      message: status >= 500 && isProd ? 'Internal Server Error' : err.message,
      status,
    },
  };

  if (!isProd && status >= 500) {
    body.error.stack = err.stack;
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json(body);
}
