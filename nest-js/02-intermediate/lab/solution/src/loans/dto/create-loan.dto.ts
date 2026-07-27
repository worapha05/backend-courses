import { IsString } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  memberId: string;

  @IsString()
  titleId: string;
}
