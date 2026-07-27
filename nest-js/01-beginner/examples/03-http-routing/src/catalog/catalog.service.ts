import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItem, CatalogSearchQuery, SortOrder } from './catalog.types';

@Injectable()
export class CatalogService {
  private readonly items: CatalogItem[] = [
    {
      id: '1',
      sku: 'KB-001',
      name: 'Mechanical Keyboard',
      category: 'peripherals',
      price: 3200,
      inStock: true,
    },
    {
      id: '2',
      sku: 'MS-014',
      name: 'Silent Mouse',
      category: 'peripherals',
      price: 790,
      inStock: true,
    },
    {
      id: '3',
      sku: 'MN-220',
      name: '27-inch Monitor',
      category: 'displays',
      price: 8900,
      inStock: false,
    },
    {
      id: '4',
      sku: 'CH-090',
      name: 'Ergonomic Chair',
      category: 'furniture',
      price: 12500,
      inStock: true,
    },
  ];

  search(query: CatalogSearchQuery) {
    let result = [...this.items];

    if (query.q) {
      const q = query.q.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
      );
    }
    if (query.category) {
      result = result.filter((i) => i.category === query.category);
    }
    if (query.minPrice !== undefined) {
      result = result.filter((i) => i.price >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      result = result.filter((i) => i.price <= query.maxPrice!);
    }
    if (query.inStock !== undefined) {
      result = result.filter((i) => i.inStock === query.inStock);
    }

    const sort: SortOrder = query.sort ?? 'asc';
    result.sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price));

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const start = (page - 1) * limit;
    const data = result.slice(start, start + limit);

    return {
      meta: { page, limit, total: result.length },
      data,
    };
  }

  findOne(id: string): CatalogItem {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  create(input: Omit<CatalogItem, 'id'>): CatalogItem {
    const item: CatalogItem = { ...input, id: String(Date.now()) };
    this.items.push(item);
    return item;
  }
}
