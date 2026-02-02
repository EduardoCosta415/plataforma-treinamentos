import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('lessons')
export class LessonsController {
  constructor(private service: LessonsService) {}

  // GET /lessons?moduleId=xxx
  @Get()
  list(@Query('moduleId') moduleId: string) {
    return this.service.list(moduleId);
  }

  // POST /lessons
  @Post()
  create(@Body() dto: CreateLessonDto) {
    return this.service.create(dto);
  }
}
