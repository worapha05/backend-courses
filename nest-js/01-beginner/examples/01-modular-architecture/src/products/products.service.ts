import { Injectable, NotFoundException } from '@nestjs/common';

export interface Product {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class ProductsService {
  private readonly products: Product[] = [
    { id: '1', name: 'Mechanical Keyboard', price: 3200 },
    { id: '2', name: 'USB-C Hub', price: 890 },
    { id: '3', name: 'Monitor Arm', price: 1590 },
  ];

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }
}
