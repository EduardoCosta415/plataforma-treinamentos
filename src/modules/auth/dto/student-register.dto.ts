import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class StudentRegisterDto {
  @ApiProperty({ example: 'Eduardo Silva' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'eduardo@gmail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '123456', description: 'Opcional. Se não vier, usa 123456.' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: '123.456.789-09', description: 'CPF obrigatório para certificado' })
  @IsString()
  cpf: string;

  @ApiPropertyOptional({ example: 'LAENA', description: 'Opcional. Se vier, tenta achar Company pelo nome.' })
  @IsOptional()
  @IsString()
  companyName?: string | null;
}
