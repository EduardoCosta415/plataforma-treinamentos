import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

type WatchDto = { lessonId: string; currentTime: number; duration: number };

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ✅ ALUNO LOGADO (me)
  // ============================================================

  async getMyCourseProgress(studentId: string, courseId: string) {
    return this.getCourseProgress(studentId, courseId);
  }

  /**
   * ✅ Heartbeat do vídeo
   * - salva watchedSeconds e lastPosition
   * - devolve allowedTime pra você usar no bloqueio de seek no front (opcional)
   *
   * OBS: aqui NÃO usamos finishedVideo/durationSeconds pra não quebrar o schema atual
   */
  async watchMyLesson(studentId: string, dto: WatchDto) {
    const { lessonId } = dto;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) throw new BadRequestException('Aula não encontrada');

    const currentTime = Math.max(0, Math.floor(dto.currentTime || 0));
    // duration ainda vem do front (pode usar depois), mas não persistimos no schema atual
    // const duration = Math.max(0, Math.floor(dto.duration || 0));

    await this.prisma.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        watchedSeconds: currentTime,
        lastPosition: currentTime,
      },
      create: {
        studentId,
        lessonId,
        watchedSeconds: currentTime,
        lastPosition: currentTime,
        completed: false,
      },
    });

    return {
      ok: true,
      allowedTime: currentTime,
      // finishedVideo: false, // (a gente volta nisso quando tiver campo no schema)
    };
  }

  /**
   * ✅ Conclusão do aluno logado
   * - aqui a validação "assistiu até o fim" pode ser:
   *   A) relaxada (modo teste) ou
   *   B) baseada em watchedSeconds (heurística)
   *
   * Por enquanto vamos manter LIBERADO para não travar testes.
   * Quando você quiser travar de verdade, a gente implementa a regra com finishedVideo.
   */
  async completeMyLesson(studentId: string, lessonId: string) {
    // ✅ MODO TESTE (SEM OBRIGAR VÍDEO ATÉ O FIM)
    return this.completeLesson(studentId, lessonId);
  }

  // ============================================================
  // ✅ ADMIN/MANAGER (studentId explícito)
  // ============================================================

  async getCourseProgress(studentId: string, courseId: string) {
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

    // regra: primeira aula desbloqueada, depois depende da anterior concluída
    let previousLessonDone = true;

    const modules = course.modules.map((m) => {
      const lessons = m.lessons.map((l) => {
        const p = map.get(l.id);

        const completed = !!p?.completed;
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

  async completeLesson(studentId: string, lessonId: string) {
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

    // ✅ valida sequência: não pode pular aula
    const previousLessons = allLessons.slice(0, idx);
    if (previousLessons.length > 0) {
      const prevIds = previousLessons.map((l) => l.id);

      const prevDone = await this.prisma.studentLessonProgress.findMany({
        where: { studentId, lessonId: { in: prevIds }, completed: true },
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

    // ✅ conclui a aula
    const result = await this.prisma.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: { completed: true, completedAt: new Date() },
      create: { studentId, lessonId, completed: true, completedAt: new Date() },
    });

    // ✅ NOVO: tenta fechar o curso (marcar enrollment como COMPLETED)
    await this.tryFinishCourse(studentId, courseId);

    return result;
  }

  // ============================================================
  // ✅ FECHAMENTO DO CURSO (NOVO)
  // - se completou todas as aulas do curso:
  //   atualiza StudentCourseEnrollment => status COMPLETED + completedAt
  // ============================================================

  private async tryFinishCourse(studentId: string, courseId: string) {
    // total de aulas do curso
    const totalLessons = await this.prisma.lesson.count({
      where: { module: { courseId } },
    });

    if (totalLessons === 0) return;

    // aulas concluídas do aluno nesse curso
    const completedLessons = await this.prisma.studentLessonProgress.count({
      where: {
        studentId,
        completed: true,
        lesson: { module: { courseId } },
      },
    });

    const finished = completedLessons >= totalLessons;
    if (!finished) return;

    // marca enrollment como concluído
    await this.prisma.studentCourseEnrollment.updateMany({
      where: { studentId, courseId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}
