import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('modules')
export class CourseModulesController {
  constructor(private service: CourseModulesService) {}

  // GET /modules?courseId=xxx
  @Get()
  list(@Query('courseId') courseId: string) {
    return this.service.list(courseId);
  }

  // POST /modules
  @Post()
  create(@Body() dto: CreateCourseModuleDto) {
    return this.service.create(dto);
  }
}
