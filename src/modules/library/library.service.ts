import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLibraryItemDto, file: Express.Multer.File) {
    // valida curso existe
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Curso não encontrado');

    // “portável” (quando migrar pra S3/Blob, fileKey vira key do storage)
    const fileKey = file.filename;
    const fileUrl = `/uploads/library/${file.filename}`;

    return this.prisma.libraryItem.create({
      data: {
        courseId: dto.courseId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        fileKey,
        fileUrl,
        isActive: true,
      },
    });
  }

  async listByCourse(courseId: string) {
    return this.prisma.libraryItem.findMany({
      where: { courseId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id, isActive: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async remove(id: string) {
    // remove lógico (mais seguro)
    return this.prisma.libraryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
