import { Injectable } from '@nestjs/common';

/** Service อีกตัวที่ถูก inject เข้า OrdersService — แสดง constructor DI ซ้อนกัน */
@Injectable()
export class PricingService {
  private readonly vatRate = 0.07;

  applyVat(subtotal: number): number {
    return Math.round(subtotal * (1 + this.vatRate));
  }
}
