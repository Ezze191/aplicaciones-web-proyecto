import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { IncidentReportEntity } from './incident-report.entity';

@Entity({ name: 'report_status_history' })
export class ReportStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @ManyToOne(() => IncidentReportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: IncidentReportEntity;

  @Column({ name: 'previous_status', type: 'varchar', length: 25 })
  previousStatus!: string;

  @Column({ name: 'new_status', type: 'varchar', length: 25 })
  newStatus!: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser?: UserEntity;

  @Column({ type: 'text', nullable: true, default: null })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
