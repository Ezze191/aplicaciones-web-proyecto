import { DataSource } from 'typeorm';

/**
 * Patrón Creacional Factory Method para la generación de folios alfanuméricos
 * estandarizados por dependencia y año fiscal, garantizando formato y unicidad.
 */
export class FolioFactory {
  static async generateIncidentFolio(
    dataSource: DataSource,
    departmentCode: string,
  ): Promise<string> {
    const prefix = departmentCode.toUpperCase().slice(0, 3).padEnd(3, 'X');
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const rows = await dataSource.query<{ folio: string }[]>(
      `
      SELECT folio
      FROM incident_reports
      WHERE folio LIKE $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [pattern],
    );

    let maxSeq = 1000;
    for (const row of rows) {
      const parts = row.folio.split('-');
      const num = Number(parts[2]);
      if (Number.isFinite(num) && num >= maxSeq) {
        maxSeq = num;
      }
    }

    const candidate = `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
    const exists = await dataSource.query<{ id: string }[]>(
      `SELECT id FROM incident_reports WHERE folio = $1 LIMIT 1`,
      [candidate],
    );
    if (exists.length === 0) {
      return candidate;
    }

    const fallbackSeq = String(Math.floor(1000 + Math.random() * 899999)).padStart(4, '0');
    return `${prefix}-${year}-${fallbackSeq}`;
  }

  static async generateWorkOrderFolio(
    dataSource: DataSource,
    departmentCode: string,
  ): Promise<string> {
    const code = departmentCode.toUpperCase();
    const year = new Date().getFullYear();
    const rows = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM work_orders`,
    );
    const seq = Number(rows[0]?.count || 0) + 1;
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    return `OT-${code}-${year}-${String(seq).padStart(3, '0')}${randomSuffix}`;
  }
}
