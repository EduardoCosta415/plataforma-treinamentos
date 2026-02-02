import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guards';
import { ExamsService } from './exams.service';
import { AdminCreateExamDto } from './dto/admin-create-exam.dto';
import { AdminUpdateExamDto } from './dto/admin-update-exam.dto';
import { AdminUpsertQuestionDto } from './dto/admin-upsert-question.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  // =========================
  // ✅ EXAMS
  // =========================

  @Get()
  list() {
    return this.exams.listExams();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.exams.getExam(id);
  }

  @Post()
  create(@Body() dto: AdminCreateExamDto) {
    return this.exams.createExam(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateExamDto) {
    return this.exams.updateExam(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exams.deleteExam(id);
  }

  // =========================
  // ✅ QUESTIONS
  // =========================

  @Post(':id/questions')
  addQuestion(
    @Param('id') examId: string,
    @Body() dto: AdminUpsertQuestionDto,
  ) {
    return this.exams.addQuestion(examId, dto);
  }

  @Patch('questions/:questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: AdminUpsertQuestionDto,
  ) {
    return this.exams.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string) {
    return this.exams.deleteQuestion(questionId);
  }
}
