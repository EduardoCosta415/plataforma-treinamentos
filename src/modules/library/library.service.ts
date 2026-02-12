import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // ✅ ADMIN
  // =========================================================

  async listCoursesMin() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });
  }

  async create(dto: CreateLibraryItemDto, file: Express.Multer.File) {
    if (!dto?.courseId) {
      throw new BadRequestException('courseId é obrigatório');
    }

    if (!file) {
      throw new BadRequestException('Arquivo PDF é obrigatório');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    const fileKey = `library/${file.filename}`;
    const fileUrl = `/uploads/${fileKey}`;

    const title =
      (dto.title || file.originalname || 'Material PDF').toString().trim();

    return this.prisma.libraryItem.create({
      data: {
        courseId: dto.courseId,
        title,
        description: dto.description ? String(dto.description).trim() : null,

        fileUrl,
        fileKey,

        originalName: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        sizeBytes: file.size,

        isActive: true,
      },
    });
  }

  async listByCourse(courseId: string) {
    if (!courseId) throw new BadRequestException('courseId é obrigatório');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) throw new NotFoundException('Curso não encontrado');

    const items = await this.prisma.libraryItem.findMany({
      where: { courseId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        fileUrl: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return { courseId: course.id, courseTitle: course.title, items };
  }

  async remove(id: string) {
    if (!id) throw new BadRequestException('id é obrigatório');

    const existing = await this.prisma.libraryItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException('Item não encontrado');

    return this.prisma.libraryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =========================================================
  // ✅ STUDENT (ALUNO LOGADO)
  // =========================================================

  async listMyLibrary(studentId: string) {
    if (!studentId) throw new BadRequestException('Aluno inválido');

    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.courseId);

    const items = await this.prisma.libraryItem.findMany({
      where: { isActive: true, courseId: { in: courseIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        fileUrl: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    const byCourse = new Map<string, any[]>();
    for (const it of items) {
      const arr = byCourse.get(it.courseId) || [];
      arr.push(it);
      byCourse.set(it.courseId, arr);
    }

    return enrollments.map((e) => ({
      courseId: e.course.id,
      courseTitle: e.course.title,
      items: byCourse.get(e.course.id) || [],
    }));
  }

  async listMyLibraryByCourse(studentId: string, courseId: string) {
    if (!studentId) throw new BadRequestException('Aluno inválido');
    if (!courseId) throw new BadRequestException('courseId é obrigatório');

    const enrollment = await this.prisma.studentCourseEnrollment.findFirst({
      where: { studentId, courseId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('Você não tem acesso a este curso');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) throw new NotFoundException('Curso não encontrado');

    const items = await this.prisma.libraryItem.findMany({
      where: { isActive: true, courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        description: true,
        fileUrl: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return { courseId: course.id, courseTitle: course.title, items };
  }
}
