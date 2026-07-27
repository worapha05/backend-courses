import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../services/auth.service.js';
import { asyncHandler } from './asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';

export const authRouter = Router();

const registerSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
    name: z.string().trim().min(1).max(80),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  })
  .strict();

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authController.register(req.body);
    res.status(201).json({ data: result });
  }),
);

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authController.login(req.body);
    res.json({ data: result });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authController.getProfile(req.user.sub);
    res.json({ data: user });
  }),
);
