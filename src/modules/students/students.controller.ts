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
  console.log('REQ.USER >>>', req.user);
  console.log('STUDENT ID USADO >>>', req.user.sub);
  return this.students.getStudentCourses(req.user.sub);
}

  /**
   * ✅ GET /students/me/exams
   * Lista provas do aluno (liberadas/bloqueadas) com base no progresso do curso
   */
  @Get('me/exams')
  myExams(@Req() req: any) {
   return this.students.getStudentExams(req.user.sub);
  }

  /**
   * ✅ GET /students/me/certificates
   * Lista certificados do aluno (liberados/bloqueados) por curso
   */
  @Get('me/certificates')
  myCertificates(@Req() req: any) {
    return this.students.getStudentCertificates(req.user.sub);
  }

  /**
   * ✅ GET /students/me/certificates/:courseId
   * Detalhe do certificado por curso (se existir)
   */
  @Get('me/certificates/:courseId')
  myCertificateByCourse(@Req() req: any, @Param('courseId') courseId: string) {
    return this.students.getMyCertificateByCourse(req.user.sub, courseId);
  }

  // admin/uso interno
  @Get(':id/courses')
  getStudentCourses(@Param('id') id: string) {
    return this.students.getStudentCourses(id);
  }

  // Biblioteca
  @Get('me/library')
myLibrary(@Req() req: any) {
  return this.students.getStudentLibrary(req.user.sub);
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
