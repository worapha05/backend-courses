import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Post(':loanId/return')
  return(@Param('loanId', ParseCuidPipe) loanId: string) {
    return this.loansService.returnLoan(loanId);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.loansService.findAll(status);
  }
}
