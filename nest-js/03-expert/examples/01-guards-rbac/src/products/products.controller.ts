import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ProductsService, Product } from './products.service';
import { Roles, Public } from '../auth/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(): Product[] {
    return this.productsService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string): Product {
    return this.productsService.findOne(id);
  }

  @Roles('admin', 'editor')
  @Post()
  create(@Body() data: Omit<Product, 'id'>): Product {
    return this.productsService.create(data);
  }

  @Roles('admin', 'editor')
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Omit<Product, 'id'>>): Product {
    return this.productsService.update(id, data);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string): void {
    this.productsService.remove(id);
  }
}
