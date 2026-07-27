import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  author!: string;

  @IsInt()
  @Min(1)
  pages!: number;

  @IsOptional()
  @IsString()
  isbn?: string;
}

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  author?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number;
}

export class ListBooksQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
