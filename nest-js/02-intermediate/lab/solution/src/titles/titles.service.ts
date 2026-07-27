import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TitlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { isbn: string; name: string; copies: number }) {
    try {
      return await this.prisma.title.create({
        data: { ...dto, availableCopies: dto.copies },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('ISBN already exists');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.title.findMany();
  }
}
