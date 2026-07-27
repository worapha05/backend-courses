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

export async function createProduct(input) {
  const { sku, name, price } = input ?? {};
  if (!sku || !name || price == null) {
    throw new HttpError(400, 'sku, name, and price are required');
  }
  if (typeof price !== 'number' || price < 0) {
    throw new HttpError(400, 'price must be a non-negative number');
  }
  const existing = await productRepo.findBySku(sku);
  if (existing) throw new HttpError(409, 'SKU already exists');

  return productRepo.create({
    sku: String(sku).toUpperCase(),
    name: String(name).trim(),
    price: Number(price),
  });
}

export async function updateProduct(id, input) {
  await getProduct(id);
  const patch = {};
  if (input?.name != null) patch.name = String(input.name).trim();
  if (input?.price != null) {
    if (typeof input.price !== 'number' || input.price < 0) {
      throw new HttpError(400, 'price must be a non-negative number');
    }
    patch.price = input.price;
  }
  return productRepo.update(id, patch);
}

export async function deleteProduct(id) {
  await getProduct(id);
  return productRepo.remove(id);
}
