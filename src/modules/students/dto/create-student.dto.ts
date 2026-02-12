import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'maria@gmail.com' })
  @IsEmail()
  email: string;

  // ✅ CPF obrigatório (admin/manual)
  // Observação: mesmo com IsString, o front pode mandar number.
  // A normalização/validação real está no service.
  @ApiProperty({
    example: '123.456.789-09',
    description: 'CPF obrigatório (será normalizado e validado no backend)',
  })
  @IsString()
  cpf: string;

  // ✅ empresa opcional: admin pode enviar companyId direto
  @ApiPropertyOptional({
    example: 'cuid-da-company',
    description:
      'Opcional. Se não vier, usa DEFAULT_COMPANY_ID (se válido) ou fallback "Sem empresa".',
  })
  @IsOptional()
  @IsString()
  companyId?: string | null;

  // ✅ ou admin pode mandar nome da empresa
  @ApiPropertyOptional({
    example: 'LAENA',
    description: 'Opcional. Se vier, busca Company por nome (case-insensitive).',
  })
  @IsOptional()
  @IsString()
  companyName?: string | null;

  // matrícula opcional
  @ApiPropertyOptional({ example: 'cuid-do-course' })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  // opcional: senha (senão 123456)
  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string | null;
}
