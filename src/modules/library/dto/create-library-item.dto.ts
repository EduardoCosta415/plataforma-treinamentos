import { IsOptional, IsString } from 'class-validator';

export class CreateLibraryItemDto {
  @IsString()
  courseId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
