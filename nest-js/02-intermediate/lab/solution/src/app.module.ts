import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MembersModule } from './members/members.module';
import { TitlesModule } from './titles/titles.module';
import { LoansModule } from './loans/loans.module';

@Module({
  imports: [PrismaModule, MembersModule, TitlesModule, LoansModule],
})
export class AppModule {}
