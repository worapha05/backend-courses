import { Injectable, NotFoundException } from '@nestjs/common';

export interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
}

@Injectable()
export class ProductsService {
  private products: Product[] = [
    { id: '1', name: 'Laptop', price: 45000, sku: 'LAP-001' },
    { id: '2', name: 'Mouse', price: 900, sku: 'MOU-001' },
  ];

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(data: Omit<Product, 'id'>): Product {
    const product: Product = { id: String(this.products.length + 1), ...data };
    this.products.push(product);
    return product;
  }

  update(id: string, data: Partial<Omit<Product, 'id'>>): Product {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Product ${id} not found`);
    this.products[index] = { ...this.products[index], ...data };
    return this.products[index];
  }

  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Product ${id} not found`);
    this.products.splice(index, 1);
  }
}
