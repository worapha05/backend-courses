/** Injection token สำหรับ repository abstraction */
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface Order {
  id: string;
  customerId: string;
  total: number;
  currency: string;
}

export interface OrdersRepository {
  findAll(): Order[];
  findById(id: string): Order | undefined;
  save(order: Order): Order;
}
