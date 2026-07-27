import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockPolicyService } from './stock-policy.service';
import { InMemoryInventoryRepository } from './in-memory-inventory.repository';
import { INVENTORY_REPOSITORY } from './inventory.tokens';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    StockPolicyService,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: InMemoryInventoryRepository,
    },
  ],
})
export class InventoryModule {}
