import { Injectable } from '@nestjs/common';
import { InventoryItem, InventoryRepository } from './inventory.tokens';

@Injectable()
export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly store: InventoryItem[] = [
    {
      sku: 'SKU-A1',
      name: 'Laptop Stand',
      warehouse: 'BKK',
      quantity: 12,
      unitCost: 890,
    },
    {
      sku: 'SKU-B2',
      name: 'USB-C Cable',
      warehouse: 'BKK',
      quantity: 3,
      unitCost: 120,
    },
    {
      sku: 'SKU-C3',
      name: 'Webcam HD',
      warehouse: 'CNX',
      quantity: 0,
      unitCost: 1500,
    },
    {
      sku: 'SKU-D4',
      name: 'Desk Lamp',
      warehouse: 'CNX',
      quantity: 8,
      unitCost: 650,
    },
  ];

  findAll(): InventoryItem[] {
    return this.store.map((i) => ({ ...i }));
  }

  findBySku(sku: string): InventoryItem | undefined {
    const found = this.store.find((i) => i.sku === sku);
    return found ? { ...found } : undefined;
  }

  save(item: InventoryItem): InventoryItem {
    this.store.push({ ...item });
    return { ...item };
  }

  update(item: InventoryItem): InventoryItem {
    const idx = this.store.findIndex((i) => i.sku === item.sku);
    if (idx >= 0) {
      this.store[idx] = { ...item };
    }
    return { ...item };
  }
}
