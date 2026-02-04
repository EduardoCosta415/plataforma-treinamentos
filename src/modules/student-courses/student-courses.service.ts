import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class StudentCoursesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retorna a visão do aluno dentro de um curso
   * Essa função CENTRALIZA a regra de progressão
   */
  async getCourse(studentId: string, courseId: string) {
    // 1️⃣ Verifica se o aluno está matriculado
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Aluno não matriculado neste curso');
    }

    // 2️⃣ Busca curso com módulos e aulas ordenadas
    const course = await this.prisma.course.findUnique({
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

    // 3️⃣ Busca progresso do aluno
    const progress = await this.prisma.studentLessonProgress.findMany({
      where: { studentId },
    });

    const completedLessons = new Set(
      progress.filter(p => p.completed).map(p => p.lessonId),
    );

    let unlocked = true;
    let totalLessons = 0;
    let completedCount = 0;

    // 4️⃣ Aplica regra de bloqueio/desbloqueio
    const modules = course.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        totalLessons++;

        const isCompleted = completedLessons.has(lesson.id);

        if (isCompleted) completedCount++;

        const lessonUnlocked = unlocked;

        if (!isCompleted) {
          unlocked = false;
        }

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          status: isCompleted
            ? 'COMPLETED'
            : lessonUnlocked
            ? 'UNLOCKED'
            : 'BLOCKED',
        };
      }),
    }));

    const progressPercent =
      totalLessons === 0
        ? 0
        : Math.round((completedCount / totalLessons) * 100);

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      progressPercent,
      modules,
    };
  }
}
