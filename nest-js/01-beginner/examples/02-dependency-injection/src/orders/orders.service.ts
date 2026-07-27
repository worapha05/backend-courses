import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY, Order, OrdersRepository } from './orders.tokens';
import { PricingService } from './pricing.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepo: OrdersRepository,
    private readonly pricingService: PricingService,
  ) {}

  findAll(): Order[] {
    return this.ordersRepo.findAll();
  }

  create(customerId: string, subtotal: number): Order {
    const total = this.pricingService.applyVat(subtotal);
    return this.ordersRepo.save({
      id: `ord-${Date.now()}`,
      customerId,
      total,
      currency: 'THB',
    });
  }
}
