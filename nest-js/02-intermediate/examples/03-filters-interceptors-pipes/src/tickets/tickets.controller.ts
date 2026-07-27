import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { TicketsService, Ticket } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ParseTicketCodePipe } from '../common/pipes/parse-ticket-code.pipe';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(): Ticket[] {
    return this.ticketsService.findAll();
  }

  @Get(':code')
  findOne(@Param('code', ParseTicketCodePipe) code: string): Ticket {
    return this.ticketsService.findOne(code);
  }

  @Post()
  create(@Body() dto: CreateTicketDto): Ticket {
    return this.ticketsService.create(dto);
  }
}
