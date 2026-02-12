import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list() {
    return this.students.list();
  }

  // ✅ GET /students/me/courses
  @Get('me/courses')
  myCourses(@Req() req: any) {
    return this.students.getStudentCourses(req.user.sub);
  }

  // ✅ GET /students/me/exams
  @Get('me/exams')
  myExams(@Req() req: any) {
    return this.students.getStudentExams(req.user.sub);
  }

  // ✅ GET /students/me/certificates
  @Get('me/certificates')
  myCertificates(@Req() req: any) {
    return this.students.getStudentCertificates(req.user.sub);
  }

  // ✅ GET /students/me/certificates/:courseId
  @Get('me/certificates/:courseId')
  myCertificateByCourse(@Req() req: any, @Param('courseId') courseId: string) {
    return this.students.getMyCertificateByCourse(req.user.sub, courseId);
  }

  //update 
  @Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
  return this.students.update(id, dto);
}

  // Biblioteca
  @Get('me/library')
  myLibrary(@Req() req: any) {
    return this.students.getStudentLibrary(req.user.sub);
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
