import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  // ============================================================
  // ✅ ALUNO LOGADO (me)
  // ============================================================

  /**
   * GET /progress/me/course/:courseId
   * Retorna árvore do curso + locked/completed por aula (do aluno logado)
   */
  @Get('me/course/:courseId')
  myCourse(
    @CurrentUser('sub') studentId: string,
    @Req() req: any,
    @Param('courseId') courseId: string,
  ) {
    console.log(`User : ${req.user}`);

    return this.progress.getMyCourseProgress(studentId, courseId);
  }

  /**
   * POST /progress/me/watch
   * Heartbeat do player (salva watchedSeconds/lastPosition)
   */
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
  // ============================================================
  // ✅ ADMIN/MANAGER (studentId explícito) - opcional manter
  // ============================================================

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
