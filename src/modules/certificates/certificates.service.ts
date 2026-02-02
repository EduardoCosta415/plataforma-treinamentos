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
  CertificateModule,
} from './templates/certificate-html.builder';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

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
    const bestAttempt = await this.prisma.studentExamAttempt.findFirst({
      where: {
        studentId,
        examId,
        passed: true,
      },
      orderBy: { scorePercent: 'desc' },
    });

    if (!bestAttempt) {
      throw new BadRequestException(
        'Certificado indisponível: Aluno não aprovado na prova final.',
      );
    }

    // 4. Persistência
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
        scorePercent: bestAttempt.scorePercent,
        attemptId: bestAttempt.id,
      },
    });

    // 5. Buscar dados do Aluno
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true, cpf: true },
    });

    // =====================================================================
    // TRATAMENTO DA IMAGEM (Usando process.cwd() para evitar erro de /dist)
    // =====================================================================
    let logoBase64 = '';
    try {
      const imagePath = path.join(
        process.cwd(),
        'src',
        'infra',
        'images',
        'image.png',
      );
      const imageBuffer = fs.readFileSync(imagePath);
      logoBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (err) {
      this.logger.error(
        `Não foi possível carregar a logo em: src/infra/images/image.png - ${err.message}`,
      );
    }

    // =====================================================================
    // DADOS PARA O TEMPLATE
    // =====================================================================
    const conclusionDate = enrollment.completedAt;
    const startDate = new Date(conclusionDate);
    startDate.setDate(startDate.getDate() - 5);

    const expirationDate = new Date(conclusionDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 2);

    // Módulos dinâmicos: removido o mock.
    // O próximo desenvolvedor deve mapear os módulos do curso aqui.
    const modules: CertificateModule[] = [];

    // Extrair número da NR automaticamente do título
    const nrMatch = enrollment.course.title.match(/NR\s?(\d+)/i);
    const nrNumber = nrMatch ? nrMatch[1] : '35';

    const templateData: CertificateData = {
      studentName: student?.fullName ?? 'Aluno',
      studentCpf: student?.cpf ?? '000.000.000-00',
      courseTitle: enrollment.course.title,
      nrNumber: nrNumber,
      workloadHours: enrollment.course.workloadHours || 0,
      verificationCode: certificate.id,
      startDate: format(startDate, 'dd/MM/yyyy'),
      endDate: format(conclusionDate, 'dd/MM/yyyy'),
      expirationDate: format(expirationDate, 'dd/MM/yyyy'),
      modules: modules,
      logoBase64: logoBase64,
    };

    const html = buildCertificateHtml(templateData);
    return this.pdfGenerator.generateFromHtml(html);
  }
}
