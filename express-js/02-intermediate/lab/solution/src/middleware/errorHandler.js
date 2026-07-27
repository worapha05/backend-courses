export function notFoundHandler(req, _res, next) {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: {
      message: status >= 500 && isProd ? 'Internal Server Error' : err.message,
      status,
    },
  });
}
