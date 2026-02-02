import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';

type JwtUser = { sub: string; role?: string };

@ApiTags('Certificados (Aluno)')
@ApiBearerAuth()
@Controller('students/me/certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  private readonly logger = new Logger(CertificatesController.name);

  constructor(private readonly service: CertificatesService) {}

  private getStudentId(req: Request): string {
    const user = req.user as JwtUser | undefined;
    if (!user?.sub) {
      throw new ForbiddenException('Usuário não identificado no token.');
    }
    return user.sub;
  }

  @Get()
  async listMyCertificates(@Req() req: Request) {
    const studentId = this.getStudentId(req);
    return this.service.listByStudent(studentId);
  }

  @Get(':courseId/download')
  async downloadCertificate(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Res() res: Response,
  ) {
    const studentId = this.getStudentId(req);

    this.logger.log(
      `📥 Download solicitado: Aluno [${studentId}] - Curso [${courseId}]`,
    );

    const pdfBuffer = await this.service.generateCertificateWithPuppeteer(
      studentId,
      courseId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-${courseId}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.send(pdfBuffer);
  }
}
