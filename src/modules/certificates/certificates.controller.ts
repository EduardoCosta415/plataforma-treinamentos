import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { CertificatesService } from './certificates.service';

type JwtUser = { sub: string; role?: string };

@Controller('students/me/certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  private getStudentId(req: Request): string {
    const user = req.user as JwtUser | undefined;
    if (!user?.sub) throw new ForbiddenException('Usuário não autenticado');
    return user.sub;
  }

  @Get()
  async listMyCertificates(@Req() req: Request) {
    return this.service.listByStudent(this.getStudentId(req));
  }

  @Get(':courseId')
  async getMyCertificateByCourse(@Req() req: Request, @Param('courseId') courseId: string) {
    return this.service.getByStudentAndCourse(this.getStudentId(req), courseId);
  }

  // ✅ PDF FINAL (igual ao template)
  @Get(':courseId/pdf')
  async downloadMyCertificatePdf(
    @Req() req: Request,
    @Param('courseId') courseId: string,
    @Res() res: Response,
  ) {
    const studentId = this.getStudentId(req);

    const pdfBytes = await this.service.generatePdfForStudentCourse({
      studentId,
      courseId,
      templateKey: 'NR33', // você pode mudar isso por curso depois
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificado-${courseId}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  }
}
