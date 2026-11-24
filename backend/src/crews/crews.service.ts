import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  estimateEtaMinutes,
  haversineDistanceMeters,
} from '../common/utils/geo.util';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCrewDto, PolygonPointDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';
import { FieldCrewEntity } from './entities/field-crew.entity';

interface CrewQueryRow {
  id: string;
  name: string;
  department_id: string;
  department_code: string;
  department_name: string;
  is_active: boolean;
  leader_user_id: string;
  leader_first_name: string;
  leader_last_name: string;
  leader_email: string;
  leader_phone: string | null;
  coverage_geojson: string | null;
  center_lat: number | null;
  center_lng: number | null;
  active_services: string;
  completed_this_week: string;
  avg_resolution_hours: string | null;
  covers_incident: boolean | null;
}

export interface CrewWorkerItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  position: string;
  crewId: string | null;
  crewName: string | null;
  departmentId: string;
  departmentCode: string;
}

export interface CrewView {
  id: string;
  name: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
  leader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  workers: CrewWorkerItem[];
  coverageCoordinates: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number } | null;
  activeServices: number;
  completedThisWeek: number;
  avgResolutionHours: number;
  loadStatus: 'baja' | 'normal' | 'alta';
  distanceKm: number | null;
  etaMinutes: number | null;
  coversIncident: boolean;
  isRecommended: boolean;
}

