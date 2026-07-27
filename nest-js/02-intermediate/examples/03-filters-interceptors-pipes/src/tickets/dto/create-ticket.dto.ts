import { IsString, MinLength, IsIn } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  subject: string;

  @IsIn(['low', 'medium', 'high'])
  priority: string;
}
