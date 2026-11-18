import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createTypeOrmOptions } from '../config/database.config';
import { DatabaseHealthController } from './database-health.controller';

/**
 * Módulo central de persistencia encargado de inicializar TypeORM con PostgreSQL/PostGIS.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
  ],
  controllers: [DatabaseHealthController],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query('SELECT 1');
      const options = this.dataSource.options as {
        host?: string;
        port?: number;
        database?: string;
      };
      this.logger.log(
        `✅ Base de datos conectada correctamente (${options.host ?? 'url'}:${options.port ?? 5432} / ${options.database ?? 'db'})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `❌ Error al conectar con la base de datos: ${message}`,
      );
    }
  }
}
