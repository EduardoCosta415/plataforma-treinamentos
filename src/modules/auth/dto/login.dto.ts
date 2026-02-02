import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email do administrador', example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do administrador', example: 'Admin123!' })
  @IsString()
  @MinLength(3)
  password: string;
}

