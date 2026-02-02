import { IsString } from 'class-validator';

export class MeStartAttemptDto {
  @IsString()
  courseId: string;
}
