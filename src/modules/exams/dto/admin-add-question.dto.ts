import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ExamOptionInputDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class AdminAddQuestionDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ExamOptionInputDto)
  options: ExamOptionInputDto[];
}
