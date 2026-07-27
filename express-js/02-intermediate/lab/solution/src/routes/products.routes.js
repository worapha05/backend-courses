import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateBody.js';
import { createProductSchema, updateProductSchema } from '../validators/product.schemas.js';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(productController.list));
productsRouter.get('/:id', asyncHandler(productController.getById));
productsRouter.post(
  '/',
  requireAuth,
  validateBody(createProductSchema),
  asyncHandler(productController.create),
);
productsRouter.patch(
  '/:id',
  requireAuth,
  validateBody(updateProductSchema),
  asyncHandler(productController.update),
);
productsRouter.delete('/:id', requireAuth, asyncHandler(productController.remove));
