import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCuidPipe implements PipeTransform {
  transform(value: string): string {
    if (!value || value.trim().length < 10) {
      throw new BadRequestException('ID must be a valid cuid (at least 10 characters)');
    }
    return value.trim();
  }
}
