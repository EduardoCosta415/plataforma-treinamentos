import { Module } from '@nestjs/common';
import { StudentCoursesController } from './student-courses.controller';
import { StudentCoursesService } from './student-courses.service';

@Module({
  controllers: [StudentCoursesController],
  providers: [StudentCoursesService],
})
export class StudentCoursesModule {}
