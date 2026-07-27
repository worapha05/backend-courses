import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingService } from './pricing.service';
import { InMemoryOrdersRepository } from './in-memory-orders.repository';
import { ORDERS_REPOSITORY } from './orders.tokens';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PricingService,
    {
      provide: ORDERS_REPOSITORY,
      useClass: InMemoryOrdersRepository,
    },
  ],
})
export class OrdersModule {}
