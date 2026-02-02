import { IsString } from 'class-validator';

export class MeAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  optionId: string;
}
