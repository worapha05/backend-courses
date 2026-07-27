import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseTicketCodePipe implements PipeTransform {
  transform(value: string): string {
    const code = value.trim().toUpperCase();
    if (!/^TK-\d{3,}$/.test(code)) {
      throw new BadRequestException('Ticket code must match TK-XXX (e.g. TK-100)');
    }
    return code;
  }
}
