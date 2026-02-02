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
  getCourse(@Req() req, @Param('courseId') courseId: string) {
    return this.service.getCourse(req.user.id, courseId);
  }
}
