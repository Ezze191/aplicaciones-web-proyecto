import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { ReportCategoryEntity } from '../catalogs/entities/report-category.entity';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { isWithinTorreonJurisdiction } from '../common/utils/geo.util';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { CheckDuplicatesDto } from './dto/check-duplicates.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  AssignReportDto,
  RejectReportDto,
  UpdateReportStatusDto,
  UpvoteReportDto,
} from './dto/report-actions.dto';
import { CitizenUpvoteEntity } from './entities/citizen-upvote.entity';
import {
  IncidentReportEntity,
  ReportStatusEnum,
  RiskLevel,
} from './entities/incident-report.entity';
import { PhotographicEvidenceEntity } from './entities/photographic-evidence.entity';
import { ReportStatusHistoryEntity } from './entities/report-status-history.entity';
import { FolioFactory } from './factories/folio.factory';
import {
  PriorityStrategyResolver,
  SlaSemaphore,
} from './strategies/priority.strategy';

interface DuplicateQueryRow {
  report_id: string;
  folio: string;
  current_status: ReportStatusEnum;
  upvotes_count: number;
  address_reference: string;
  description: string;
  category_name: string;
  department_name: string;
  department_code: string;
  before_image_url: string | null;
  distance_meters: number;
}

interface EnrichedReportRow {
  id: string;
  folio: string;
  citizen_id: string | null;
  department_id: string;
  department_code: string;
  department_name: string;
  department_color: string;
  department_sla_hours: number;
  category_id: string;
  category_name: string;
  category_weight: number;
  risk_level: RiskLevel;
  current_status: ReportStatusEnum;
  address_reference: string;
  description: string;
  upvotes_count: number;
  master_report_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
  lat: number;
  lng: number;
  distance_meters: number | null;
  assigned_crew_id: string | null;
  assigned_crew_name: string | null;
  work_order_id: string | null;
  work_order_folio: string | null;
  work_order_status: string | null;
  work_order_notes: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
}

