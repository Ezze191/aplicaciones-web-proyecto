import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
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

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 Backend NestJS corriendo en http://localhost:${port}`);
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
