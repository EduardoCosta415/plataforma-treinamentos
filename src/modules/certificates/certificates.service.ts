import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ✅ LISTA (com histórico)
  // ============================================================
  async listByStudent(studentId: string) {
    const items = await this.prisma.certificate.findMany({
      where: { studentId },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            exam: { select: { id: true } },
          },
        },
      },
    });

    const courseIds = items.map((c) => c.courseId);

    // conclusão do curso (completedAt)
    const enrollments = await this.prisma.studentCourseEnrollment.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: { courseId: true, completedAt: true },
    });
    const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e.completedAt]));

    // tentativas por examId
    const examIds = items.map((c) => c.course?.exam?.id).filter(Boolean) as string[];
    const attempts = examIds.length
      ? await this.prisma.studentExamAttempt.findMany({
          where: { studentId, examId: { in: examIds } },
          orderBy: [{ examId: 'asc' }, { attemptNumber: 'asc' }],
          select: {
            id: true,
            examId: true,
            attemptNumber: true,
            scorePercent: true,
            passed: true,
            startedAt: true,
            finishedAt: true,
          },
        })
      : [];

    const attemptsByExamId = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const arr = attemptsByExamId.get(a.examId) ?? [];
      arr.push(a);
      attemptsByExamId.set(a.examId, arr);
    }

    return {
      success: true,
      data: items.map((c) => {
        const examId = c.course?.exam?.id ?? null;
        return {
          id: c.id,
          courseId: c.courseId,
          courseTitle: c.course?.title ?? '',
          scorePercent: c.scorePercent,
          issuedAt: c.issuedAt,
          attemptId: c.attemptId,

          // ✅ histórico
          courseCompletedAt: enrollmentMap.get(c.courseId) ?? null,
          attempts: examId ? (attemptsByExamId.get(examId) ?? []) : [],
        };
      }),
    };
  }

  // ============================================================
  // ✅ DETALHE (com histórico)
  // ============================================================
  async getByStudentAndCourse(studentId: string, courseId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            workloadHours: true,
            exam: { select: { id: true, passScore: true } },
            modules: { orderBy: { order: 'asc' }, select: { id: true, title: true, workloadHours: true, order: true } },
          },
        },
        student: { select: { id: true, fullName: true, cpf: true } },
      },
    });

    if (!cert) throw new NotFoundException('Certificado não encontrado para este curso');

    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { completedAt: true },
    });

    const examId = cert.course?.exam?.id ?? null;

    const attempts = examId
      ? await this.prisma.studentExamAttempt.findMany({
          where: { studentId, examId },
          orderBy: { attemptNumber: 'asc' },
          select: {
            id: true,
            attemptNumber: true,
            scorePercent: true,
            passed: true,
            startedAt: true,
            finishedAt: true,
          },
        })
      : [];

    return {
      success: true,
      data: {
        id: cert.id,
        studentId: cert.studentId,
        studentName: cert.student?.fullName ?? '',
        studentCpf: cert.student?.cpf ?? '',
        courseId: cert.courseId,
        courseTitle: cert.course?.title ?? '',
        scorePercent: cert.scorePercent,
        issuedAt: cert.issuedAt,
        attemptId: cert.attemptId,

        // ✅ histórico
        courseCompletedAt: enrollment?.completedAt ?? null,
        attempts,
        modules: cert.course?.modules ?? [],
        workloadHours: cert.course?.workloadHours ?? null,
      },
    };
  }

  // ============================================================
  // ✅ EMISSÃO IDPOTENTE (corrigida)
  // ============================================================
  async issueIfNotExists(params: {
    studentId: string;
    courseId: string;
    attemptId?: string | null;
    scorePercent: number;
  }) {
    const { studentId, courseId, attemptId, scorePercent } = params;

    return this.prisma.certificate.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      create: {
        studentId,
        courseId,
        attemptId: attemptId ?? null,
        scorePercent,
        issuedAt: new Date(),
      },
      update: {
        attemptId: attemptId ?? undefined,
        scorePercent,
        issuedAt: new Date(),
      },
    });
  }

  // ============================================================
  // ✅ PDF (TEMPLATE)
  // ============================================================
  async generatePdfForStudentCourse(params: {
    studentId: string;
    courseId: string;
    templateKey: 'NR33';
  }): Promise<Uint8Array> {
    const { studentId, courseId } = params;

    const cert = await this.prisma.certificate.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        student: { select: { fullName: true, cpf: true } },
        course: {
          select: {
            title: true,
            workloadHours: true,
            modules: {
              orderBy: { order: 'asc' },
              select: { title: true, workloadHours: true, order: true },
            },
          },
        },
      },
    });

    if (!cert) throw new NotFoundException('Certificado não encontrado');

    const studentName = cert.student?.fullName ?? '';
    const studentCpf = cert.student?.cpf ?? '';
    const courseTitle = cert.course?.title ?? '';

    // ⚠️ caminho do template (deve existir)
    const templatePath = path.resolve(
      process.cwd(),
      'src/assets/certificates/CERTIFICADO NR-33.pdf',
    );
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(`Template do certificado não encontrado: ${templatePath}`);
    }

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];

    // ===== PAGE 1 =====
    this.drawText(page1, { text: studentName || '—', x: 170, y: 520, size: 14, font: fontBold });

    this.drawText(page1, {
      text: studentCpf ? `CPF: ${studentCpf}` : 'CPF: —',
      x: 170,
      y: 495,
      size: 11,
      font,
    });

    this.drawText(page1, { text: courseTitle || '—', x: 170, y: 468, size: 12, font: fontBold });

    const issuedAt = cert.issuedAt ? new Date(cert.issuedAt) : new Date();
    const issuedStr = this.formatDateBR(issuedAt);

    this.drawText(page1, { text: issuedStr, x: 430, y: 160, size: 10, font });
    this.drawText(page1, { text: `Aproveitamento: ${cert.scorePercent}%`, x: 60, y: 160, size: 10, font });

    // ===== PAGE 2 =====
    const rows = this.buildModuleRows(cert.course?.modules ?? []);

    let startY = 620;
    const rowHeight = 18;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const y = startY - i * rowHeight;
      if (y < 120) break;

      this.drawText(page2, { text: r.title, x: 60, y, size: 10, font });
      this.drawText(page2, { text: `${r.hours} H`, x: 430, y, size: 10, font });
      this.drawText(page2, { text: r.instructor || '', x: 500, y, size: 10, font });
    }

    const totalHours =
      typeof cert.course?.workloadHours === 'number'
        ? cert.course.workloadHours
        : rows.reduce((sum, r) => sum + r.hours, 0);

    this.drawText(page2, {
      text: `CARGA HORÁRIA TOTAL DE ${totalHours} HORAS`,
      x: 60,
      y: 85,
      size: 12,
      font: fontBold,
    });

    return await pdfDoc.save();
  }

  // ============================================================
  // Helpers
  // ============================================================
  private drawText(page: any, params: { text: string; x: number; y: number; size: number; font: any }) {
    page.drawText(params.text, { x: params.x, y: params.y, size: params.size, font: params.font, color: rgb(0, 0, 0) });
  }

  private formatDateBR(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private buildModuleRows(modules: any[]): { title: string; hours: number; instructor?: string }[] {
    return modules.map((m) => {
      const hours = Number(m.workloadHours ?? 0);
      return {
        title: String(m.title ?? 'Módulo'),
        hours: isFinite(hours) ? hours : 0,
        instructor: String(m.instructorName ?? ''),
      };
    });
  }
}
