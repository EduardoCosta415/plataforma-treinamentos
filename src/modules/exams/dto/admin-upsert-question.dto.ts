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

export class AdminQuestionOptionDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class AdminUpsertQuestionDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => AdminQuestionOptionDto)
  options: AdminQuestionOptionDto[];
}
