import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamsService } from './exams.service';
import { StudentSubmitExamDto } from './dto/student-submit-exam.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('exams')
export class ExamsStudentController {
  constructor(private readonly exams: ExamsService) {}

  // ✅ (opcional) buscar prova (sem gabarito)
  @Get(':id')
  async getExam(@Param('id') examId: string, @Req() req: any) {
    if (req.user.role !== 'STUDENT') throw new ForbiddenException();
    return this.exams.getStudentExam(examId, req.user.userId);
  }

  // ✅ iniciar tentativa (cria attempt e devolve perguntas)
  @Post(':id/start')
  async start(@Param('id') examId: string, @Req() req: any) {
    if (req.user.role !== 'STUDENT') throw new ForbiddenException();
    return this.exams.startStudentAttempt(examId, req.user.userId);
  }

  // ✅ enviar respostas e calcular nota
  @Post('attempts/:attemptId/submit')
  async submit(
    @Param('attemptId') attemptId: string,
    @Body() dto: StudentSubmitExamDto,
    @Req() req: any,
  ) {
    if (req.user.role !== 'STUDENT') throw new ForbiddenException();
    return this.exams.submitStudentAttempt(attemptId, req.user.userId, dto);
  }
}
