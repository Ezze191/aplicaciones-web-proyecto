import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentReportEntity } from './incident-report.entity';

export type EvidenceStage = 'ANTES' | 'DESPUES';

@Entity({ name: 'photographic_evidences' })
export class PhotographicEvidenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @ManyToOne(() => IncidentReportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: IncidentReportEntity;

  @Column({ type: 'varchar', length: 15 })
  stage!: EvidenceStage;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({
    name: 'capture_coords',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    select: false,
  })
  captureCoords?: unknown;

  @Column({ name: 'verified_in_situ', type: 'boolean', default: false })
  verifiedInSitu!: boolean;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;
}
