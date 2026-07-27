import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INVENTORY_REPOSITORY,
  InventoryItem,
  InventoryRepository,
  InventorySearchQuery,
} from './inventory.tokens';
import { StockPolicyService } from './stock-policy.service';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repo: InventoryRepository,
    private readonly stockPolicy: StockPolicyService,
  ) {}

  search(query: InventorySearchQuery): InventoryItem[] {
    let items = this.repo.findAll();

    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
      );
    }
    if (query.warehouse) {
      items = items.filter((i) => i.warehouse === query.warehouse);
    }
    if (query.minQty !== undefined) {
      items = items.filter((i) => i.quantity >= query.minQty!);
    }

    const sort = query.sort ?? 'asc';
    items.sort((a, b) => (sort === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity));
    return items;
  }

  findBySku(sku: string): InventoryItem {
    const item = this.repo.findBySku(sku);
    if (!item) throw new NotFoundException(`SKU ${sku} not found`);
    return item;
  }

  create(item: InventoryItem): InventoryItem {
    if (this.repo.findBySku(item.sku)) {
      throw new ConflictException(`SKU ${item.sku} already exists`);
    }
    return this.repo.save(item);
  }

  adjustStock(sku: string, delta: number): InventoryItem {
    const item = this.findBySku(sku);
    item.quantity = this.stockPolicy.applyDelta(item.quantity, delta);
    return this.repo.update(item);
  }

  lowStock(threshold = 5): InventoryItem[] {
    return this.repo.findAll().filter((i) => this.stockPolicy.isLowStock(i, threshold));
  }
}
