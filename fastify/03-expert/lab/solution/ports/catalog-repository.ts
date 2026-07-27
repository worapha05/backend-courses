export type CatalogItem = {
  sku: string;
  name: string;
  stock: number;
  warehouseCode: string;
};

export type CatalogRepository = {
  list: () => Promise<CatalogItem[]>;
  getBySku: (sku: string) => Promise<CatalogItem | null>;
  create: (input: { sku: string; name: string; stock: number }) => Promise<CatalogItem>;
  purchase: (sku: string, qty: number) => Promise<CatalogItem>;
  isReady: () => boolean;
  close: () => Promise<void>;
};
