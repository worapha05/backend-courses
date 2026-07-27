import { Controller, Get, Post, Body } from '@nestjs/common';
import { TitlesService } from './titles.service';
import { CreateTitleDto } from './dto/create-title.dto';

@Controller('titles')
export class TitlesController {
  constructor(private readonly titlesService: TitlesService) {}

  @Post()
  create(@Body() dto: CreateTitleDto) {
    return this.titlesService.create(dto);
  }

  @Get()
  findAll() {
    return this.titlesService.findAll();
  }
}
