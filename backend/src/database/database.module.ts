import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
export class DatabaseModule {}
