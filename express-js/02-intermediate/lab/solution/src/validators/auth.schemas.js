import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  })
  .strict();
