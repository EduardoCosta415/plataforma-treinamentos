import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

type WatchDto = { lessonId: string; currentTime: number; duration: number };

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ✅ ALUNO LOGADO (me)
  // ============================================================

  async getMyCourseProgress(studentId: string, courseId: string) {
    if (!studentId) throw new BadRequestException('ID do aluno inválido');
    return this.getCourseProgress(studentId, courseId);
  }

  async watchMyLesson(studentId: string, dto: WatchDto) {
    const { lessonId } = dto;

    if (!studentId) throw new BadRequestException('ID do aluno não informado');
    if (!lessonId) throw new BadRequestException('ID da aula não informado');

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) throw new BadRequestException('Aula não encontrada');

    const currentTime = Math.max(0, Math.floor(dto.currentTime || 0));

    // Upsert seguro com validação de inputs
    await this.prisma.studentLessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
      update: {
        watchedSeconds: currentTime,
        lastPosition: currentTime,
      },
      create: {
        watchedSeconds: currentTime,
        lastPosition: currentTime,
        completed: false,
        student: { connect: { id: studentId } },
        lesson: { connect: { id: lessonId } },
      },
    });

    return {
      ok: true,
      allowedTime: currentTime,
    };
  }

  async completeMyLesson(studentId: string, lessonId: string) {
    return this.completeLesson(studentId, lessonId);
  }

  // ============================================================
  // ✅ ADMIN/MANAGER (studentId explícito)
  // ============================================================

  async getCourseProgress(studentId: string, courseId: string) {
    if (!studentId) throw new BadRequestException('ID do aluno obrigatório');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!course) throw new BadRequestException('Curso não encontrado');

    const progress = await this.prisma.studentLessonProgress.findMany({
      where: { studentId },
      select: {
        lessonId: true,
        completed: true,
        watchedSeconds: true,
        lastPosition: true,
      },
    });

    const map = new Map(progress.map((p) => [p.lessonId, p]));

    let previousLessonDone = true;

    const modules = course.modules.map((m) => {
      const lessons = m.lessons.map((l) => {
        const p = map.get(l.id);
        const completed = !!p?.completed;
        // Primeira aula livre, as próximas dependem da anterior
        const locked = !previousLessonDone;
        previousLessonDone = completed;

        return {
          ...l,
          completed,
          locked,
          watchedSeconds: p?.watchedSeconds ?? 0,
          lastPosition: p?.lastPosition ?? 0,
        };
      });
      return { ...m, lessons };
    });

    return { ...course, modules };
  }

  /**
   * Método principal de conclusão
   * Agora blinda contra undefined/null studentId
   */
  async completeLesson(studentId: string, lessonId: string) {
    if (!studentId) {
      this.logger.error(
        `Tentativa de completar aula [${lessonId}] sem studentId!`,
      );
      throw new BadRequestException('Erro crítico: ID do aluno não fornecido.');
    }
    if (!lessonId) {
      throw new BadRequestException('ID da aula não fornecido.');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) throw new BadRequestException('Aula não encontrada');

    const courseId = lesson.module.courseId;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!course) throw new BadRequestException('Curso não encontrado');

    const allLessons = course.modules.flatMap((m) => m.lessons);
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) throw new BadRequestException('Aula não pertence ao curso');

    // ✅ Validação de Sequência (Não pode pular aulas)
    const previousLessons = allLessons.slice(0, idx);
    if (previousLessons.length > 0) {
      const prevIds = previousLessons.map((l) => l.id);

      const prevDone = await this.prisma.studentLessonProgress.findMany({
        where: {
          studentId, // Aqui studentId já está validado
          lessonId: { in: prevIds },
          completed: true,
        },
        select: { lessonId: true },
      });

      const doneSet = new Set(prevDone.map((p) => p.lessonId));
      const missing = prevIds.filter((id) => !doneSet.has(id));

      if (missing.length > 0) {
        throw new BadRequestException(
          'Você precisa concluir as aulas anteriores antes de avançar.',
        );
      }
    }

    // ✅ UPSERT SEGURO: studentId e lessonId garantidos
    const result = await this.prisma.studentLessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
      create: {
        completed: true,
        completedAt: new Date(),
        student: { connect: { id: studentId } },
        lesson: { connect: { id: lessonId } },
      },
    });

    // Tenta finalizar o curso (marcar enrollment)
    await this.tryFinishCourse(studentId, courseId);

    return result;
  }

  private async tryFinishCourse(studentId: string, courseId: string) {
    if (!studentId || !courseId) return;

    const totalLessons = await this.prisma.lesson.count({
      where: { module: { courseId } },
    });

    if (totalLessons === 0) return;

    const completedLessons = await this.prisma.studentLessonProgress.count({
      where: {
        studentId,
        completed: true,
        lesson: { module: { courseId } },
      },
    });

    const finished = completedLessons >= totalLessons;
    if (!finished) return;

    // Atualiza status da matrícula
    await this.prisma.studentCourseEnrollment.updateMany({
      where: { studentId, courseId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
