import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollmentsService } from './enrollments.service';
import { EnrollDto } from './dto/enroll.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  /**
   * POST /enrollments
   * Matricula aluno em curso (idempotente)
   */
  @Post()
  enroll(@Body() dto: EnrollDto) {
    return this.enrollments.enroll(dto.studentId, dto.courseId);
  }

  /**
   * DELETE /enrollments
   * Remove matrícula do aluno no curso
   */
  @Delete()
  remove(@Body() dto: EnrollDto) {
    return this.enrollments.remove(dto.studentId, dto.courseId);
  }
}
