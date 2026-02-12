import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProgressService } from './progress.service';
import { IsNumber, IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class WatchLessonDto {
  @IsString()
  lessonId!: string;

  @IsNumber()
  currentTime!: number;

  @IsNumber()
  duration!: number;
}

class CompleteLessonDto {
  @IsString()
  lessonId!: string;
}

class CompleteLessonAdminDto {
  @IsString()
  studentId!: string;

  @IsString()
  lessonId!: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('me/course/:courseId')
  myCourse(
    @CurrentUser('sub') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.progress.getMyCourseProgress(studentId, courseId);
  }

  @Post('me/watch')
  watch(@CurrentUser('sub') studentId: string, @Body() dto: WatchLessonDto) {
    return this.progress.watchMyLesson(studentId, dto);
  }

  @Post('me/complete')
  completeMe(
    @CurrentUser('sub') studentId: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.progress.completeMyLesson(studentId, dto.lessonId);
  }

  // (Opcional - Admin)
  @Get(':studentId/course/:courseId')
  getCourseProgress(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.progress.getCourseProgress(studentId, courseId);
  }

  @Post('complete')
  complete(@Body() dto: CompleteLessonAdminDto) {
    return this.progress.completeLesson(dto.studentId, dto.lessonId);
  }
}
