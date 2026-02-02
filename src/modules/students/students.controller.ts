import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list() {
    return this.students.list();
  }

  /**
   * ✅ GET /students/me/courses
   * Cursos do aluno logado + progresso + info de prova (se existir)
   */
  @Get('me/courses')
  myCourses(@Req() req: any) {
    return this.students.getStudentCourses(req.user.userId);
  }

  /**
   * ✅ GET /students/me/exams
   * Lista provas do aluno (liberadas/bloqueadas) com base no progresso do curso
   */
  @Get('me/exams')
  myExams(@Req() req: any) {
    return this.students.getStudentExams(req.user.userId);
  }

  /**
   * ✅ GET /students/me/certificates
   * Lista certificados do aluno (liberados/bloqueados) por curso
   */
  @Get('me/certificates')
  myCertificates(@Req() req: any) {
    return this.students.getStudentCertificates(req.user.userId);
  }

  /**
   * ✅ GET /students/me/certificates/:courseId
   * Detalhe do certificado por curso (se existir)
   */
  @Get('me/certificates/:courseId')
  myCertificateByCourse(@Req() req: any, @Param('courseId') courseId: string) {
    return this.students.getMyCertificateByCourse(req.user.userId, courseId);
  }

  // admin/uso interno
  @Get(':id/courses')
  getStudentCourses(@Param('id') id: string) {
    return this.students.getStudentCourses(id);
  }

  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.students.deactivate(id);
  }
}
