import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nome da empresa', example: 'Minha Empresa LTDA' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'CNPJ da empresa', example: '00.000.000/0001-00', required: false })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty({
    description: 'Email de contato da empresa',
    example: 'contato@minhaempresa.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Telefone de contato da empresa', example: '(11) 99999-9999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
