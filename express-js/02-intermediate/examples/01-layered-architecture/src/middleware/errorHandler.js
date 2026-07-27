export function notFoundHandler(req, _res, next) {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  res.status(status).json({
    error: {
      message: status >= 500 ? 'Internal Server Error' : err.message,
      status,
    },
  });
}
