import * as productRepo from '../repositories/product.repository.js';
import { HttpError } from '../middleware/HttpError.js';

export async function listProducts() {
  return productRepo.findAll();
}

export async function getProduct(id) {
  const product = await productRepo.findById(id);
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

export async function createProduct(ownerId, input) {
  const existing = await productRepo.findBySku(input.sku);
  if (existing) throw new HttpError(409, 'SKU already exists');
  return productRepo.create({ ...input, ownerId });
}

export async function updateProduct(actorId, id, input) {
  const product = await getProduct(id);
  if (product.ownerId !== actorId) {
    throw new HttpError(403, 'You can only modify your own products');
  }
  return productRepo.update(id, input);
}

export async function deleteProduct(actorId, id) {
  const product = await getProduct(id);
  if (product.ownerId !== actorId) {
    throw new HttpError(403, 'You can only delete your own products');
  }
  return productRepo.remove(id);
}
