import { IsInt, IsString, Min } from 'class-validator';

export class UpdateVideoProgressDto {
  @IsString()
  studentId: string;

  @IsString()
  lessonId: string;

  @IsInt()
  @Min(0)
  watchedSeconds: number; // quanto o aluno assistiu desde a última vez (delta)

  @IsInt()
  @Min(0)
  lastPosition: number; // posição atual do player em segundos
}
