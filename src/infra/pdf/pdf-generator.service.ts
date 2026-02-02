import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generateFromHtml(html: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Necessário para Docker/Linux
      });

      const page = await browser.newPage();

      // Carrega o HTML na memória
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Gera o PDF
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      return Buffer.from(pdfUint8Array);
    } catch (error) {
      this.logger.error('Erro crítico ao renderizar PDF', error);
      throw new InternalServerErrorException(
        'Erro ao gerar arquivo do certificado.',
      );
    } finally {
      if (browser) await browser.close();
    }
  }
}
