import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

interface KpiRow {
  total_reports: string;
  resolved_reports: string;
  pending_reports: string;
  rejected_reports: string;
  avg_resolution_hours: string | null;
  total_upvotes: string;
  sla_on_time: string;
}

interface DepartmentStatRow {
  id: string;
  code: string;
  name: string;
  color_hex: string;
  total: string;
  resolved: string;
  pending: string;
}

interface HeatmapRow {
  id: string;
  folio: string;
  lat: number;
  lng: number;
  upvotes_count: number;
  risk_level: string;
  current_status: string;
  department_code: string;
  address_reference: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboard(
    user: AuthenticatedUser,
    filters?: { departmentId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const effectiveDeptId =
      user.role === 'ROLE_SUPERVISOR'
        ? user.departmentId
        : filters?.departmentId;

    const params: unknown[] = [];
    const conditions: string[] = ['ir.master_report_id IS NULL'];

    if (effectiveDeptId) {
      params.push(effectiveDeptId);
      conditions.push(`ir.department_id = $${params.length}`);
    }
    if (filters?.dateFrom) {
      params.push(filters.dateFrom);
      conditions.push(`ir.created_at >= $${params.length}::timestamptz`);
    }
    if (filters?.dateTo) {
      params.push(filters.dateTo);
      conditions.push(`ir.created_at <= $${params.length}::timestamptz`);
    }

    const whereSql = conditions.join(' AND ');

    const [kpiRow] = await this.dataSource.query<KpiRow[]>(
      `
      SELECT
        COUNT(*) AS total_reports,
        COUNT(*) FILTER (WHERE ir.current_status = 'RESUELTO') AS resolved_reports,
        COUNT(*) FILTER (WHERE ir.current_status NOT IN ('RESUELTO', 'RECHAZADO')) AS pending_reports,
        COUNT(*) FILTER (WHERE ir.current_status = 'RECHAZADO') AS rejected_reports,
        ROUND(AVG(EXTRACT(EPOCH FROM (ir.resolved_at - ir.created_at)) / 3600.0) FILTER (WHERE ir.resolved_at IS NOT NULL)::numeric, 1) AS avg_resolution_hours,
        COALESCE(SUM(GREATEST(ir.upvotes_count - 1, 0)), 0) AS total_upvotes,
        COUNT(*) FILTER (
          WHERE ir.current_status = 'RESUELTO'
            AND ir.resolved_at IS NOT NULL
            AND EXTRACT(EPOCH FROM (ir.resolved_at - ir.created_at)) / 3600.0 <= d.default_sla_hours
        ) AS sla_on_time
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      WHERE ${whereSql}
      `,
      params,
    );

    const byDepartment = await this.dataSource.query<DepartmentStatRow[]>(
      `
      SELECT
        d.id,
        d.code,
        d.name,
        d.color_hex,
        COUNT(ir.id) AS total,
        COUNT(ir.id) FILTER (WHERE ir.current_status = 'RESUELTO') AS resolved,
        COUNT(ir.id) FILTER (WHERE ir.current_status NOT IN ('RESUELTO', 'RECHAZADO')) AS pending
      FROM departments d
      LEFT JOIN incident_reports ir ON ir.department_id = d.id AND ir.master_report_id IS NULL
      GROUP BY d.id, d.code, d.name, d.color_hex
      ORDER BY total DESC
      `,
    );

    const byStatus = await this.dataSource.query<
      { status: string; count: string }[]
    >(
      `
      SELECT ir.current_status AS status, COUNT(*) AS count
      FROM incident_reports ir
      WHERE ${whereSql}
      GROUP BY ir.current_status
      `,
      params,
    );

    const byRiskLevel = await this.dataSource.query<
      { risk_level: string; count: string }[]
    >(
      `
      SELECT ir.risk_level, COUNT(*) AS count
      FROM incident_reports ir
      WHERE ${whereSql}
      GROUP BY ir.risk_level
      `,
      params,
    );

    const heatmapRows = await this.dataSource.query<HeatmapRow[]>(
      `
      SELECT
        ir.id,
        ir.folio,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        ir.upvotes_count,
        ir.risk_level,
        ir.current_status,
        d.code AS department_code,
        ir.address_reference
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      WHERE ${whereSql}
      ORDER BY ir.created_at DESC
      LIMIT 500
      `,
      params,
    );

    const [crewCountRow] = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM field_crews WHERE is_active = TRUE`,
    );

    const total = Number(kpiRow?.total_reports || 0);
    const resolved = Number(kpiRow?.resolved_reports || 0);
    const slaOnTime = Number(kpiRow?.sla_on_time || 0);

    return {
      kpis: {
        totalReports: total,
        resolvedReports: resolved,
        pendingReports: Number(kpiRow?.pending_reports || 0),
        rejectedReports: Number(kpiRow?.rejected_reports || 0),
        slaCompliancePct:
          resolved > 0 ? Math.round((slaOnTime / resolved) * 1000) / 10 : 100,
        avgResolutionHours: kpiRow?.avg_resolution_hours
          ? Number(kpiRow.avg_resolution_hours)
          : 0,
        groupedConfirmations: Number(kpiRow?.total_upvotes || 0),
        activeCrewsCount: Number(crewCountRow?.count || 0),
      },
      byDepartment: byDepartment.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        colorHex: d.color_hex,
        total: Number(d.total || 0),
        resolved: Number(d.resolved || 0),
        pending: Number(d.pending || 0),
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: Number(s.count || 0),
      })),
      byRiskLevel: byRiskLevel.map((r) => ({
        riskLevel: r.risk_level,
        count: Number(r.count || 0),
      })),
      heatmapPoints: heatmapRows.map((h) => ({
        id: h.id,
        folio: h.folio,
        lat: Number(h.lat),
        lng: Number(h.lng),
        weight:
          (h.risk_level === 'CRITICO'
            ? 4
            : h.risk_level === 'ALTO'
              ? 3
              : 1) + Math.min(h.upvotes_count, 20) * 0.25,
        riskLevel: h.risk_level,
        status: h.current_status,
        departmentCode: h.department_code,
        addressReference: h.address_reference,
      })),
    };
  }
}
