import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FieldCrewEntity } from '../../crews/entities/field-crew.entity';
import { IncidentReportEntity } from '../../reports/entities/incident-report.entity';

export type WorkOrderStatus =
  | 'ASIGNADA'
  | 'EN_RUTA'
  | 'EN_SITIO'
  | 'FINALIZADA';

@Entity({ name: 'work_orders' })
export class WorkOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_folio', type: 'varchar', length: 30, unique: true })
  orderFolio!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @ManyToOne(() => IncidentReportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: IncidentReportEntity;

  @Column({ name: 'crew_id', type: 'uuid' })
  crewId!: string;

  @ManyToOne(() => FieldCrewEntity)
  @JoinColumn({ name: 'crew_id' })
  crew?: FieldCrewEntity;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'sla_deadline', type: 'timestamptz' })
  slaDeadline!: Date;

  @Column({ type: 'varchar', length: 25, default: 'ASIGNADA' })
  status!: WorkOrderStatus;

  @Column({ name: 'field_notes', type: 'text', nullable: true, default: null })
  fieldNotes!: string | null;
}
