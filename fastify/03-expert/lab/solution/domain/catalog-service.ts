import type { CatalogItem, CatalogRepository } from '../ports/catalog-repository.js';

export type CatalogService = {
  list: () => Promise<CatalogItem[]>;
  get: (sku: string) => Promise<CatalogItem>;
  create: (input: { sku: string; name: string; stock: number }) => Promise<CatalogItem>;
  purchase: (sku: string, qty: number) => Promise<CatalogItem>;
};

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

export function createCatalogService(repo: CatalogRepository): CatalogService {
  return {
    list: () => repo.list(),

    async get(sku) {
      const item = await repo.getBySku(sku);

      if (!item) {
        throw httpError('SKU_NOT_FOUND', 404);
      }

      return item;
    },

    async create(input) {
      if (input.stock < 0) {
        throw httpError('INVALID_STOCK', 400);
      }

      const existing = await repo.getBySku(input.sku);

      if (existing) {
        throw httpError('SKU_EXISTS', 409);
      }

      return repo.create(input);
    },

    async purchase(sku, qty) {
      if (qty <= 0) {
        throw httpError('INVALID_QTY', 400);
      }

      return repo.purchase(sku, qty);
    },
  };
}
