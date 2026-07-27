import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.author.findMany({
      include: { books: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(name: string) {
    return this.prisma.author.create({ data: { name } });
  }
}
