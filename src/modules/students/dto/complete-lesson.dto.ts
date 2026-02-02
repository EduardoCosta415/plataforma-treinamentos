import { IsString } from 'class-validator';

export class CompleteLessonDto {
  @IsString()
  lessonId: string;
}