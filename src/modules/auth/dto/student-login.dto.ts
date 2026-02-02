import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class StudentLoginDto {
  @ApiProperty({ description: 'Email do estudante', example: 'aluno@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do estudante', example: 'Aluno123!' })
  @IsString()
  @MinLength(1)
  password: string;
}
