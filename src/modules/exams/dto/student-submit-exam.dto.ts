import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StudentAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  optionId!: string;
}

export class StudentSubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerDto)
  answers!: StudentAnswerDto[];
}
