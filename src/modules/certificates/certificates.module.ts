import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { PdfGeneratorService } from '../../infra/pdf/pdf-generator.service'; // Ajuste o caminho ../ se necessário
import { PrismaModule } from '../../infra/prisma/prisma.module'; // Ajuste o caminho ../ se necessário

@Module({
  imports: [PrismaModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, PdfGeneratorService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
