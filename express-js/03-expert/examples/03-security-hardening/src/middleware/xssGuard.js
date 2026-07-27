const DANGEROUS = /<\s*script|javascript:|onerror\s*=|onload\s*=/i;

/**
 * Reject fields that look like HTML/JS injection when the API expects plain text.
 */
export function rejectDangerousHtml(field = 'body') {
  return (req, res, next) => {
    const value = req.body?.[field];
    if (typeof value === 'string' && DANGEROUS.test(value)) {
      return res.status(400).json({
        error: { message: `Field "${field}" contains disallowed HTML/JS content` },
      });
    }
    return next();
  };
}
