import { z } from 'zod';

export const createProductSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9-]+$/, 'sku must be A-Z, 0-9, or hyphen'),
    name: z.string().trim().min(1).max(120),
    price: z.number().int().min(0),
  })
  .strict();

export const updateProductSchema = createProductSchema.partial().strict();
