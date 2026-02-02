import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';

@Injectable()
export class CourseModulesService {
  constructor(private prisma: PrismaService) {}

  list(courseId: string) {
    return this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  create(dto: CreateCourseModuleDto) {
    return this.prisma.module.create({
      data: {
        title: dto.title,
        courseId: dto.courseId,
        order: dto.order,
      },
    });
  }
}
