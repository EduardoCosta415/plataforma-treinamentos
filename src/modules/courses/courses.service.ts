import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos os cursos ativos
   * Usado no painel administrativo
   */
  list() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista mínima de cursos (id + title)
   * Usado em selects (ex: provas)
   */
  listMin() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Cria um novo curso
   */
  create(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
      },
    });
  }

  /**
   * Atualiza dados do curso
   */
  update(courseId: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        imageUrl: dto.imageUrl ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  /**
   * Desativa curso (soft delete)
   */
  deactivate(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Retorna a árvore do curso
   * Curso → Módulos → Aulas
   */
  getTree(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }
}
