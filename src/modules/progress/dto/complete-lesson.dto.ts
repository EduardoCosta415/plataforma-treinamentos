import { IsString } from 'class-validator';

export class CompleteLessonDto {
  @IsString()
  studentId: string; // por enquanto vem do front (depois vira do JWT do aluno)

  @IsString()
  lessonId: string;
}
