import { IsOptional, IsString } from 'class-validator';

export class ImportUsersDto {
  /**
   * Se você quiser permitir importar já matriculando no curso,
   * pode passar um courseId fixo por query/body.
   * (opcional – no CSV também pode ter "courseTitle")
   */
  @IsOptional()
  @IsString()
  courseId?: string;
}
