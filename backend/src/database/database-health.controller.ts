import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface DbInfoRow {
  database: string;
  user_name: string;
  postgis_enabled: boolean;
}

interface PostGisVersionRow {
  postgis_version: string;
}

export interface DatabaseHealthResponse {
  status: 'ok';
  database: string;
  user: string;
  postgisEnabled: boolean;
  postgisVersion: string | null;
}

/**
 * Expone un endpoint de verificación para confirmar la conectividad con PostgreSQL y PostGIS.
 */
@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('db')
  async checkDatabase(): Promise<DatabaseHealthResponse> {
    try {
      const [dbInfo] = await this.dataSource.query<DbInfoRow[]>(`
        SELECT
          current_database() AS database,
          current_user AS user_name,
          EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'postgis'
          ) AS postgis_enabled
      `);

      let postgisVersion: string | null = null;
      if (dbInfo?.postgis_enabled) {
        const [postgisRow] = await this.dataSource.query<PostGisVersionRow[]>(
          'SELECT PostGIS_Version() AS postgis_version',
        );
        postgisVersion = postgisRow?.postgis_version ?? null;
      }

      return {
        status: 'ok',
        database: dbInfo?.database ?? 'unknown',
        user: dbInfo?.user_name ?? 'unknown',
        postgisEnabled: Boolean(dbInfo?.postgis_enabled),
        postgisVersion,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido de conexión';
      throw new ServiceUnavailableException(
        `No se pudo conectar a PostgreSQL: ${message}`,
      );
    }
  }
}
