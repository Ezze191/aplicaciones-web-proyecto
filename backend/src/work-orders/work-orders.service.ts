import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  estimateEtaMinutes,
  haversineDistanceMeters,
} from '../common/utils/geo.util';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  IncidentReportEntity,
  ReportStatusEnum,
  RiskLevel,
} from '../reports/entities/incident-report.entity';
import { PriorityStrategyResolver } from '../reports/strategies/priority.strategy';
import {
  ResolveWorkOrderDto,
  StartWorkOrderDto,
} from './dto/work-order-actions.dto';
import { WorkOrderEntity } from './entities/work-order.entity';

interface CrewOrderRow {
  work_order_id: string;
  order_folio: string;
  work_order_status: string;
  assigned_at: Date;
  sla_deadline: Date;
  field_notes: string | null;
  crew_id: string;
  crew_name: string;
  report_id: string;
  folio: string;
  department_id: string;
  department_code: string;
  department_name: string;
  department_sla_hours: number;
  category_name: string;
  category_weight: number;
  risk_level: RiskLevel;
  report_status: ReportStatusEnum;
  address_reference: string;
  description: string;
  upvotes_count: number;
  created_at: Date;
  resolved_at: Date | null;
  lat: number;
  lng: number;
  before_image_url: string | null;
  after_image_url: string | null;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(WorkOrderEntity)
    private readonly workOrdersRepo: Repository<WorkOrderEntity>,
    @InjectRepository(FieldCrewEntity)
    private readonly crewsRepo: Repository<FieldCrewEntity>,
    @InjectRepository(IncidentReportEntity)
    private readonly reportsRepo: Repository<IncidentReportEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listMyWorkOrders(
    user: AuthenticatedUser,
    coords?: { lat?: number; lng?: number; sort?: string },
  ) {
    const crew = await this.crewsRepo.findOne({
      where: { leaderUserId: user.id },
    });
    if (!crew) {
      throw new NotFoundException(
        'No tienes una cuadrilla operativa vinculada a tu usuario.',
      );
    }

    const rows = await this.dataSource.query<CrewOrderRow[]>(
      `
      SELECT
        wo.id AS work_order_id,
        wo.order_folio,
        wo.status AS work_order_status,
        wo.assigned_at,
        wo.sla_deadline,
        wo.field_notes,
        fc.id AS crew_id,
        fc.name AS crew_name,
        ir.id AS report_id,
        ir.folio,
        ir.department_id,
        d.code AS department_code,
        d.name AS department_name,
        d.default_sla_hours AS department_sla_hours,
        rc.name AS category_name,
        rc.priority_weight AS category_weight,
        ir.risk_level,
        ir.current_status AS report_status,
        ir.address_reference,
        ir.description,
        ir.upvotes_count,
        ir.created_at,
        ir.resolved_at,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        (
          SELECT pe.image_url FROM photographic_evidences pe
          WHERE pe.report_id = ir.id AND pe.stage = 'ANTES'
          ORDER BY pe.captured_at ASC LIMIT 1
        ) AS before_image_url,
        (
          SELECT pe.image_url FROM photographic_evidences pe
          WHERE pe.report_id = ir.id AND pe.stage = 'DESPUES'
          ORDER BY pe.captured_at DESC LIMIT 1
        ) AS after_image_url
      FROM work_orders wo
      JOIN field_crews fc ON fc.id = wo.crew_id
      JOIN incident_reports ir ON ir.id = wo.report_id
      JOIN departments d ON d.id = ir.department_id
      JOIN report_categories rc ON rc.id = ir.category_id
      WHERE wo.crew_id = $1
      ORDER BY wo.assigned_at DESC
      `,
      [crew.id],
    );

    const hasUserCoords =
      typeof coords?.lat === 'number' &&
      Number.isFinite(coords.lat) &&
      typeof coords?.lng === 'number' &&
      Number.isFinite(coords.lng);

    const baseLat = hasUserCoords ? coords!.lat! : 25.5428;
    const baseLng = hasUserCoords ? coords!.lng! : -103.4068;

    const items = rows.map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      const meters = haversineDistanceMeters(baseLat, baseLng, lat, lng);
      const distanceKm = Math.round((meters / 1000) * 10) / 10;
      const etaMinutes = estimateEtaMinutes(distanceKm);

      const sla = PriorityStrategyResolver.evaluate({
        departmentCode: row.department_code,
        defaultSlaHours: row.department_sla_hours,
        riskLevel: row.risk_level,
        categoryWeight: row.category_weight,
        upvotesCount: row.upvotes_count,
        status: row.report_status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      });

      return {
        id: row.work_order_id,
        orderFolio: row.order_folio,
        workOrderStatus: row.work_order_status,
        assignedAt: row.assigned_at,
        slaDeadline: row.sla_deadline,
        fieldNotes: row.field_notes,
        crewId: row.crew_id,
        crewName: row.crew_name,
        reportId: row.report_id,
        folio: row.folio,
        departmentCode: row.department_code,
        departmentName: row.department_name,
        categoryName: row.category_name,
        riskLevel: row.risk_level,
        reportStatus: row.report_status,
        addressReference: row.address_reference,
        description: row.description,
        upvotesCount: row.upvotes_count,
        lat,
        lng,
        distanceKm,
        etaMinutes,
        elapsedHours: sla.elapsedHours,
        remainingHours: sla.remainingHours,
        slaHours: sla.slaHours,
        slaStatus: sla.slaStatus,
        priorityScore: sla.priorityScore,
        beforeImageUrl: row.before_image_url,
        afterImageUrl: row.after_image_url,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      };
    });

    if (coords?.sort === 'urgencia') {
      items.sort((a, b) => b.priorityScore - a.priorityScore);
    } else {
      items.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return items;
  }

  async startWorkOrder(
    workOrderId: string,
    dto: StartWorkOrderDto,
    user: AuthenticatedUser,
  ) {
    const workOrder = await this.workOrdersRepo.findOne({
      where: { id: workOrderId },
      relations: {
        crew: true,
        report: { citizen: true, department: true },
      },
    });
    if (!workOrder || !workOrder.report) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    if (
      user.role !== 'ROLE_ADMIN' &&
      workOrder.crew?.leaderUserId !== user.id
    ) {
      throw new ForbiddenException(
        'Esta orden de trabajo pertenece a otra cuadrilla.',
      );
    }

    const prevStatus = workOrder.report.currentStatus;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE work_orders SET status = 'EN_SITIO' WHERE id = $1`,
        [workOrder.id],
      );
      await manager.query(
        `UPDATE incident_reports SET current_status = 'EN_PROCESO' WHERE id = $1`,
        [workOrder.reportId],
      );
      await manager.query(
        `
        INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
        VALUES ($1, $2, 'EN_PROCESO', $3, $4)
        `,
        [
          workOrder.reportId,
          prevStatus,
          user.id,
          dto.notes?.trim() ||
            `${workOrder.crew?.name ?? 'Cuadrilla'} inició la atención técnica en sitio.`,
        ],
      );
    });

    if (workOrder.report.citizenId) {
      await this.notificationsService.createInApp({
        userId: workOrder.report.citizenId,
        reportId: workOrder.reportId,
        title: `En reparación · ${workOrder.report.folio}`,
        message: `${workOrder.crew?.name ?? 'La cuadrilla'} ya se encuentra trabajando en el sitio.`,
        type: 'REPORT_IN_PROCESS',
      });
    }

    if (workOrder.report.citizen?.email) {
      await this.notificationsService.sendEventEmail('REPORT_IN_PROCESS', {
        recipientEmail: workOrder.report.citizen.email,
        recipientName: `${workOrder.report.citizen.firstName} ${workOrder.report.citizen.lastName}`,
        folio: workOrder.report.folio,
        crewName: workOrder.crew?.name,
      });
    }

    return {
      message: 'Atención en campo iniciada.',
      workOrderId: workOrder.id,
      reportStatus: 'EN_PROCESO',
    };
  }

  async resolveWorkOrder(
    workOrderId: string,
    dto: ResolveWorkOrderDto,
    user: AuthenticatedUser,
  ) {
    const workOrder = await this.workOrdersRepo.findOne({
      where: { id: workOrderId },
      relations: {
        crew: true,
        report: { citizen: true, department: true },
      },
    });
    if (!workOrder || !workOrder.report) {
      throw new NotFoundException('Orden de trabajo no encontrada.');
    }

    if (
      user.role !== 'ROLE_ADMIN' &&
      workOrder.crew?.leaderUserId !== user.id
    ) {
      throw new ForbiddenException(
        'No puedes cerrar una orden asignada a otra cuadrilla.',
      );
    }

    const maxRadius = Number(
      this.configService.get<string>('FIELD_VERIFICATION_RADIUS_METERS', '50'),
    );
    const strictGeo =
      this.configService.get<string>('STRICT_FIELD_GPS_CHECK', 'true') !==
      'false';

    const distRows = await this.dataSource.query<{ distance_meters: number }[]>(
      `
      SELECT ST_Distance(
        location_geom::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS distance_meters
      FROM incident_reports
      WHERE id = $3
      `,
      [dto.lng, dto.lat, workOrder.reportId],
    );

    const distanceMeters = Math.round(Number(distRows[0]?.distance_meters ?? 0));

    if (strictGeo && distanceMeters > maxRadius) {
      throw new BadRequestException(
        `Validación GPS perimetral fallida: te encuentras a ${distanceMeters} m del punto reportado (máximo permitido: ${maxRadius} m).`,
      );
    }

    const prevStatus = workOrder.report.currentStatus;
    const notesText =
      dto.fieldNotes?.trim() ||
      `Cierre técnico auditado en sitio (${distanceMeters} m del punto reportado).`;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO photographic_evidences (report_id, stage, image_url, capture_coords)
        VALUES ($1, 'DESPUES', $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        `,
        [workOrder.reportId, dto.imageUrl.trim(), dto.lng, dto.lat],
      );

      await manager.query(
        `
        UPDATE work_orders
        SET status = 'FINALIZADA',
            field_notes = COALESCE($1, field_notes)
        WHERE id = $2
        `,
        [notesText, workOrder.id],
      );

      await manager.query(
        `
        UPDATE incident_reports
        SET current_status = 'RESUELTO',
            resolved_at = NOW()
        WHERE id = $1
        `,
        [workOrder.reportId],
      );

      await manager.query(
        `
        INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
        VALUES ($1, $2, 'RESUELTO', $3, $4)
        `,
        [workOrder.reportId, prevStatus, user.id, notesText],
      );
    });

    if (workOrder.report.citizenId) {
      await this.notificationsService.createInApp({
        userId: workOrder.report.citizenId,
        reportId: workOrder.reportId,
        title: `Resuelto · ${workOrder.report.folio}`,
        message:
          'Tu reporte fue atendido y cerrado con evidencia fotográfica en sitio.',
        type: 'REPORT_RESOLVED',
      });
    }

    if (workOrder.report.citizen?.email) {
      await this.notificationsService.sendEventEmail('REPORT_RESOLVED', {
        recipientEmail: workOrder.report.citizen.email,
        recipientName: `${workOrder.report.citizen.firstName} ${workOrder.report.citizen.lastName}`,
        folio: workOrder.report.folio,
        address: workOrder.report.addressReference,
        crewName: workOrder.crew?.name,
        notes: notesText,
        afterPhotoUrl: dto.imageUrl.trim(),
      });
    }

    return {
      message: 'Incidencia cerrada correctamente con evidencia auditada.',
      workOrderId: workOrder.id,
      reportStatus: 'RESUELTO',
      verifiedInSitu: distanceMeters <= 30,
      distanceMeters,
    };
  }
}
