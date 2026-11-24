import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId!: string | null;

  @Column({
    name: 'department_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  departmentId!: string | null;

  @Column({ name: 'report_id', type: 'uuid', nullable: true, default: null })
  reportId!: string | null;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 30, default: 'INFO' })
  type!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
