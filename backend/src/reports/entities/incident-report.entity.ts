import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { DepartmentEntity } from '../../catalogs/entities/department.entity';
import { ReportCategoryEntity } from '../../catalogs/entities/report-category.entity';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
export type ReportStatusEnum =
  | 'REGISTRADO'
  | 'VALIDADO'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'RESUELTO'
  | 'RECHAZADO';

@Entity({ name: 'incident_reports' })
export class IncidentReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 25, unique: true })
  folio!: string;

  @Column({ name: 'citizen_id', type: 'uuid', nullable: true, default: null })
  citizenId!: string | null;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'citizen_id' })
  citizen?: UserEntity;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId!: string;

  @ManyToOne(() => DepartmentEntity, { eager: false })
  @JoinColumn({ name: 'department_id' })
  department?: DepartmentEntity;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ReportCategoryEntity, { eager: false })
  @JoinColumn({ name: 'category_id' })
  category?: ReportCategoryEntity;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    length: 20,
    default: 'MEDIO',
  })
  riskLevel!: RiskLevel;

  @Column({
    name: 'current_status',
    type: 'varchar',
    length: 25,
    default: 'REGISTRADO',
  })
  currentStatus!: ReportStatusEnum;

  @Column({
    name: 'location_geom',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    select: false,
  })
  locationGeom?: unknown;

  @Column({ name: 'address_reference', type: 'varchar', length: 255 })
  addressReference!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'upvotes_count', type: 'integer', default: 1 })
  upvotesCount!: number;

  @Column({
    name: 'master_report_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  masterReportId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({
    name: 'resolved_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  resolvedAt!: Date | null;
}
