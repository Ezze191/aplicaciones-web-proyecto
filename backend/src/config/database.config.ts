import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Construye las opciones de conexión PostgreSQL/PostGIS para TypeORM
 * usando las variables de entorno cargadas mediante ConfigService.
 */
export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const useSsl = configService.get<string>('DB_SSL') === 'true';
  const host = configService.get<string>('DB_HOST');
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (!host && !databaseUrl) {
    throw new Error(
      'Falta configurar DB_HOST o DATABASE_URL en las variables de entorno.',
    );
  }

  const connectionOptions: TypeOrmModuleOptions = host
    ? {
        type: 'postgres',
        host,
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'siu_db'),
      }
    : {
        type: 'postgres',
        url: databaseUrl,
      };

  return {
    ...connectionOptions,
    autoLoadEntities: true,
    // El esquema, geometrías PostGIS y triggers se gestionan desde infra/db/init.sql o migraciones.
    synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
    uuidExtension: 'pgcrypto',
    logging:
      !isProduction && configService.get<string>('DB_LOGGING') === 'true',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
}
