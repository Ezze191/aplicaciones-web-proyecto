import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DepartmentEntity } from './department.entity';

@Entity({ name: 'report_categories' })
export class ReportCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId!: string;

  @ManyToOne(() => DepartmentEntity, (dept) => dept.categories)
  @JoinColumn({ name: 'department_id' })
  department?: DepartmentEntity;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'priority_weight', type: 'integer', default: 1 })
  priorityWeight!: number;
}
