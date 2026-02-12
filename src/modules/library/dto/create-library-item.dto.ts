import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateLibraryItemDto {
  @ApiProperty({ example: 'cuid-do-course' })
  @IsString()
  courseId!: string;

  @ApiPropertyOptional({ example: 'Apostila NR44' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Material de apoio do treinamento' })
  @IsOptional()
  @IsString()
  description?: string;
}
