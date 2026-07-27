export function sanitizeObject(input) {
  if (Array.isArray(input)) {
    return input.map((item) => (item && typeof item === 'object' ? sanitizeObject(item) : item));
  }
  if (!input || typeof input !== 'object') return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    out[key] = value && typeof value === 'object' ? sanitizeObject(value) : value;
  }
  return out;
}
