import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { CatalogService, Product } from './catalog.service';
import { Roles, Public } from '../auth/roles.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get()
  findAll(): Product[] {
    return this.catalogService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string): Product {
    return this.catalogService.findOne(id);
  }

  @Roles('admin', 'editor')
  @Post()
  create(@Body() data: Omit<Product, 'id'>): Product {
    return this.catalogService.create(data);
  }

  @Roles('admin', 'editor')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Omit<Product, 'id'>>): Product {
    return this.catalogService.update(id, data);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string): void {
    this.catalogService.remove(id);
  }
}
