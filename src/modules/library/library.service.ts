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

  // ✅ Admin guard simples (ajuste se você quiser restringir só ADMIN)
  private ensureAdminRole(role?: string) {
    if (!role || !['ADMIN', 'MANAGER', 'OPERATOR'].includes(role)) {
      throw new ForbiddenException('Acesso negado');
    }
  }

  /**
   * ✅ ADMIN: cria item de biblioteca (PDF) para um curso
   * Controller: POST /admin/library (multipart file)
   */
  async create(dto: CreateLibraryItemDto, file: Express.Multer.File) {
    // 🔒 se quiser validar role aqui, você pode passar req.user.role no controller.
    // Como você não está passando req no controller, deixei sem check aqui.

    if (!dto?.courseId) {
      throw new BadRequestException('courseId é obrigatório');
    }

    if (!file) {
      throw new BadRequestException('Arquivo PDF é obrigatório');
    }

    // valida se o curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    // monta paths
    // libraryMulterOptions deve salvar em uploads/library e o filename deve ser único
    const fileKey = `library/${file.filename}`;
    const fileUrl = `/uploads/${fileKey}`; // ✅ URL relativa (front abre com baseUrl)

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

  /**
   * ✅ ADMIN: lista PDFs por curso
   * Controller: GET /admin/library/course/:courseId
   */
  async listByCourse(courseId: string) {
    if (!courseId) {
      throw new BadRequestException('courseId é obrigatório');
    }

    // opcional: validar curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    const items = await this.prisma.libraryItem.findMany({
      where: {
        courseId,
        isActive: true,
      },
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

    return {
      courseId: course.id,
      courseTitle: course.title,
      items,
    };
  }

  /**
   * ✅ ADMIN: remove (soft delete)
   * Controller: DELETE /admin/library/:id
   */
  async remove(id: string) {
    if (!id) throw new BadRequestException('id é obrigatório');

    const existing = await this.prisma.libraryItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException('Item não encontrado');

    // soft delete: não apaga arquivo do disco
    return this.prisma.libraryItem.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
