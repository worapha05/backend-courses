import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './inventory.tokens';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  findAll(
    @Query('q') q?: string,
    @Query('warehouse') warehouse?: string,
    @Query('minQty') minQty?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.inventoryService.search({
      q,
      warehouse,
      minQty: minQty !== undefined ? Number(minQty) : undefined,
      sort: sort === 'desc' ? 'desc' : 'asc',
    });
  }

  @Get('items/:sku')
  findOne(@Param('sku') sku: string) {
    return this.inventoryService.findBySku(sku);
  }

  @Post('items')
  create(@Body() body: InventoryItem) {
    return this.inventoryService.create(body);
  }

  @Patch('items/:sku/stock')
  adjustStock(@Param('sku') sku: string, @Body() body: { delta: number }) {
    return this.inventoryService.adjustStock(sku, body.delta);
  }

  @Get('low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.lowStock(threshold !== undefined ? Number(threshold) : 5);
  }
}
