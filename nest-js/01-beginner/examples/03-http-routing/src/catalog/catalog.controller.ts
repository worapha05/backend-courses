import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogItem, SortOrder } from './catalog.types';

@Controller('catalog/items')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * ตัวอย่าง custom query strings:
   * GET /catalog/items?q=key&category=peripherals&minPrice=500&inStock=true&sort=desc&page=1&limit=2
   */
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sort') sort?: SortOrder,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.search({
      q,
      category,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      inStock: inStock === undefined ? undefined : inStock === 'true' || inStock === '1',
      sort: sort === 'desc' ? 'desc' : 'asc',
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      sku: string;
      name: string;
      category: string;
      price: number;
      inStock: boolean;
    },
  ): CatalogItem {
    return this.catalogService.create(body);
  }
}
