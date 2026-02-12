import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateCourseDto {
  @ApiProperty({
    description: 'Novo título do curso',
    example: 'NR-35 Trabalho em Altura',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiProperty({
    description: 'Nova descrição do curso',
    example: 'Curso sobre segurança no trabalho em altura.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Nova URL da imagem de capa do curso',
    example: 'https://example.com/images/nr35.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({
    description: 'Define se o curso está ativo ou inativo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  directorName: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  engineerName: string;
}
