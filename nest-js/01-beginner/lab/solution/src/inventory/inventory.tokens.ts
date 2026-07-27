export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryItem {
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  unitCost: number;
}

export interface InventorySearchQuery {
  q?: string;
  warehouse?: string;
  minQty?: number;
  sort?: 'asc' | 'desc';
}

export interface InventoryRepository {
  findAll(): InventoryItem[];
  findBySku(sku: string): InventoryItem | undefined;
  save(item: InventoryItem): InventoryItem;
  update(item: InventoryItem): InventoryItem;
}