export interface ReportView {
  id: string;
  folio: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  departmentColor: string;
  categoryId: string;
  categoryName: string;
  riskLevel: RiskLevel;
  currentStatus: ReportStatusEnum;
  kanbanStatus: 'nuevos' | 'asignados' | 'en_reparacion' | 'resueltos' | 'rechazados';
  addressReference: string;
  description: string;
  upvotesCount: number;
  lat: number;
  lng: number;
  distanceMeters: number | null;
  elapsedHours: number;
  remainingHours: number;
  slaHours: number;
  slaStatus: SlaSemaphore;
  priorityScore: number;
  assignedCrewId: string | null;
  assignedCrewName: string | null;
  workOrderId: string | null;
  workOrderFolio: string | null;
  workOrderStatus: string | null;
  workOrderNotes: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

const FOLIO_REGEX = /^[A-Z]{3}-\d{4}-\d{4,6}$/;

@Injectable()
export class ReportsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IncidentReportEntity)
    private readonly reportsRepo: Repository<IncidentReportEntity>,
    @InjectRepository(ReportCategoryEntity)
    private readonly categoriesRepo: Repository<ReportCategoryEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentsRepo: Repository<DepartmentEntity>,
    @InjectRepository(ReportStatusHistoryEntity)
    private readonly historyRepo: Repository<ReportStatusHistoryEntity>,
    @InjectRepository(CitizenUpvoteEntity)
    private readonly upvotesRepo: Repository<CitizenUpvoteEntity>,
    @InjectRepository(PhotographicEvidenceEntity)
    private readonly evidencesRepo: Repository<PhotographicEvidenceEntity>,
    @InjectRepository(FieldCrewEntity)
    private readonly crewsRepo: Repository<FieldCrewEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async checkDuplicates(dto: CheckDuplicatesDto) {
    const radius = dto.radiusMeters ?? 50;

    const rows = await this.dataSource.query<DuplicateQueryRow[]>(
      `
      SELECT
        ir.id AS report_id,
        ir.folio,
        ir.current_status,
        ir.upvotes_count,
        ir.address_reference,
        ir.description,
        rc.name AS category_name,
        d.name AS department_name,
        d.code AS department_code,
        (
          SELECT pe.image_url
          FROM photographic_evidences pe
          WHERE pe.report_id = ir.id AND pe.stage = 'ANTES'
          ORDER BY pe.captured_at ASC
          LIMIT 1
        ) AS before_image_url,
        ST_Distance(
          ir.location_geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_meters
      FROM incident_reports ir
      JOIN report_categories rc ON rc.id = ir.category_id
      JOIN departments d ON d.id = ir.department_id
      WHERE ir.category_id = $3
        AND ir.current_status NOT IN ('RESUELTO', 'RECHAZADO')
        AND ir.master_report_id IS NULL
        AND ST_DWithin(
          ir.location_geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $4
        )
      ORDER BY distance_meters ASC
      LIMIT 5
      `,
      [dto.lng, dto.lat, dto.categoryId, radius],
    );

    return {
      hasDuplicates: rows.length > 0,
      radiusMeters: radius,
      matches: rows.map((r) => ({
        reportId: r.report_id,
        folio: r.folio,
        currentStatus: r.current_status,
        upvotesCount: r.upvotes_count,
        addressReference: r.address_reference,
        description: r.description,
        categoryName: r.category_name,
        departmentName: r.department_name,
        departmentCode: r.department_code,
        beforeImageUrl: r.before_image_url,
        distanceMeters: Math.round(Number(r.distance_meters)),
      })),
    };
  }

  async createReport(
    dto: CreateReportDto,
    user: AuthenticatedUser | undefined,
  ): Promise<ReportView> {
    if (!isWithinTorreonJurisdiction(dto.lat, dto.lng)) {
      throw new BadRequestException(
        'Las coordenadas seleccionadas están fuera de la jurisdicción de Torreón / La Laguna.',
      );
    }

    if (user) {
      const rateRows = await this.dataSource.query<{ count: string }[]>(
        `
        SELECT COUNT(*) AS count
        FROM incident_reports
        WHERE citizen_id = $1
          AND created_at >= NOW() - INTERVAL '1 hour'
        `,
        [user.id],
      );
      if (Number(rateRows[0]?.count || 0) >= 5) {
        throw new HttpException(
          'Límite antispam alcanzado: máximo 5 reportes por hora por usuario.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const category = await this.categoriesRepo.findOne({
      where: { id: dto.categoryId },
      relations: { department: true },
    });
    if (!category || !category.department) {
      throw new NotFoundException('La categoría seleccionada no existe.');
    }

    const department = category.department;
    const folio = await FolioFactory.generateIncidentFolio(
      this.dataSource,
      department.code,
    );

    const organizedImageUrl = await this.storageService.moveEvidenceToReportFolio(
      dto.imageUrl,
      folio,
      'antes',
    );

    const riskLevel: RiskLevel =
      dto.riskLevel ??
      (category.priorityWeight >= 5
        ? 'CRITICO'
        : category.priorityWeight >= 4
          ? 'ALTO'
          : 'MEDIO');

    const createdId = await this.dataSource.transaction(async (manager) => {
      const inserted = await manager.query<{ id: string }[]>(
        `
        INSERT INTO incident_reports (
          folio, citizen_id, department_id, category_id,
          risk_level, current_status, location_geom,
          address_reference, description, upvotes_count, master_report_id
        )
        VALUES (
          $1, $2, $3, $4,
          $5, 'REGISTRADO', ST_SetSRID(ST_MakePoint($6, $7), 4326),
          $8, $9, 1, $10
        )
        RETURNING id
        `,
        [
          folio,
          user?.id ?? null,
          department.id,
          category.id,
          riskLevel,
          dto.lng,
          dto.lat,
          dto.addressReference.trim(),
          dto.description.trim(),
          dto.masterReportId ?? null,
        ],
      );

      const reportId = inserted[0].id;

      await manager.query(
        `
        INSERT INTO photographic_evidences (report_id, stage, image_url, capture_coords)
        VALUES ($1, 'ANTES', $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        `,
        [reportId, organizedImageUrl, dto.lng, dto.lat],
      );

      if (user?.id) {
        await manager.query(
          `
          INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
          VALUES ($1, 'REGISTRADO', 'REGISTRADO', $2, 'Reporte recibido y geo-validado en plataforma.')
          `,
          [reportId, user.id],
        );
      }

      return reportId;
    });

    await this.notificationsService.createInApp({
      departmentId: department.id,
      reportId: createdId,
      title: `Nuevo reporte ${folio}`,
      message: `${category.name} en ${dto.addressReference.trim()}`,
      type: 'NEW_REPORT',
    });

    if (user?.email) {
      await this.notificationsService.createInApp({
        userId: user.id,
        reportId: createdId,
        title: `Folio ${folio} registrado`,
        message: `Tu reporte fue canalizado a ${department.name}.`,
        type: 'REPORT_CREATED',
      });

      await this.notificationsService.sendEventEmail('REPORT_CREATED', {
        recipientEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        folio,
        categoryName: category.name,
        departmentName: department.name,
        address: dto.addressReference.trim(),
        slaHours: department.defaultSlaHours,
      });
    }

    const reportView = await this.getReportViewById(createdId);
    if (!reportView) {
      throw new NotFoundException('No se pudo cargar el reporte creado.');
    }
    return reportView;
  }

  async listReports(
    query: QueryReportsDto,
    currentUser?: AuthenticatedUser,
  ): Promise<ReportView[]> {
    const params: unknown[] = [];
    const whereClauses: string[] = ['ir.master_report_id IS NULL'];

    // Si es supervisor, filtrar automáticamente a su dependencia
    const effectiveDepartmentId =
      currentUser?.role === 'ROLE_SUPERVISOR' && currentUser.departmentId
        ? currentUser.departmentId
        : query.departmentId;

    if (effectiveDepartmentId) {
      params.push(effectiveDepartmentId);
      whereClauses.push(`ir.department_id = $${params.length}`);
    }

    if (query.departmentCode) {
      params.push(query.departmentCode.toUpperCase());
      whereClauses.push(`UPPER(d.code) = $${params.length}`);
    }

    if (query.status) {
      params.push(query.status);
      whereClauses.push(`ir.current_status = $${params.length}`);
    }

    if (query.kanbanStatus) {
      const map: Record<string, string[]> = {
        nuevos: ['REGISTRADO', 'VALIDADO'],
        asignados: ['ASIGNADO'],
        en_reparacion: ['EN_PROCESO'],
        resueltos: ['RESUELTO'],
        rechazados: ['RECHAZADO'],
      };
      const statuses = map[query.kanbanStatus];
      if (statuses) {
        params.push(statuses);
        whereClauses.push(`ir.current_status = ANY($${params.length}::varchar[])`);
      }
    }

    if (query.riskLevel) {
      params.push(query.riskLevel);
      whereClauses.push(`ir.risk_level = $${params.length}`);
    }

    if (query.minUpvotes) {
      params.push(query.minUpvotes);
      whereClauses.push(`ir.upvotes_count >= $${params.length}`);
    }

    if (query.colonia && query.colonia !== 'Todas las colonias') {
      params.push(`%${query.colonia.trim()}%`);
      whereClauses.push(`ir.address_reference ILIKE $${params.length}`);
    }

    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`);
      const idx = params.length;
      whereClauses.push(
        `(ir.folio ILIKE $${idx} OR ir.address_reference ILIKE $${idx} OR ir.description ILIKE $${idx} OR rc.name ILIKE $${idx})`,
      );
    }

    if (query.dateFrom) {
      params.push(query.dateFrom);
      whereClauses.push(`ir.created_at >= $${params.length}::timestamptz`);
    }

    if (query.dateTo) {
      params.push(query.dateTo);
      whereClauses.push(`ir.created_at <= $${params.length}::timestamptz`);
    }

    let distanceSelect = 'NULL::double precision AS distance_meters';
    const hasCoords =
      typeof query.lat === 'number' &&
      Number.isFinite(query.lat) &&
      typeof query.lng === 'number' &&
      Number.isFinite(query.lng);

    if (hasCoords) {
      params.push(query.lng, query.lat);
      const lngIdx = params.length - 1;
      const latIdx = params.length;
      distanceSelect = `ST_Distance(ir.location_geom::geography, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography) AS distance_meters`;

      if (query.radiusMeters) {
        params.push(query.radiusMeters);
        const radIdx = params.length;
        whereClauses.push(
          `ST_DWithin(ir.location_geom::geography, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography, $${radIdx})`,
        );
      }
    }

    if (query.crewId && query.crewId !== 'all') {
      if (query.crewId === 'unassigned') {
        whereClauses.push(`wo.crew_id IS NULL`);
      } else {
        params.push(query.crewId);
        whereClauses.push(`(wo.crew_id::text = $${params.length} OR fc.name = $${params.length})`);
      }
    }

    const limit = query.limit ?? 100;
    params.push(limit);
    const limitIdx = params.length;

    const rows = await this.dataSource.query<EnrichedReportRow[]>(
      `
      SELECT
        ir.id,
        ir.folio,
        ir.citizen_id,
        ir.department_id,
        d.code AS department_code,
        d.name AS department_name,
        d.color_hex AS department_color,
        d.default_sla_hours AS department_sla_hours,
        ir.category_id,
        rc.name AS category_name,
        rc.priority_weight AS category_weight,
        ir.risk_level,
        ir.current_status,
        ir.address_reference,
        ir.description,
        ir.upvotes_count,
        ir.master_report_id,
        ir.created_at,
        ir.resolved_at,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        ${distanceSelect},
        wo.crew_id AS assigned_crew_id,
        fc.name AS assigned_crew_name,
        wo.id AS work_order_id,
        wo.order_folio AS work_order_folio,
        wo.status AS work_order_status,
        wo.field_notes AS work_order_notes,
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
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      JOIN report_categories rc ON rc.id = ir.category_id
      LEFT JOIN LATERAL (
        SELECT * FROM work_orders w
        WHERE w.report_id = ir.id
        ORDER BY w.assigned_at DESC
        LIMIT 1
      ) wo ON TRUE
      LEFT JOIN field_crews fc ON fc.id = wo.crew_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ir.created_at DESC
      LIMIT $${limitIdx}
      `,
      params,
    );

    const mapped = rows.map((row) => this.mapRowToView(row));

    if (query.slaStatus) {
      return mapped.filter((r) => r.slaStatus === query.slaStatus);
    }

    return mapped;
  }

  async listMyReports(user: AuthenticatedUser): Promise<ReportView[]> {
    const rows = await this.dataSource.query<EnrichedReportRow[]>(
      `
      SELECT
        ir.id,
        ir.folio,
        ir.citizen_id,
        ir.department_id,
        d.code AS department_code,
        d.name AS department_name,
        d.color_hex AS department_color,
        d.default_sla_hours AS department_sla_hours,
        ir.category_id,
        rc.name AS category_name,
        rc.priority_weight AS category_weight,
        ir.risk_level,
        ir.current_status,
        ir.address_reference,
        ir.description,
        ir.upvotes_count,
        ir.master_report_id,
        ir.created_at,
        ir.resolved_at,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        NULL::double precision AS distance_meters,
        wo.crew_id AS assigned_crew_id,
        fc.name AS assigned_crew_name,
        wo.id AS work_order_id,
        wo.order_folio AS work_order_folio,
        wo.status AS work_order_status,
        wo.field_notes AS work_order_notes,
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
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      JOIN report_categories rc ON rc.id = ir.category_id
      LEFT JOIN LATERAL (
        SELECT * FROM work_orders w
        WHERE w.report_id = ir.id
        ORDER BY w.assigned_at DESC
        LIMIT 1
      ) wo ON TRUE
      LEFT JOIN field_crews fc ON fc.id = wo.crew_id
      WHERE ir.citizen_id = $1
      ORDER BY ir.created_at DESC
      `,
      [user.id],
    );

    return rows.map((row) => this.mapRowToView(row));
  }

  async getByFolio(rawFolio: string) {
    const folio = rawFolio.trim().toUpperCase();
    if (!FOLIO_REGEX.test(folio)) {
      throw new BadRequestException(
        'Formato de folio inválido. Ejemplo válido: SIM-2026-0842.',
      );
    }

    const rows = await this.dataSource.query<EnrichedReportRow[]>(
      `
      SELECT
        ir.id,
        ir.folio,
        ir.citizen_id,
        ir.department_id,
        d.code AS department_code,
        d.name AS department_name,
        d.color_hex AS department_color,
        d.default_sla_hours AS department_sla_hours,
        ir.category_id,
        rc.name AS category_name,
        rc.priority_weight AS category_weight,
        ir.risk_level,
        ir.current_status,
        ir.address_reference,
        ir.description,
        ir.upvotes_count,
        ir.master_report_id,
        ir.created_at,
        ir.resolved_at,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        NULL::double precision AS distance_meters,
        wo.crew_id AS assigned_crew_id,
        fc.name AS assigned_crew_name,
        wo.id AS work_order_id,
        wo.order_folio AS work_order_folio,
        wo.status AS work_order_status,
        wo.field_notes AS work_order_notes,
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
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      JOIN report_categories rc ON rc.id = ir.category_id
      LEFT JOIN LATERAL (
        SELECT * FROM work_orders w
        WHERE w.report_id = ir.id
        ORDER BY w.assigned_at DESC
        LIMIT 1
      ) wo ON TRUE
      LEFT JOIN field_crews fc ON fc.id = wo.crew_id
      WHERE UPPER(ir.folio) = $1
      LIMIT 1
      `,
      [folio],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`No se encontró ningún reporte con folio ${folio}.`);
    }

    const report = this.mapRowToView(rows[0]);
    const history = await this.historyRepo.find({
      where: { reportId: report.id },
      order: { createdAt: 'ASC' },
    });
    const evidences = await this.evidencesRepo.find({
      where: { reportId: report.id },
      order: { capturedAt: 'ASC' },
    });

    return {
      report,
      history,
      evidences,
    };
  }

  async upvoteReport(
    reportId: string,
    dto: UpvoteReportDto,
    user: AuthenticatedUser | undefined,
    ipAddress: string,
  ) {
    const report = await this.reportsRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }
    if (report.currentStatus === 'RESUELTO' || report.currentStatus === 'RECHAZADO') {
      throw new BadRequestException(
        'No se pueden agregar confirmaciones a un reporte cerrado.',
      );
    }

    const voterKey = user?.id ?? dto.deviceId?.trim() ?? ipAddress;

    const existing = await this.upvotesRepo.findOne({
      where: { reportId, deviceOrUserId: voterKey },
    });
    if (existing) {
      throw new ConflictException(
        'Ya registraste tu confirmación vecinal para este reporte.',
      );
    }

    const upvote = this.upvotesRepo.create({
      reportId,
      deviceOrUserId: voterKey,
      ipAddress: ipAddress || '0.0.0.0',
    });
    await this.upvotesRepo.save(upvote);

    // El trigger trg_increment_report_upvotes actualiza upvotes_count en PostgreSQL
    const refreshed = await this.reportsRepo.findOne({
      where: { id: reportId },
    });
    const totalUpvotes = refreshed?.upvotesCount ?? report.upvotesCount + 1;

    await this.notificationsService.createInApp({
      departmentId: report.departmentId,
      reportId: report.id,
      title: `Confirmación vecinal · ${report.folio}`,
      message: `El reporte acumuló ${totalUpvotes} confirmaciones ("Sigue ahí") en ${report.addressReference}.`,
      type: 'REPORT_UPVOTE',
    });

    if (report.citizenId && report.citizenId !== user?.id) {
      await this.notificationsService.createInApp({
        userId: report.citizenId,
        reportId: report.id,
        title: `Respaldo vecinal · ${report.folio}`,
        message: `Un vecino confirmó tu reporte ("Sigue ahí"). Total: ${totalUpvotes} confirmaciones.`,
        type: 'REPORT_UPVOTE',
      });
    }

    return {
      message: 'Confirmación vecinal registrada (+1).',
      reportId,
      upvotesCount: totalUpvotes,
    };
  }

  async assignCrew(
    reportId: string,
    dto: AssignReportDto,
    user: AuthenticatedUser,
  ): Promise<ReportView> {
    const report = await this.reportsRepo.findOne({
      where: { id: reportId },
      relations: { department: true, category: true, citizen: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      user.role === 'ROLE_SUPERVISOR' &&
      report.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'No puedes gestionar reportes de otra dependencia.',
      );
    }

    const crew = await this.crewsRepo.findOne({ where: { id: dto.crewId } });
    if (!crew || !crew.isActive) {
      throw new NotFoundException('La cuadrilla seleccionada no existe o está inactiva.');
    }
    if (crew.departmentId !== report.departmentId) {
      throw new BadRequestException(
        'La cuadrilla seleccionada no pertenece a la dependencia del reporte.',
      );
    }

    const deptCode = report.department?.code ?? 'SIU';
    const slaHours = report.department?.defaultSlaHours ?? 24;
    const orderFolio = await FolioFactory.generateWorkOrderFolio(
      this.dataSource,
      deptCode,
    );
    const slaDeadline = new Date(
      new Date(report.createdAt).getTime() + slaHours * 3600000,
    );

    const prevStatus = report.currentStatus;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO work_orders (order_folio, report_id, crew_id, sla_deadline, status, field_notes)
        VALUES ($1, $2, $3, $4, 'ASIGNADA', $5)
        `,
        [orderFolio, report.id, crew.id, slaDeadline, dto.notes?.trim() || null],
      );

      await manager.query(
        `UPDATE incident_reports SET current_status = 'ASIGNADO' WHERE id = $1`,
        [report.id],
      );

      await manager.query(
        `
        INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
        VALUES ($1, $2, 'ASIGNADO', $3, $4)
        `,
        [
          report.id,
          prevStatus,
          user.id,
          dto.notes?.trim()
            ? `Asignado a ${crew.name}. Instrucciones: ${dto.notes.trim()}`
            : `Asignado a ${crew.name} para atención en campo.`,
        ],
      );
    });

    // Notificar al jefe de cuadrilla
    await this.notificationsService.createInApp({
      userId: crew.leaderUserId,
      reportId: report.id,
      title: `Nueva orden ${orderFolio}`,
      message: `Folio ${report.folio} asignado en ${report.addressReference}`,
      type: 'WORK_ORDER_ASSIGNED',
    });

    // Notificar al ciudadano (in-app + Resend)
    if (report.citizenId) {
      await this.notificationsService.createInApp({
        userId: report.citizenId,
        reportId: report.id,
        title: `Folio ${report.folio} asignado`,
        message: `Tu reporte fue asignado a ${crew.name}.`,
        type: 'REPORT_ASSIGNED',
      });
    }

    if (report.citizen?.email) {
      await this.notificationsService.sendEventEmail('REPORT_ASSIGNED', {
        recipientEmail: report.citizen.email,
        recipientName: `${report.citizen.firstName} ${report.citizen.lastName}`,
        folio: report.folio,
        departmentName: report.department?.name,
        crewName: crew.name,
        address: report.addressReference,
        notes: dto.notes?.trim(),
      });
    }

    await this.notificationsService.createInApp({
      departmentId: report.departmentId,
      reportId: report.id,
      title: `Asignado · ${report.folio}`,
      message: `Asignado a ${crew.name} por ${user.firstName} ${user.lastName}.`,
      type: 'REPORT_ASSIGNED',
    });

    const updated = await this.getReportViewById(report.id);
    return updated!;
  }

  async rejectReport(
    reportId: string,
    dto: RejectReportDto,
    user: AuthenticatedUser,
  ): Promise<ReportView> {
    const report = await this.reportsRepo.findOne({
      where: { id: reportId },
      relations: { citizen: true, department: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      user.role === 'ROLE_SUPERVISOR' &&
      report.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'No puedes rechazar reportes de otra dependencia.',
      );
    }

    const prevStatus = report.currentStatus;
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE incident_reports SET current_status = 'RECHAZADO' WHERE id = $1`,
        [report.id],
      );

      await manager.query(
        `
        INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
        VALUES ($1, $2, 'RECHAZADO', $3, $4)
        `,
        [report.id, prevStatus, user.id, dto.reason.trim()],
      );
    });

    if (report.citizenId) {
      await this.notificationsService.createInApp({
        userId: report.citizenId,
        reportId: report.id,
        title: `Folio ${report.folio} rechazado`,
        message: dto.reason.trim(),
        type: 'REPORT_REJECTED',
      });
    }

    if (report.citizen?.email) {
      await this.notificationsService.sendEventEmail('REPORT_REJECTED', {
        recipientEmail: report.citizen.email,
        recipientName: `${report.citizen.firstName} ${report.citizen.lastName}`,
        folio: report.folio,
        notes: dto.reason.trim(),
      });
    }

    await this.notificationsService.createInApp({
      departmentId: report.departmentId,
      reportId: report.id,
      title: `Reporte rechazado · ${report.folio}`,
      message: `Rechazado por ${user.firstName} ${user.lastName}: ${dto.reason.trim()}`,
      type: 'REPORT_REJECTED',
    });

    const updated = await this.getReportViewById(report.id);
    return updated!;
  }

  async updateStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
    user: AuthenticatedUser,
  ): Promise<ReportView> {
    const report = await this.reportsRepo.findOne({
      where: { id: reportId },
      relations: { citizen: true, department: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      user.role === 'ROLE_SUPERVISOR' &&
      report.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'No puedes modificar reportes de otra dependencia.',
      );
    }

    const prevStatus = report.currentStatus;
    await this.dataSource.transaction(async (manager) => {
      if (dto.status === 'RESUELTO') {
        await manager.query(
          `UPDATE incident_reports SET current_status = $1, resolved_at = COALESCE(resolved_at, NOW()) WHERE id = $2`,
          [dto.status, report.id],
        );
      } else {
        await manager.query(
          `UPDATE incident_reports SET current_status = $1 WHERE id = $2`,
          [dto.status, report.id],
        );
      }

      await manager.query(
        `
        INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          report.id,
          prevStatus,
          dto.status,
          user.id,
          dto.notes?.trim() || `Estado actualizado a ${dto.status} desde Backoffice.`,
        ],
      );
    });

    if (report.citizenId) {
      await this.notificationsService.createInApp({
        userId: report.citizenId,
        reportId: report.id,
        title: `Actualización · ${report.folio}`,
        message: `El estatus de tu reporte cambió de ${prevStatus} a ${dto.status}.`,
        type: 'STATUS_CHANGE',
      });
    }

    await this.notificationsService.createInApp({
      departmentId: report.departmentId,
      reportId: report.id,
      title: `Cambio de estado · ${report.folio}`,
      message: `Movido a ${dto.status} por ${user.firstName} ${user.lastName}.`,
      type: 'STATUS_CHANGE',
    });

    const updated = await this.getReportViewById(report.id);
    return updated!;
  }

  private async getReportViewById(reportId: string): Promise<ReportView | null> {
    const rows = await this.dataSource.query<EnrichedReportRow[]>(
      `
      SELECT
        ir.id,
        ir.folio,
        ir.citizen_id,
        ir.department_id,
        d.code AS department_code,
        d.name AS department_name,
        d.color_hex AS department_color,
        d.default_sla_hours AS department_sla_hours,
        ir.category_id,
        rc.name AS category_name,
        rc.priority_weight AS category_weight,
        ir.risk_level,
        ir.current_status,
        ir.address_reference,
        ir.description,
        ir.upvotes_count,
        ir.master_report_id,
        ir.created_at,
        ir.resolved_at,
        ST_Y(ir.location_geom) AS lat,
        ST_X(ir.location_geom) AS lng,
        NULL::double precision AS distance_meters,
        wo.crew_id AS assigned_crew_id,
        fc.name AS assigned_crew_name,
        wo.id AS work_order_id,
        wo.order_folio AS work_order_folio,
        wo.status AS work_order_status,
        wo.field_notes AS work_order_notes,
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
      FROM incident_reports ir
      JOIN departments d ON d.id = ir.department_id
      JOIN report_categories rc ON rc.id = ir.category_id
      LEFT JOIN LATERAL (
        SELECT * FROM work_orders w
        WHERE w.report_id = ir.id
        ORDER BY w.assigned_at DESC
        LIMIT 1
      ) wo ON TRUE
      LEFT JOIN field_crews fc ON fc.id = wo.crew_id
      WHERE ir.id = $1
      LIMIT 1
      `,
      [reportId],
    );
    return rows.length > 0 ? this.mapRowToView(rows[0]) : null;
  }

  private mapRowToView(row: EnrichedReportRow): ReportView {
    const sla = PriorityStrategyResolver.evaluate({
      departmentCode: row.department_code,
      defaultSlaHours: row.department_sla_hours,
      riskLevel: row.risk_level,
      categoryWeight: row.category_weight,
      upvotesCount: row.upvotes_count,
      status: row.current_status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    });

    const kanbanMap: Record<
      ReportStatusEnum,
      'nuevos' | 'asignados' | 'en_reparacion' | 'resueltos' | 'rechazados'
    > = {
      REGISTRADO: 'nuevos',
      VALIDADO: 'nuevos',
      ASIGNADO: 'asignados',
      EN_PROCESO: 'en_reparacion',
      RESUELTO: 'resueltos',
      RECHAZADO: 'rechazados',
    };

    return {
      id: row.id,
      folio: row.folio,
      departmentId: row.department_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      departmentColor: row.department_color,
      categoryId: row.category_id,
      categoryName: row.category_name,
      riskLevel: row.risk_level,
      currentStatus: row.current_status,
      kanbanStatus: kanbanMap[row.current_status] ?? 'nuevos',
      addressReference: row.address_reference,
      description: row.description,
      upvotesCount: row.upvotes_count,
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceMeters:
        row.distance_meters !== null ? Math.round(Number(row.distance_meters)) : null,
      elapsedHours: sla.elapsedHours,
      remainingHours: sla.remainingHours,
      slaHours: sla.slaHours,
      slaStatus: sla.slaStatus,
      priorityScore: sla.priorityScore,
      assignedCrewId: row.assigned_crew_id,
      assignedCrewName: row.assigned_crew_name,
      workOrderId: row.work_order_id,
      workOrderFolio: row.work_order_folio,
      workOrderStatus: row.work_order_status,
      workOrderNotes: row.work_order_notes,
      beforeImageUrl: row.before_image_url,
      afterImageUrl: row.after_image_url,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    };
  }
}
