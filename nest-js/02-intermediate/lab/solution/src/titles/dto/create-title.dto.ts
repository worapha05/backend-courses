import { IsString, IsInt, Min, MinLength, Matches } from 'class-validator';

export class CreateTitleDto {
  @IsString()
  @Matches(/^\d{13}$/)
  isbn: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(1)
  copies: number;
}
