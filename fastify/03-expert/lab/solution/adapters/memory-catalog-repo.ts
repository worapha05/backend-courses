import type { CatalogItem, CatalogRepository } from '../ports/catalog-repository.js';

export function createMemoryCatalogRepo(): CatalogRepository {
  let open = true;
  const store = new Map<string, CatalogItem>([
    ['SKU-1', { sku: 'SKU-1', name: '4K Webcam', stock: 40, warehouseCode: 'WH-BKK-01' }],
    ['SKU-2', { sku: 'SKU-2', name: 'Podcast Mixer', stock: 15, warehouseCode: 'WH-BKK-02' }],
  ]);

  const cache = new Map<string, CatalogItem>();
  const CACHE_MAX = 32;

  const touchCache = (item: CatalogItem) => {
    if (cache.has(item.sku)) {
      cache.delete(item.sku);
    }

    cache.set(item.sku, item);

    if (cache.size > CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) {
        cache.delete(oldest);
      }
    }
  };

  const ensureOpen = () => {
    if (!open) {
      throw Object.assign(new Error('REPO_CLOSED'), { statusCode: 503 });
    }
  };

  const delay = () => new Promise((r) => setTimeout(r, 2));

  return {
    isReady: () => open,

    async close() {
      open = false;
      cache.clear();
      store.clear();
    },

    async list() {
      ensureOpen();
      await delay();

      return [...store.values()];
    },

    async getBySku(sku) {
      ensureOpen();

      const cached = cache.get(sku);
      if (cached) {
        return cached;
      }

      await delay();

      const item = store.get(sku) ?? null;
      if (item) {
        touchCache(item);
      }

      return item;
    },

    async create({ sku, name, stock }) {
      ensureOpen();
      await delay();

      const item: CatalogItem = {
        sku,
        name,
        stock,
        warehouseCode: 'WH-NEW',
      };

      store.set(sku, item);
      touchCache(item);

      return item;
    },

    async purchase(sku, qty) {
      ensureOpen();
      await delay();

      const item = store.get(sku);

      if (!item) {
        throw Object.assign(new Error('SKU_NOT_FOUND'), { statusCode: 404 });
      }

      if (item.stock < qty) {
        throw Object.assign(new Error('INSUFFICIENT_STOCK'), { statusCode: 409 });
      }

      const updated = { ...item, stock: item.stock - qty };
      store.set(sku, updated);
      touchCache(updated);

      return updated;
    },
  };
}
