import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(3)
  fullName: string;

  @IsEmail()
  email: string;

  /**
   * Por enquanto opcional
   * Empresa entra forte depois (via importação)
   */
  @IsOptional()
  @IsString()
  companyId?: string;

  /**
   * Curso inicial opcional
   */
  @IsOptional()
  @IsString()
  courseId?: string;
}
