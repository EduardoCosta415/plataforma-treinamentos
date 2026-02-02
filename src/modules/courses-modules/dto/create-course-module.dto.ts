import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  courseId: string;

  @IsInt()
  order: number;
}
