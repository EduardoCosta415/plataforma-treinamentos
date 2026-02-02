import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProgressService } from './progress.service';
import { IsNumber, IsString } from 'class-validator';

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
  myCourse(@Req() req: any, @Param('courseId') courseId: string) {
    return this.progress.getMyCourseProgress(req.user.userId, courseId);
  }

  /**
   * POST /progress/me/watch
   * Heartbeat do player (salva watchedSeconds/lastPosition)
   */
  @Post('me/watch')
  watch(@Req() req: any, @Body() dto: WatchLessonDto) {
    return this.progress.watchMyLesson(req.user.userId, dto);
  }

  /**
   * POST /progress/me/complete
   * Conclui aula do aluno logado (e tenta fechar o curso ao final)
   */
  @Post('me/complete')
  completeMe(@Req() req: any, @Body() dto: CompleteLessonDto) {
    return this.progress.completeMyLesson(req.user.userId, dto.lessonId);
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
