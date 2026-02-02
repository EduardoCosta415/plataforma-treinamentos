import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamsService } from './exams.service';

@UseGuards(AuthGuard('jwt'))
@Controller('exams')
export class StudentExamsController {
  constructor(private readonly exams: ExamsService) {}

  /**
   * POST /exams/:examId/attempts/start
   * - valida se prova existe/ativa
   * - valida se aluno pode fazer (tentativas e se já passou)
   * - cria tentativa (StudentExamAttempt)
   * - devolve prova SEM isCorrect
   */
  @Post(':examId/attempts/start')
  start(@Param('examId') examId: string, @Req() req: any) {
    const studentId = req.user.userId;
    return this.exams.startAttempt(studentId, examId);
  }

  /**
   * POST /exams/attempts/:attemptId/submit
   * - recebe answers
   * - calcula score
   * - grava answers
   * - marca passed/score
   */
  @Post('attempts/:attemptId/submit')
  submit(
    @Param('attemptId') attemptId: string,
    @Req() req: any,
    @Body() body: { answers: { questionId: string; optionId: string }[] },
  ) {
    const studentId = req.user.userId;
    return this.exams.submitAttempt(studentId, attemptId, body);
  }
}