@Injectable()
export class CrewsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FieldCrewEntity)
    private readonly crewsRepo: Repository<FieldCrewEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: Repository<RoleEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentsRepo: Repository<DepartmentEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listCrews(
    user: AuthenticatedUser,
    filters?: { departmentId?: string; lat?: number; lng?: number },
  ): Promise<CrewView[]> {
    const effectiveDeptId =
      user.role === 'ROLE_SUPERVISOR'
        ? user.departmentId
        : (filters?.departmentId ?? null);

    const hasCoords =
      typeof filters?.lat === 'number' &&
      Number.isFinite(filters.lat) &&
      typeof filters?.lng === 'number' &&
      Number.isFinite(filters.lng);

    const params: unknown[] = [];
    let deptFilterSql = '';
    if (effectiveDeptId) {
      params.push(effectiveDeptId);
      deptFilterSql = `WHERE fc.department_id = $${params.length}`;
    }

    let containsSelect = 'NULL::boolean AS covers_incident';
    if (hasCoords) {
      params.push(filters!.lng, filters!.lat);
      const lngIdx = params.length - 1;
      const latIdx = params.length;
      containsSelect = `ST_Contains(fc.coverage_polygon, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)) AS covers_incident`;
    }

    const rows = await this.dataSource.query<CrewQueryRow[]>(
      `
      SELECT
        fc.id,
        fc.name,
        fc.department_id,
        d.code AS department_code,
        d.name AS department_name,
        fc.is_active,
        fc.leader_user_id,
        u.first_name AS leader_first_name,
        u.last_name AS leader_last_name,
        u.email AS leader_email,
        u.phone AS leader_phone,
        ST_AsGeoJSON(fc.coverage_polygon) AS coverage_geojson,
        ST_Y(ST_Centroid(fc.coverage_polygon)) AS center_lat,
        ST_X(ST_Centroid(fc.coverage_polygon)) AS center_lng,
        COALESCE((
          SELECT COUNT(*) FROM work_orders wo
          WHERE wo.crew_id = fc.id AND wo.status <> 'FINALIZADA'
        ), 0) AS active_services,
        COALESCE((
          SELECT COUNT(*) FROM work_orders wo
          JOIN incident_reports ir ON ir.id = wo.report_id
          WHERE wo.crew_id = fc.id
            AND wo.status = 'FINALIZADA'
            AND ir.resolved_at >= NOW() - INTERVAL '7 days'
        ), 0) AS completed_this_week,
        (
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ir.resolved_at - ir.created_at)) / 3600.0)::numeric, 1)
          FROM work_orders wo
          JOIN incident_reports ir ON ir.id = wo.report_id
          WHERE wo.crew_id = fc.id AND ir.resolved_at IS NOT NULL
        ) AS avg_resolution_hours,
        ${containsSelect}
      FROM field_crews fc
      JOIN departments d ON d.id = fc.department_id
      JOIN users u ON u.id = fc.leader_user_id
      ${deptFilterSql}
      ORDER BY fc.is_active DESC, fc.name ASC
      `,
      params,
    );

    const crewIds = rows.map((r) => r.id);
    const workersByCrew = new Map<string, CrewWorkerItem[]>();
    if (crewIds.length > 0) {
      const workerRows = await this.dataSource.query<
        Array<{
          id: string;
          employee_code: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          position: string;
          crew_id: string | null;
          crew_name: string | null;
          department_id: string;
          department_code: string;
        }>
      >(
        `
        SELECT
          w.id,
          w.employee_code,
          w.first_name,
          w.last_name,
          w.phone,
          w.position,
          w.crew_id,
          fc.name AS crew_name,
          w.department_id,
          d.code AS department_code
        FROM department_workers w
        JOIN departments d ON d.id = w.department_id
        LEFT JOIN field_crews fc ON fc.id = w.crew_id
        WHERE w.is_active = TRUE
          AND w.crew_id = ANY($1::uuid[])
        ORDER BY w.employee_code ASC
        `,
        [crewIds],
      );

      for (const w of workerRows) {
        if (!w.crew_id) continue;
        const list = workersByCrew.get(w.crew_id) ?? [];
        list.push({
          id: w.id,
          employeeCode: w.employee_code,
          firstName: w.first_name,
          lastName: w.last_name,
          phone: w.phone,
          position: w.position,
          crewId: w.crew_id,
          crewName: w.crew_name,
          departmentId: w.department_id,
          departmentCode: w.department_code,
        });
        workersByCrew.set(w.crew_id, list);
      }
    }

    const views: CrewView[] = rows.map((row) => {
      const activeServices = Number(row.active_services || 0);
      const loadStatus: 'baja' | 'normal' | 'alta' =
        activeServices >= 4 ? 'alta' : activeServices <= 1 ? 'baja' : 'normal';
      const center =
        row.center_lat !== null && row.center_lng !== null
          ? { lat: Number(row.center_lat), lng: Number(row.center_lng) }
          : null;

      let distanceKm: number | null = null;
      let etaMinutes: number | null = null;
      if (hasCoords && center) {
        const meters = haversineDistanceMeters(
          filters!.lat!,
          filters!.lng!,
          center.lat,
          center.lng,
        );
        distanceKm = Math.round((meters / 1000) * 10) / 10;
        etaMinutes = estimateEtaMinutes(distanceKm);
      }

      return {
        id: row.id,
        name: row.name,
        departmentId: row.department_id,
        departmentCode: row.department_code,
        departmentName: row.department_name,
        isActive: row.is_active,
        leader: {
          id: row.leader_user_id,
          firstName: row.leader_first_name,
          lastName: row.leader_last_name,
          email: row.leader_email,
          phone: row.leader_phone,
        },
        workers: workersByCrew.get(row.id) ?? [],
        coverageCoordinates: this.parseGeoJsonPolygon(row.coverage_geojson),
        center,
        activeServices,
        completedThisWeek: Number(row.completed_this_week || 0),
        avgResolutionHours: row.avg_resolution_hours
          ? Number(row.avg_resolution_hours)
          : 0,
        loadStatus,
        distanceKm,
        etaMinutes,
        coversIncident: Boolean(row.covers_incident),
        isRecommended: false,
      };
    });

    // Determinar cuadrilla recomendada (activa, cubre el polígono o menor distancia/carga)
    const activeViews = views.filter((v) => v.isActive);
    if (activeViews.length > 0) {
      const best = [...activeViews].sort((a, b) => {
        if (a.coversIncident !== b.coversIncident) {
          return a.coversIncident ? -1 : 1;
        }
        const distA = a.distanceKm ?? 999;
        const distB = b.distanceKm ?? 999;
        if (Math.abs(distA - distB) > 0.5) return distA - distB;
        return a.activeServices - b.activeServices;
      })[0];
      best.isRecommended = true;
    }

    return views;
  }

  async getMyCrew(user: AuthenticatedUser): Promise<CrewView> {
    const crews = await this.listCrews(user);
    const mine = crews.find((c) => c.leader.id === user.id);
    if (!mine) {
      throw new NotFoundException(
        'No tienes una flotilla operativa asignada a tu cuenta.',
      );
    }
    return mine;
  }

  async createCrew(
    dto: CreateCrewDto,
    user: AuthenticatedUser,
  ): Promise<CrewView> {
    const targetDepartmentId =
      user.role === 'ROLE_SUPERVISOR'
        ? user.departmentId
        : dto.departmentId;

    if (!targetDepartmentId) {
      throw new BadRequestException(
        'Debes especificar la dependencia de la flotilla.',
      );
    }

    const department = await this.departmentsRepo.findOne({
      where: { id: targetDepartmentId },
    });
    if (!department) {
      throw new NotFoundException('La dependencia especificada no existe.');
    }

    const lockedDomain = this.getLockedOperatorDomain(department.code);
    const rawUsername = dto.leaderUsername?.trim()
      ? dto.leaderUsername.trim().toLowerCase()
      : dto.leaderEmail?.trim()
        ? dto.leaderEmail.trim().toLowerCase().split('@')[0]
        : '';

    if (!rawUsername || !/^[a-z0-9._-]{2,64}$/.test(rawUsername)) {
      throw new BadRequestException(
        'Ingresa un nombre de usuario válido (solo letras, números, puntos o guiones, mínimo 2 caracteres).',
      );
    }

    const normalizedEmail = `${rawUsername}@${lockedDomain}`;
    const existingEmail = await this.usersRepo.findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException(
        `El correo ${normalizedEmail} ya está registrado en el sistema.`,
      );
    }

    const crewRole = await this.rolesRepo.findOne({
      where: { name: 'ROLE_CREW' },
    });
    if (!crewRole) {
      throw new BadRequestException('El rol ROLE_CREW no existe en la BD.');
    }

    const defaultPolygon: PolygonPointDto[] = [
      { lat: 25.525, lng: -103.465 },
      { lat: 25.525, lng: -103.38 },
      { lat: 25.575, lng: -103.38 },
      { lat: 25.575, lng: -103.465 },
    ];
    const wkt = this.buildPolygonWkt(
      dto.polygonCoordinates && dto.polygonCoordinates.length >= 3
        ? dto.polygonCoordinates
        : defaultPolygon,
    );
    const passwordHash = await bcrypt.hash(dto.leaderPassword, 10);

    const createdCrewId = await this.dataSource.transaction(async (manager) => {
      const leaderRows = await manager.query<{ id: string }[]>(
        `
        INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, department_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING id
        `,
        [
          normalizedEmail,
          passwordHash,
          dto.leaderFirstName.trim(),
          dto.leaderLastName.trim(),
          dto.leaderPhone?.trim() || null,
          crewRole.id,
          department.id,
        ],
      );

      const leaderId = leaderRows[0].id;
      const crewRows = await manager.query<{ id: string }[]>(
        `
        INSERT INTO field_crews (department_id, name, coverage_polygon, is_active, leader_user_id)
        VALUES ($1, $2, ST_GeomFromText($3, 4326), TRUE, $4)
        RETURNING id
        `,
        [department.id, dto.name.trim(), wkt, leaderId],
      );

      const newCrewId = crewRows[0].id;

      if (dto.workerIds && dto.workerIds.length > 0) {
        await manager.query(
          `
          UPDATE department_workers
          SET crew_id = $1
          WHERE id = ANY($2::uuid[])
            AND department_id = $3
            AND is_active = TRUE
          `,
          [newCrewId, dto.workerIds, department.id],
        );
      }

      return newCrewId;
    });

    const all = await this.listCrews(user, { departmentId: department.id });
    const created = all.find((c) => c.id === createdCrewId);
    if (!created) {
      throw new NotFoundException('No se pudo recuperar la cuadrilla creada.');
    }

    await this.notificationsService.createInApp({
      userId: created.leader.id,
      title: `Bienvenido a ${created.name}`,
      message: `Tu acceso de operador (${created.leader.email}) quedó activo en ${department.name} con ${created.workers.length} trabajador(es) asignado(s).`,
      type: 'CREW_ASSIGNED',
    });

    await this.notificationsService.createInApp({
      departmentId: department.id,
      title: `Nueva flotilla registrada · ${created.name}`,
      message: `Responsable: ${created.leader.firstName} ${created.leader.lastName} (${created.leader.email}).`,
      type: 'CREW_CREATED',
    });

    return created;
  }

  async listDepartmentWorkers(
    user: AuthenticatedUser,
    requestedDepartmentId?: string,
  ): Promise<CrewWorkerItem[]> {
    const deptId =
      user.role === 'ROLE_SUPERVISOR'
        ? user.departmentId
        : requestedDepartmentId || null;

    const params: unknown[] = [];
    const where: string[] = ['w.is_active = TRUE'];
    if (deptId) {
      params.push(deptId);
      where.push(`w.department_id = $${params.length}`);
    }

    const rows = await this.dataSource.query<
      Array<{
        id: string;
        employee_code: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        position: string;
        crew_id: string | null;
        crew_name: string | null;
        department_id: string;
        department_code: string;
      }>
    >(
      `
      SELECT
        w.id,
        w.employee_code,
        w.first_name,
        w.last_name,
        w.phone,
        w.position,
        w.crew_id,
        fc.name AS crew_name,
        w.department_id,
        d.code AS department_code
      FROM department_workers w
      JOIN departments d ON d.id = w.department_id
      LEFT JOIN field_crews fc ON fc.id = w.crew_id
      WHERE ${where.join(' AND ')}
      ORDER BY (w.crew_id IS NOT NULL) ASC, w.employee_code ASC
      `,
      params,
    );

    return rows.map((w) => ({
      id: w.id,
      employeeCode: w.employee_code,
      firstName: w.first_name,
      lastName: w.last_name,
      phone: w.phone,
      position: w.position,
      crewId: w.crew_id,
      crewName: w.crew_name,
      departmentId: w.department_id,
      departmentCode: w.department_code,
    }));
  }

  async assignWorkersToCrew(
    crewId: string,
    workerIds: string[],
    user: AuthenticatedUser,
  ): Promise<CrewView> {
    const crew = await this.crewsRepo.findOne({ where: { id: crewId } });
    if (!crew) {
      throw new NotFoundException('Flotilla operativa no encontrada.');
    }

    if (
      user.role === 'ROLE_SUPERVISOR' &&
      crew.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'No puedes modificar trabajadores de una flotilla de otra dependencia.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Desasignar trabajadores previos de esta flotilla que ya no estén seleccionados
      await manager.query(
        `
        UPDATE department_workers
        SET crew_id = NULL
        WHERE crew_id = $1
          AND department_id = $2
        `,
        [crew.id, crew.departmentId],
      );

      // Asignar los trabajadores seleccionados pertenecientes a la misma dependencia
      if (workerIds.length > 0) {
        await manager.query(
          `
          UPDATE department_workers
          SET crew_id = $1
          WHERE id = ANY($2::uuid[])
            AND department_id = $3
            AND is_active = TRUE
          `,
          [crew.id, workerIds, crew.departmentId],
        );
      }
    });

    const all = await this.listCrews(user, { departmentId: crew.departmentId });
    const updated = all.find((c) => c.id === crew.id);
    if (!updated) {
      throw new NotFoundException('Flotilla no encontrada tras actualizar.');
    }

    await this.notificationsService.createInApp({
      userId: updated.leader.id,
      title: `Personal actualizado · ${updated.name}`,
      message: `Se asignaron ${updated.workers.length} trabajador(es) a tu flotilla operativa.`,
      type: 'CREW_UPDATED',
    });

    return updated;
  }

  private getLockedOperatorDomain(departmentCode: string): string {
    switch (departmentCode.toUpperCase()) {
      case 'SIM':
        return 'operador.simas.com.mx';
      case 'OLA':
        return 'operador.laola.com.mx';
      case 'OBP':
        return 'operador.obraspublicas.com.mx';
      default:
        return `operador.${departmentCode.toLowerCase()}.com.mx`;
    }
  }

  async updateCrew(
    crewId: string,
    dto: UpdateCrewDto,
    user: AuthenticatedUser,
  ): Promise<CrewView> {
    const crew = await this.crewsRepo.findOne({ where: { id: crewId } });
    if (!crew) {
      throw new NotFoundException('Flotilla operativa no encontrada.');
    }

    if (
      user.role === 'ROLE_SUPERVISOR' &&
      crew.departmentId !== user.departmentId
    ) {
      throw new ForbiddenException(
        'No puedes editar flotillas de otra dependencia.',
      );
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (dto.name !== undefined) {
      params.push(dto.name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (dto.isActive !== undefined) {
      params.push(dto.isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (dto.polygonCoordinates) {
      const wkt = this.buildPolygonWkt(dto.polygonCoordinates);
      params.push(wkt);
      updates.push(`coverage_polygon = ST_GeomFromText($${params.length}, 4326)`);
    }

    if (updates.length > 0) {
      params.push(crewId);
      await this.dataSource.query(
        `UPDATE field_crews SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params,
      );
    }

    const all = await this.listCrews(user, { departmentId: crew.departmentId });
    const updated = all.find((c) => c.id === crewId);
    if (!updated) {
      throw new NotFoundException('Flotilla no encontrada tras actualización.');
    }
    return updated;
  }

  private buildPolygonWkt(points: PolygonPointDto[]): string {
    if (!points || points.length < 3) {
      throw new BadRequestException(
        'El polígono de cobertura requiere al menos 3 vértices.',
      );
    }
    const ring = [...points];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
      ring.push(first);
    }
    const coordsText = ring.map((p) => `${p.lng} ${p.lat}`).join(', ');
    return `POLYGON((${coordsText}))`;
  }

  private parseGeoJsonPolygon(
    geojsonStr: string | null,
  ): Array<{ lat: number; lng: number }> {
    if (!geojsonStr) return [];
    try {
      const parsed = JSON.parse(geojsonStr) as {
        coordinates?: number[][][];
      };
      const ring = parsed.coordinates?.[0];
      if (!Array.isArray(ring)) return [];
      return ring.map(([lng, lat]) => ({ lat, lng }));
    } catch {
      return [];
    }
  }
}
