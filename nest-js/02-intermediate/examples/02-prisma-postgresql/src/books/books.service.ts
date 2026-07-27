import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.book.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: { title: string; pages: number; authorId: string }) {
    const author = await this.prisma.author.findUnique({
      where: { id: input.authorId },
    });
    if (!author) {
      throw new NotFoundException(`Author ${input.authorId} not found`);
    }
    return this.prisma.book.create({ data: input });
  }
}
