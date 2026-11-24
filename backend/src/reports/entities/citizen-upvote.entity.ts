import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentReportEntity } from './incident-report.entity';

@Entity({ name: 'citizen_upvotes' })
export class CitizenUpvoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @ManyToOne(() => IncidentReportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: IncidentReportEntity;

  @Column({ name: 'device_or_user_id', type: 'varchar', length: 100 })
  deviceOrUserId!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
