import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PdfGeneratorService } from '../../infra/pdf/pdf-generator.service';
import {
  buildCertificateHtml,
  CertificateData,
} from './templates/certificate-html.builder';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  /**
   * Lista certificados JÁ emitidos.
   */
  async listByStudent(studentId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { studentId },
      include: {
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return {
      success: true,
      data: certificates.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        courseTitle: c.course?.title,
        scorePercent: c.scorePercent,
        issuedAt: c.issuedAt,
      })),
    };
  }

  /**
   * Gera o PDF com verificação rígida de requisitos.
   */
  public async generateCertificateWithPuppeteer(
    studentId: string,
    courseId: string,
  ): Promise<Buffer> {
    // 1. Validar Matrícula e Dados do Curso
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        course: {
          select: {
            title: true,
            workloadHours: true,
            // Precisamos saber se o curso TEM prova configurada
            exam: { select: { id: true, passScore: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Você não está matriculado neste curso.');
    }

    if (!enrollment.completedAt) {
      throw new BadRequestException(
        'Você ainda não concluiu 100% das aulas deste curso.',
      );
    }

    // 2. Validar Existência da Prova
    const examId = enrollment.course.exam?.id;
    if (!examId) {
      throw new BadRequestException(
        'Este curso não possui uma prova final configurada para emissão de certificado.',
      );
    }

    // 3. Validar Aprovação na Prova
    // Buscamos a MELHOR nota onde passed = true
    const bestAttempt = await this.prisma.studentExamAttempt.findFirst({
      where: {
        studentId,
        examId,
        passed: true, // O banco SÓ retorna se passou
      },
      orderBy: { scorePercent: 'desc' },
    });

    if (!bestAttempt) {
      throw new BadRequestException(
        'Certificado indisponível: Você concluiu as aulas, mas ainda não foi aprovado na prova final.',
      );
    }

    // 4. Persistência (Garante que o registro do certificado existe)
    // Se já existir, atualiza. Se não, cria.
    const certificate = await this.prisma.certificate.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      create: {
        studentId,
        courseId,
        attemptId: bestAttempt.id,
        scorePercent: bestAttempt.scorePercent,
        issuedAt: new Date(),
      },
      update: {
        // Se o aluno fez a prova de novo e tirou nota maior, atualizamos
        scorePercent: bestAttempt.scorePercent,
        attemptId: bestAttempt.id,
      },
    });

    // 5. Buscar dados do Aluno para o PDF
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true, cpf: true },
    });

    // =====================================================================
    // MOCK DE DADOS (Layout Laena)
    // =====================================================================

    const conclusionDate = enrollment.completedAt;

    // Data Início: 5 dias antes
    const startDate = new Date(conclusionDate);
    startDate.setDate(startDate.getDate() - 5);

    // Validade: 2 anos depois
    const expirationDate = new Date(conclusionDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 2);

    const mockModules = [
      {
        name: 'I - Introdução à NR-35 e Conceitos Básicos',
        score: 100,
        hours: 5,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'II - Análise de Risco e Condições Impeditivas',
        score: 100,
        hours: 5,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'III - Equipamentos de Proteção e Sinalização',
        score: 100,
        hours: 10,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'IV - Sistemas de Proteção Contra-Quedas',
        score: 100,
        hours: 10,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'V - Fator de Queda, Riscos Potenciais',
        score: 100,
        hours: 10,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'VI - Nó Utilizado em Acesso por Corda',
        score: 100,
        hours: 10,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
      {
        name: 'VII - Emergência e Primeiros Socorros',
        score: 100,
        hours: 10,
        frequency: 100,
        instructor: 'Jorgiano de Assis',
      },
    ];

    const templateData: CertificateData = {
      studentName: student?.fullName ?? 'Aluno',
      studentCpf: student?.cpf ?? '000.000.000-00',
      courseTitle: enrollment.course.title,
      workloadHours: enrollment.course.workloadHours || 60,
      verificationCode: certificate.id,
      startDate: format(startDate, 'dd/MM/yyyy'),
      endDate: format(conclusionDate, 'dd/MM/yyyy'),
      expirationDate: format(expirationDate, 'dd/MM/yyyy'),
      modules: mockModules,
    };

    const html = buildCertificateHtml(templateData);
    return this.pdfGenerator.generateFromHtml(html);
  }
}
