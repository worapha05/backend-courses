/**
 * Route-level middleware: reject non-JSON content types on write endpoints.
 */
export function requireJson(req, res, next) {
  const type = req.headers['content-type'] ?? '';
  if (!type.includes('application/json')) {
    return res.status(415).json({
      error: {
        message: 'Content-Type must be application/json',
        requestId: req.requestId,
      },
    });
  }
  return next();
}
