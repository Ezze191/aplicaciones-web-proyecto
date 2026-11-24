import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.enableCors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
        : true,
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const uploadsPath = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsPath, { recursive: true });
    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads/',
    });

    const swaggerConfig = new DocumentBuilder()
      .setTitle('S.I.U Torreón Alerta API')
      .setDescription(
        'API RESTful para la Plataforma Municipal de Reportes Ciudadanos e Incidencias Urbanas.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 Backend NestJS corriendo en http://localhost:${port}`);
    logger.log(`📚 Documentación Swagger en http://localhost:${port}/api/docs`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido al iniciar';
    logger.error(
      `❌ No se pudo iniciar la aplicación (revisa la conexión a la base de datos): ${message}`,
    );
    process.exit(1);
  }
}
void bootstrap();
