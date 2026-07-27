import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryItem } from './inventory.tokens';

@Injectable()
export class StockPolicyService {
  isLowStock(item: InventoryItem, threshold = 5): boolean {
    return item.quantity <= threshold;
  }

  applyDelta(current: number, delta: number): number {
    const next = current + delta;
    if (next < 0) {
      throw new BadRequestException(
        `Stock cannot go negative (current=${current}, delta=${delta})`,
      );
    }
    return next;
  }
}
