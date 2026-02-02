import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, IsUrl } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'Título do curso', example: 'NR-33 Espaços Confinados' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    description: 'Descrição detalhada do curso',
    example: 'Este curso aborda os requisitos de segurança para trabalhos em espaços confinados.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL da imagem de capa do curso',
    example: 'https://example.com/images/nr33.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
