import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { loginSchema, registerSchema } from '../validators/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
