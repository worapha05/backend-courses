export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
          requestId: req.requestId,
        },
      });
    }
    req.body = parsed.data;
    return next();
  };
}
