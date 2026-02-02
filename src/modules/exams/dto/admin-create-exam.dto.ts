import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminCreateExamDto {
  @IsString()
  courseId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  passScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
