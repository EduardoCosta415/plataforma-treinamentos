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

  private normalizeString(v: any): string {
    return (v ?? '').toString().trim();
  }

  private normalizeCpf(value: any): string {
    return this.normalizeString(value).replace(/\D/g, '');
  }

  private isValidCpf(cpf: string): boolean {
    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calc = (base: string, factor: number) => {
      let total = 0;
      for (let i = 0; i < base.length; i++) {
        total += Number(base[i]) * (factor - i);
      }
      const mod = total % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const d1 = calc(cpf.slice(0, 9), 10);
    const d2 = calc(cpf.slice(0, 10), 11);
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
  }

  private getDefaultCompanyIdFromEnv(): string | null {
    const id = (process.env.DEFAULT_COMPANY_ID || '').trim();
    return id || null;
  }

  private async getOrCreateFallbackCompanyId(): Promise<string> {
    const DEFAULT_COMPANY_NAME = 'Sem empresa';

    let company = await this.prisma.company.findFirst({
      where: { name: DEFAULT_COMPANY_NAME },
      select: { id: true },
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: { name: DEFAULT_COMPANY_NAME },
        select: { id: true },
      });
    }

    return company.id;
  }

  /**
   * ✅ Resolve Company:
   * - se vier companyId: valida que existe
   * - se vier companyName: busca por name (case-insensitive)
   * - senão: usa DEFAULT_COMPANY_ID do .env (se existir e existir no banco)
   * - fallback: cria/usa "Sem empresa"
   */
  private async resolveCompanyId(input: {
    companyId?: string | null;
    companyName?: string | null;
  }): Promise<string> {
    const companyId = this.normalizeString(input.companyId || '');
    const companyName = this.normalizeString(input.companyName || '');

    if (companyId) {
      const exists = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('CompanyId inválido.');
      return companyId;
    }

    if (companyName) {
      const company = await this.prisma.company.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!company) {
        throw new BadRequestException(
          'Empresa inválida. Digite o nome exatamente como está no sistema.',
        );
      }
      return company.id;
    }

    const envId = this.getDefaultCompanyIdFromEnv();
    if (envId) {
      const exists = await this.prisma.company.findUnique({
        where: { id: envId },
        select: { id: true },
      });
      if (exists) return envId;
    }

    return this.getOrCreateFallbackCompanyId();
  }

  private async hashPassword(pwd: string): Promise<string> {
    return bcrypt.hash(pwd, 10);
  }

  /** ✅ Status válidos para o aluno enxergar curso no app */
  private readonly VISIBLE_ENROLLMENT_STATUS = ['ACTIVE', 'COMPLETED'] as const;

  /**
   * ✅ MATRÍCULA ÚNICA (clean)
   * Use esta função para:
   * - compra
   * - admin manual
   * - import
   *
   * Ela cria/garante os DOIS vínculos:
   * - StudentCourseEnrollment (usado pelo "meus cursos" e pelo player/fluxo do aluno)
   * - StudentCourse (usado por outras telas/admin)
   */
  async enrollStudentInCourse(studentId: string, courseId: string) {
    const cId = this.normalizeString(courseId);
    if (!cId) throw new BadRequestException('Curso inválido.');

    const course = await this.prisma.course.findUnique({
      where: { id: cId },
      select: { id: true, isActive: true },
    });

    if (!course) throw new BadRequestException('Curso inválido.');
    if (!course.isActive) throw new BadRequestException('Curso está inativo.');

    await this.prisma.studentCourseEnrollment.upsert({
      where: { studentId_courseId: { studentId, courseId: cId } },
      update: { status: 'ACTIVE' },
      create: { studentId, courseId: cId, status: 'ACTIVE' },
    });

    await this.prisma.studentCourse.upsert({
      where: { studentId_courseId: { studentId, courseId: cId } },
      update: {},
      create: { studentId, courseId: cId },
    });

    return { ok: true };
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
        courses: { include: { course: true } }, // StudentCourse
        enrollments: { include: { course: true } }, // StudentCourseEnrollment
      },
    });
  }

  /* =========================
      ADMIN - CRIAR (com CPF)
  ========================= */

  async create(dto: CreateStudentDto) {
    const fullName = this.normalizeString(dto.fullName);
    const email = this.normalizeEmail(dto.email);

    if (!fullName) throw new BadRequestException('Nome é obrigatório');
    if (!email) throw new BadRequestException('Email é obrigatório');

    // ✅ CPF obrigatório (robusto contra number vindo do front)
    const cpf = this.normalizeCpf((dto as any).cpf);

    if (!cpf || cpf.length !== 11 || !this.isValidCpf(cpf)) {
      throw new BadRequestException('CPF inválido');
    }

    // email duplicado
    const existingEmail = await this.prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) throw new BadRequestException('Email já cadastrado');

    // cpf duplicado
    const existingCpf = await this.prisma.student.findFirst({
      where: { cpf },
      select: { id: true },
    });
    if (existingCpf) throw new BadRequestException('CPF já cadastrado');

    const companyId = await this.resolveCompanyId({
      companyId: dto.companyId ?? null,
      companyName: dto.companyName ?? null,
    });

    const pwd = this.normalizeString(dto.password || '') || '123456';
    if (pwd.length < 6) {
      throw new BadRequestException(
        'A senha deve ter no mínimo 6 caracteres',
      );
    }

    const passwordHash = await this.hashPassword(pwd);

    const student = await this.prisma.student.create({
      data: {
        fullName,
        email,
        cpf,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
        company: { connect: { id: companyId } },
      },
    });

    // matrícula opcional
    const courseId = this.normalizeString(dto.courseId || '');
    if (courseId) {
      await this.enrollStudentInCourse(student.id, courseId);
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
      ✅ FIX: não sumir ao concluir (ACTIVE + COMPLETED)
  ========================= */

  async getStudentCourses(studentId: string) {
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: {
        studentId,
        status: { in: [...this.VISIBLE_ENROLLMENT_STATUS] },
      },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            exam: { select: { id: true, title: true, isActive: true } },
          },
        },
      },
    });

    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.courseId);

    const modules = await this.prisma.module.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
        _count: { select: { lessons: true } },
      },
    });

    const totalLessonsByCourse = new Map<string, number>();
    for (const m of modules) {
      totalLessonsByCourse.set(
        m.courseId,
        (totalLessonsByCourse.get(m.courseId) || 0) + m._count.lessons,
      );
    }

    const progress = await this.prisma.studentLessonProgress.findMany({
      where: {
        studentId,
        completed: true,
        lesson: { module: { courseId: { in: courseIds } } },
      },
      select: {
        lesson: { select: { module: { select: { courseId: true } } } },
      },
    });

    const completedLessonsByCourse = new Map<string, number>();
    for (const p of progress) {
      const cId = p.lesson.module.courseId;
      completedLessonsByCourse.set(
        cId,
        (completedLessonsByCourse.get(cId) || 0) + 1,
      );
    }

    return enrollments.map((e) => {
      const course = e.course;
      const exam = course.exam;

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

        hasExam,
        examId: exam?.id || null,
        examTitle: exam?.title || null,
        examUnlocked,

        // útil se você quiser mostrar “Concluído” no card depois
        enrollmentStatus: e.status,
        completedAt: e.completedAt || null,
      };
    });
  }

  async getStudentExams(studentId: string) {
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

  async getStudentCertificates(studentId: string) {
    const courses = await this.getStudentCourses(studentId);
    if (!courses.length) return [];

    const courseIds = courses.map((c) => c.id);

    const certs = await this.prisma.certificate.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: { id: true, courseId: true, scorePercent: true, issuedAt: true },
    });

    const certByCourse = new Map<string, (typeof certs)[0]>();
    for (const c of certs) certByCourse.set(c.courseId, c);

    return courses.map((c) => {
      const cert = certByCourse.get(c.id);

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

  async getMyCertificateByCourse(studentId: string, courseId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { id: true, courseId: true, scorePercent: true, issuedAt: true },
    });

    if (!cert) return null;

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

  /* =========================
      ALUNO - BIBLIOTECA
      ✅ FIX: não sumir ao concluir (ACTIVE + COMPLETED)
  ========================= */

  async getStudentLibrary(studentId: string) {
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: {
        studentId,
        status: { in: [...this.VISIBLE_ENROLLMENT_STATUS] },
      },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.courseId);

    const items = await this.prisma.libraryItem.findMany({
      where: { isActive: true, courseId: { in: courseIds } },
      orderBy: { createdAt: 'desc' },
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

  /* =========================
      ADMIN - UPDATE (editar aluno completo)
  ========================= */

  async update(studentId: string, dto: any) {
    const current = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!current) throw new BadRequestException('Aluno não encontrado');

    const data: any = {};

    // fullName
    if (dto.fullName !== undefined) {
      const name = this.normalizeString(dto.fullName);
      if (!name) throw new BadRequestException('Nome é obrigatório');
      data.fullName = name;
    }

    // email
    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      if (!email) throw new BadRequestException('Email é obrigatório');

      const dup = await this.prisma.student.findFirst({
        where: { email, NOT: { id: studentId } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Email já cadastrado');

      data.email = email;
    }

    // cpf
    if (dto.cpf !== undefined) {
      const cpf = this.normalizeCpf(dto.cpf);

      if (!cpf || cpf.length !== 11 || !this.isValidCpf(cpf)) {
        throw new BadRequestException('CPF inválido');
      }

      const dup = await this.prisma.student.findFirst({
        where: { cpf, NOT: { id: studentId } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('CPF já cadastrado');

      data.cpf = cpf;
    }

    // companyId (opcional)
    if (dto.companyId !== undefined) {
      if (dto.companyId === null || dto.companyId === '') {
        const companyId = await this.resolveCompanyId({
          companyId: undefined,
          companyName: null,
        });
        data.companyId = companyId;
      } else {
        const companyId = await this.resolveCompanyId({
          companyId: String(dto.companyId),
          companyName: null,
        });
        data.companyId = companyId;
      }
    }

    // password (opcional)
    if (dto.password !== undefined) {
      const pwd = this.normalizeString(dto.password);
      if (!pwd || pwd.length < 6) {
        throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
      }
      data.passwordHash = await this.hashPassword(pwd);
      data.mustChangePassword = false;
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data,
    });
  }
}
