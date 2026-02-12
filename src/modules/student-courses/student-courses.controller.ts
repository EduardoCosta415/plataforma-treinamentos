import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentCoursesService } from './student-courses.service';

@UseGuards(AuthGuard('jwt'))
@Controller('student/courses')
export class StudentCoursesController {
  constructor(private service: StudentCoursesService) {}

  /**
   * GET /student/courses/:courseId
   * Retorna a visão do aluno dentro do curso
   */
  @Get(':courseId')
  getCourse(@Req() req: any, @Param('courseId') courseId: string) {
    const studentId = req.user?.sub || req.user?.id; // ✅ garante compat
    return this.service.getCourse(studentId, courseId);
  }
}
