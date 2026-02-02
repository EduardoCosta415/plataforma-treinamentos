import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminUpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  passScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
