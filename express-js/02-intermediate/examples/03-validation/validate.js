export function validateBodyZod(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateBodyJoi(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: error.details.map((d) => ({
            path: d.path.join('.'),
            message: d.message,
          })),
        },
      });
    }
    req.body = value;
    return next();
  };
}
