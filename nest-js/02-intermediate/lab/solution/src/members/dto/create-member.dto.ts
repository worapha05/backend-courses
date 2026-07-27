import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;
}
