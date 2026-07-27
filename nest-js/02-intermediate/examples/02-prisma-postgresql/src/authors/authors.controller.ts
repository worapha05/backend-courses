import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthorsService } from './authors.service';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  findAll() {
    return this.authorsService.findAll();
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.authorsService.create(body.name);
  }
}
