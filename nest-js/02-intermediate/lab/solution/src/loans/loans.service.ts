import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { memberId: string; titleId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const title = await tx.title.findUnique({ where: { id: dto.titleId } });
      if (!title) throw new NotFoundException('Title not found');
      if (title.availableCopies <= 0) throw new BadRequestException('No available copies');

      await tx.title.update({
        where: { id: dto.titleId },
        data: { availableCopies: { decrement: 1 } },
      });

      return tx.loan.create({
        data: {
          memberId: dto.memberId,
          titleId: dto.titleId,
          status: 'active',
        },
        include: { member: true, title: true },
      });
    });
  }

  async returnLoan(loanId: string) {
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id: loanId } });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status === 'returned') throw new BadRequestException('Loan already returned');

      await tx.loan.update({
        where: { id: loanId },
        data: { status: 'returned', returnedAt: new Date() },
      });

      await tx.title.update({
        where: { id: loan.titleId },
        data: { availableCopies: { increment: 1 } },
      });

      return { ...loan, status: 'returned' };
    });
  }

  async findAll(status?: string) {
    const where = status ? { status } : {};
    return this.prisma.loan.findMany({ where, include: { member: true, title: true } });
  }
}
