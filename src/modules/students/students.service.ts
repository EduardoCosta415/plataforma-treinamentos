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
      await this.prisma.studentCourseEnrollment.upsert({
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
    // 1) Busca cursos matriculados JÁ INCLUINDO os dados do curso e da prova
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: { studentId },
      // ✅ CORREÇÃO TS2322: Usar o campo de data correto da tabela de matrícula (geralmente enrolledAt)
      orderBy: { enrolledAt: 'desc' },
      include: {
        // ✅ CORREÇÃO TS2551: Incluir o curso para poder acessar e.course depois
        course: {
          include: {
            // Já buscamos se o curso tem prova ativa
            exam: {
              select: { id: true, title: true, isActive: true },
            },
          },
        },
      },
    });

    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.courseId);

    // 2) Calcular TOTAL de aulas por curso (Lesson -> Module -> Course)
    // Buscamos todos os módulos desses cursos e suas quantidades de aulas
    const modules = await this.prisma.module.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
        _count: { select: { lessons: true } },
      },
    });

    // Mapa: CourseID -> Total Lessons
    const totalLessonsByCourse = new Map<string, number>();
    for (const m of modules) {
      const current = totalLessonsByCourse.get(m.courseId) || 0;
      totalLessonsByCourse.set(m.courseId, current + m._count.lessons);
    }

    // 3) Calcular aulas CONCLUÍDAS pelo aluno (StudentLessonProgress -> Lesson -> Module -> Course)
    const progress = await this.prisma.studentLessonProgress.findMany({
      where: {
        studentId,
        completed: true,
        lesson: { module: { courseId: { in: courseIds } } },
      },
      select: {
        lesson: {
          select: { module: { select: { courseId: true } } },
        },
      },
    });

    // Mapa: CourseID -> Completed Lessons
    const completedLessonsByCourse = new Map<string, number>();
    for (const p of progress) {
      const cId = p.lesson.module.courseId;
      completedLessonsByCourse.set(
        cId,
        (completedLessonsByCourse.get(cId) || 0) + 1,
      );
    }

    // 4) Monta retorno
    return enrollments.map((e) => {
      // ✅ Agora e.course existe e está tipado corretamente
      const course = e.course;
      const exam = course.exam; // Prova vinda do include

      const totalLessons = totalLessonsByCourse.get(course.id) || 0;
      const completedLessons = completedLessonsByCourse.get(course.id) || 0;

      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      const hasExam = !!exam && exam.isActive !== false;

      // ✅ regra de liberação da prova: terminou o curso (100% aulas)
      const examUnlocked =
        hasExam && totalLessons > 0 && completedLessons >= totalLessons;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
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

  async getStudentExams(studentId: string) {
    // Reutiliza a lógica centralizada (que já está tipada corretamente agora)
    const courses = await this.getStudentCourses(studentId);

    return courses
      .filter((c) => c.hasExam)
      .map((c) => ({
        courseId: c.id,
        courseTitle: c.title,
        examId: c.examId,
        examTitle: c.examTitle,
        unlocked: c.examUnlocked,
        progressPercent: c.progressPercent,
      }));
  }

  /* =========================
      ALUNO - MEUS CERTIFICADOS
  ========================= */

  async getStudentCertificates(studentId: string) {
    const courses = await this.getStudentCourses(studentId);
    if (!courses.length) return [];

    const courseIds = courses.map((c) => c.id);

    // Busca certificados existentes
    const certs = await this.prisma.certificate.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: {
        id: true,
        courseId: true,
        scorePercent: true,
        issuedAt: true,
      },
    });

    const certByCourse = new Map<string, (typeof certs)[0]>();
    for (const c of certs) {
      certByCourse.set(c.courseId, c);
    }

    return courses.map((c) => {
      const cert = certByCourse.get(c.id);

      // 1. Curso sem prova = Bloqueado (ou lógica específica)
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

      // 2. Certificado existe = Liberado
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

      // 3. Caso contrário = Bloqueado (falta passar na prova)
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
   * Detalhe por curso
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
