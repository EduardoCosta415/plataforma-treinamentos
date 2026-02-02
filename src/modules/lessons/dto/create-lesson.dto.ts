import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  moduleId: string;

  @IsInt()
  order: number;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}
