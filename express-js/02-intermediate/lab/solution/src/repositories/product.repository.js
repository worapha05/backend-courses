import { randomUUID } from 'node:crypto';

const products = new Map();

export async function findAll() {
  return [...products.values()];
}

export async function findById(id) {
  return products.get(id) ?? null;
}

export async function findBySku(sku) {
  const target = sku.toUpperCase();
  return [...products.values()].find((p) => p.sku === target) ?? null;
}

export async function create({ sku, name, price, ownerId }) {
  const product = {
    id: randomUUID(),
    sku: sku.toUpperCase(),
    name,
    price,
    ownerId,
    createdAt: new Date().toISOString(),
  };
  products.set(product.id, product);
  return product;
}

export async function update(id, patch) {
  const current = products.get(id);
  const next = {
    ...current,
    ...patch,
    sku: patch.sku ? patch.sku.toUpperCase() : current.sku,
  };
  products.set(id, next);
  return next;
}

export async function remove(id) {
  const current = products.get(id);
  products.delete(id);
  return current;
}
