import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  /* =========================
      HELPERS
  ========================= */

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private async getDefaultCompanyId(): Promise<string> {
    const DEFAULT_COMPANY_NAME = 'Sem empresa';

    let company = await this.prisma.company.findFirst({
      where: { name: DEFAULT_COMPANY_NAME },
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: { name: DEFAULT_COMPANY_NAME },
      });
    }

    return company.id;
  }

  private async ensureCompanyId(companyId?: string | null): Promise<string> {
    return companyId ? companyId : this.getDefaultCompanyId();
  }

  private async createTempPasswordHash(): Promise<string> {
    const tempPassword = '123456';
    return bcrypt.hash(tempPassword, 10);
  }

  /* =========================
      ADMIN - LISTAR
  ========================= */

  list() {
    return this.prisma.student.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        company: true,
        courses: {
          include: { course: true },
        },
      },
    });
  }

  /* =========================
      ADMIN - CRIAR
  ========================= */

  async create(dto: CreateStudentDto) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.prisma.student.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email já cadastrado');
    }

    const companyId = await this.ensureCompanyId(dto.companyId);
    const passwordHash = await this.createTempPasswordHash();

    const student = await this.prisma.student.create({
      data: {
        fullName: (dto.fullName || '').trim(),
        email,
        passwordHash,
        mustChangePassword: true,
        company: { connect: { id: companyId } },
      },
    });

    // matrícula opcional (se veio courseId)
    if (dto.courseId) {
      await this.prisma.studentCourse.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: dto.courseId,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: dto.courseId,
        },
      });
    }

    return student;
  }

  /* =========================
      ADMIN - DESATIVAR
  ========================= */

  deactivate(studentId: string) {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { isActive: false },
    });
  }

  /* =========================
      ALUNO - MEUS CURSOS + PROGRESSO + PROVA
  ========================= */

  /**
   * Retorna cursos do aluno + progresso agregado
   * E também:
   * - prova do curso (se existir)
   * - prova liberada quando 100% aulas concluídas
   */
  async getStudentCourses(studentId: string) {
    // 1) cursos matriculados do aluno
    const enrollments = await this.prisma.studentCourse.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.courseId);

    // 2) provas existentes desses cursos (1 por curso)
    const exams = await this.prisma.exam.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true, title: true, isActive: true },
    });

    const examByCourse = new Map<
      string,
      { id: string; title: string; isActive: boolean }
    >();

    for (const ex of exams) {
      examByCourse.set(ex.courseId, {
        id: ex.id,
        title: ex.title,
        isActive: ex.isActive,
      });
    }

    // 3) módulos desses cursos
    const modules = await this.prisma.module.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true },
    });

    const moduleToCourse = new Map<string, string>();
    const moduleIds: string[] = [];

    for (const m of modules) {
      moduleToCourse.set(m.id, m.courseId);
      moduleIds.push(m.id);
    }

    // 4) aulas desses módulos
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId: { in: moduleIds } },
      select: { id: true, moduleId: true },
    });

    const lessonToCourse = new Map<string, string>();
    const totalLessonsByCourse = new Map<string, number>();

    for (const l of lessons) {
      const courseId = moduleToCourse.get(l.moduleId);
      if (!courseId) continue;

      lessonToCourse.set(l.id, courseId);
      totalLessonsByCourse.set(
        courseId,
        (totalLessonsByCourse.get(courseId) || 0) + 1,
      );
    }

    // 5) progresso concluído do aluno
    const progress = await this.prisma.studentLessonProgress.findMany({
      where: { studentId, completed: true },
      select: { lessonId: true },
    });

    const completedLessonsByCourse = new Map<string, number>();

    for (const p of progress) {
      const courseId = lessonToCourse.get(p.lessonId);
      if (!courseId) continue;

      completedLessonsByCourse.set(
        courseId,
        (completedLessonsByCourse.get(courseId) || 0) + 1,
      );
    }

    // 6) monta retorno
    return enrollments.map((e) => {
      const totalLessons = totalLessonsByCourse.get(e.courseId) || 0;
      const completedLessons = completedLessonsByCourse.get(e.courseId) || 0;

      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      const exam = examByCourse.get(e.courseId);
      const hasExam = !!exam && exam.isActive !== false;

      // ✅ regra de liberação da prova: terminou o curso (100% aulas)
      const examUnlocked = hasExam && totalLessons > 0 && completedLessons >= totalLessons;

      return {
        id: e.course.id,
        title: e.course.title,
        description: e.course.description,
        imageUrl: e.course.imageUrl,
        totalLessons,
        completedLessons,
        progressPercent,

        // ✅ prova (menu do aluno)
        hasExam,
        examId: exam?.id || null,
        examTitle: exam?.title || null,
        examUnlocked,
      };
    });
  }

  /* =========================
      ALUNO - MINHAS PROVAS
  ========================= */

  /**
   * Lista provas do aluno com status:
   * - unlocked: true se curso concluído (100%)
   */
  async getStudentExams(studentId: string) {
    const courses = await this.getStudentCourses(studentId);

    return courses
      .filter((c: any) => c.hasExam)
      .map((c: any) => ({
        courseId: c.id,
        courseTitle: c.title,
        examId: c.examId,
        examTitle: c.examTitle,
        unlocked: !!c.examUnlocked,
        progressPercent: c.progressPercent,
      }));
  }

  /* =========================
      ALUNO - MEUS CERTIFICADOS
  ========================= */

  /**
   * ✅ Regra:
   * - Certificado "LIBERADO" se existir registro em Certificate para (studentId, courseId)
   * - Caso contrário: "BLOQUEADO" com motivo
   *
   * Observação:
   * - Aqui NÃO depende de 100% aulas; depende de PASSAR na prova (porque o Certificate será criado no submit).
   */
  async getStudentCertificates(studentId: string) {
    const courses = await this.getStudentCourses(studentId);
    if (!courses.length) return [];

    const courseIds = courses.map((c: any) => c.id);

    const certs = await this.prisma.certificate.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: {
        id: true,
        courseId: true,
        scorePercent: true,
        issuedAt: true,
      },
    });

    const certByCourse = new Map<
      string,
      { id: string; scorePercent: number; issuedAt: Date }
    >();

    for (const c of certs) {
      certByCourse.set(c.courseId, {
        id: c.id,
        scorePercent: c.scorePercent,
        issuedAt: c.issuedAt,
      });
    }

    return courses.map((c: any) => {
      const cert = certByCourse.get(c.id);

      // curso sem prova
      if (!c.hasExam) {
        return {
          courseId: c.id,
          courseTitle: c.title,
          status: 'LOCKED',
          reason: 'Este curso não possui prova cadastrada.',
          progressPercent: c.progressPercent,
          certificateId: null,
          scorePercent: null,
          issuedAt: null,
        };
      }

      // certificado liberado
      if (cert) {
        return {
          courseId: c.id,
          courseTitle: c.title,
          status: 'UNLOCKED',
          reason: null,
          progressPercent: c.progressPercent,
          certificateId: cert.id,
          scorePercent: cert.scorePercent,
          issuedAt: cert.issuedAt,
        };
      }

      // bloqueado (não passou ainda)
      return {
        courseId: c.id,
        courseTitle: c.title,
        status: 'LOCKED',
        reason: 'Termine a prova e seja aprovado para liberar o certificado.',
        progressPercent: c.progressPercent,
        certificateId: null,
        scorePercent: null,
        issuedAt: null,
      };
    });
  }

  /**
   * (Opcional) detalhe por curso — útil pra tela quando clicar em um curso
   */
  async getMyCertificateByCourse(studentId: string, courseId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { id: true, courseId: true, scorePercent: true, issuedAt: true },
    });

    if (!cert) {
      return null;
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    return {
      certificateId: cert.id,
      courseId: cert.courseId,
      courseTitle: course?.title || '',
      scorePercent: cert.scorePercent,
      issuedAt: cert.issuedAt,
    };
  }
}
