import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SUMMARY (cards)
   * - totalStudents
   * - activeCourses
   * - totalLessons
   * - completionRate (%)
   */
  async getSummary() {
    const [totalStudents, activeCourses, totalLessons] = await Promise.all([
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.lesson.count(),
    ]);

    // completionRate: % de aulas marcadas como concluídas no sistema (global)
    const [doneAgg, totalAgg] = await Promise.all([
      this.prisma.studentLessonProgress.count({ where: { completed: true } }),
      this.prisma.studentLessonProgress.count(),
    ]);

    const completionRate =
      totalAgg === 0 ? 0 : Math.round((doneAgg / totalAgg) * 100);

    return {
      totalStudents,
      activeCourses,
      totalLessons,
      completionRate,
    };
  }

  /**
   * STUDENTS PER MONTH
   * Retorna [{ month: "Jan", total: 120 }, ...] para "months" meses.
   *
   * Prisma não faz group by por mês de forma simples,
   * então usamos SQL (PostgreSQL) com date_trunc.
   */
  async getStudentsPerMonth(months: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{ month: Date; total: number }>
    >`
      SELECT
        date_trunc('month', s."createdAt") AS month,
        COUNT(*)::int AS total
      FROM "Student" s
      WHERE s."isActive" = true
        AND s."createdAt" >= (NOW() - (${months}::int || ' months')::interval)
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    return rows.map((r) => {
      const d = new Date(r.month);
      return {
        month: monthNames[d.getUTCMonth()],
        total: Number(r.total || 0),
      };
    });
  }

  /**
   * COURSE PROGRESS
   * Retorna algo tipo:
   * [{ courseTitle: "NR-10", completed: 120, total: 300 }, ...]
   *
   * total = (totalLessonsNoCurso * alunosMatriculadosNoCurso)
   * completed = total de StudentLessonProgress.completed=true dentro do curso
   *
   * Observação: isso dá uma taxa real do sistema e fica perfeita pro gráfico.
   */
  async getCourseProgress(limit: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        courseId: string;
        title: string;
        total: number;
        completed: number;
      }>
    >`
      WITH lessons_per_course AS (
        SELECT
          c.id AS "courseId",
          COUNT(l.id)::int AS "lessonsCount"
        FROM "Course" c
        LEFT JOIN "Module" m ON m."courseId" = c.id
        LEFT JOIN "Lesson" l ON l."moduleId" = m.id
        WHERE c."isActive" = true
        GROUP BY c.id
      ),
      enrolled_per_course AS (
        SELECT
          sc."courseId" AS "courseId",
          COUNT(DISTINCT sc."studentId")::int AS "enrolledCount"
        FROM "StudentCourseEnrollment" sc
        GROUP BY sc."courseId"
      ),
      completed_per_course AS (
        SELECT
          c.id AS "courseId",
          COUNT(p.id)::int AS "completedCount"
        FROM "Course" c
        LEFT JOIN "Module" m ON m."courseId" = c.id
        LEFT JOIN "Lesson" l ON l."moduleId" = m.id
        LEFT JOIN "StudentLessonProgress" p ON p."lessonId" = l.id AND p.completed = true
        WHERE c."isActive" = true
        GROUP BY c.id
      )
      SELECT
        c.id AS "courseId",
        c.title AS title,
        (COALESCE(lp."lessonsCount", 0) * COALESCE(ep."enrolledCount", 0))::int AS total,
        COALESCE(cp."completedCount", 0)::int AS completed
      FROM "Course" c
      LEFT JOIN lessons_per_course lp ON lp."courseId" = c.id
      LEFT JOIN enrolled_per_course ep ON ep."courseId" = c.id
      LEFT JOIN completed_per_course cp ON cp."courseId" = c.id
      WHERE c."isActive" = true
      ORDER BY completed DESC
      LIMIT ${limit}::int
    `;

    return rows.map((r) => ({
      courseTitle: r.title,
      total: Number(r.total || 0),
      completed: Number(r.completed || 0),
    }));
  }
}
