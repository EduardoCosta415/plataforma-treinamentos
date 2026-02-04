import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Swagger
  const config = new DocumentBuilder()
    .setTitle('Plataforma de Treinamentos')
    .setDescription('API para a plataforma de treinamentos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // ✅ CORS
  // Em DEV: libera tudo sem credentials (funciona no browser)
  // Em PROD: você troca para o domínio do front e mantém credentials se precisar de cookies
  app.enableCors({
    origin: true, // reflete a origin do request
    credentials: false,
  });

  // ✅ Servir arquivos estáticos (PDFs)
  // Sua API poderá retornar fileUrl tipo: http://localhost:3000/uploads/library/arquivo.pdf
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ✅ Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Railway / Prod
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
