import { randomUUID } from 'node:crypto';

/** @type {Map<string, object>} */
const store = new Map([
  [
    'p1',
    {
      id: 'p1',
      sku: 'KB-001',
      name: 'Mechanical Keyboard',
      price: 2590,
      createdAt: new Date().toISOString(),
    },
  ],
]);

export async function findAll() {
  return [...store.values()];
}

export async function findById(id) {
  return store.get(id) ?? null;
}

export async function findBySku(sku) {
  const target = String(sku).toUpperCase();
  return [...store.values()].find((p) => p.sku === target) ?? null;
}

export async function create(data) {
  const product = {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  store.set(product.id, product);
  return product;
}

export async function update(id, patch) {
  const current = store.get(id);
  const next = { ...current, ...patch };
  store.set(id, next);
  return next;
}

export async function remove(id) {
  const current = store.get(id);
  store.delete(id);
  return current;
}
