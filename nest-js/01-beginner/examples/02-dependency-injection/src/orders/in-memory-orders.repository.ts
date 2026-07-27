import { Injectable } from '@nestjs/common';
import { Order, OrdersRepository } from './orders.tokens';

/**
 * Concrete adapter — ใน production อาจเป็น PrismaOrdersRepository
 * Controller/Service พึ่ง abstraction ไม่ผูกกับ in-memory
 */
@Injectable()
export class InMemoryOrdersRepository implements OrdersRepository {
  private readonly store: Order[] = [
    { id: 'ord-1', customerId: 'cus-9', total: 4500, currency: 'THB' },
    { id: 'ord-2', customerId: 'cus-3', total: 990, currency: 'THB' },
  ];

  findAll(): Order[] {
    return [...this.store];
  }

  findById(id: string): Order | undefined {
    return this.store.find((o) => o.id === id);
  }

  save(order: Order): Order {
    this.store.push(order);
    return order;
  }
}
