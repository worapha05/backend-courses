/**
 * Wrap async route handlers so rejections go to next(err).
 * Needed for Express 4; Express 5 handles rejected promises natively.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
