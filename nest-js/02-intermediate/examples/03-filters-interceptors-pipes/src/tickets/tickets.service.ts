import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';

export interface Ticket {
  code: string;
  subject: string;
  priority: string;
  status: string;
}

@Injectable()
export class TicketsService {
  private seq = 100;
  private tickets: Ticket[] = [
    { code: 'TK-100', subject: 'Cannot login to portal', priority: 'high', status: 'open' },
  ];

  findAll(): Ticket[] {
    return this.tickets;
  }

  findOne(code: string): Ticket {
    const ticket = this.tickets.find((t) => t.code === code);
    if (!ticket) throw new NotFoundException(`Ticket ${code} not found`);
    return ticket;
  }

  create(dto: CreateTicketDto): Ticket {
    this.seq += 1;
    const ticket: Ticket = {
      code: `TK-${this.seq}`,
      subject: dto.subject,
      priority: dto.priority,
      status: 'open',
    };
    this.tickets.push(ticket);
    return ticket;
  }
}
