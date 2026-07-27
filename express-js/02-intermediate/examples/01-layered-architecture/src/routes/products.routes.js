import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const productsRouter = Router();

productsRouter.get('/', asyncHandler(productController.list));
productsRouter.get('/:id', asyncHandler(productController.getById));
productsRouter.post('/', asyncHandler(productController.create));
productsRouter.patch('/:id', asyncHandler(productController.update));
productsRouter.delete('/:id', asyncHandler(productController.remove));
