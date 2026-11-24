import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { DepartmentEntity } from '../../catalogs/entities/department.entity';

@Entity({ name: 'field_crews' })
export class FieldCrewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId!: string;

  @ManyToOne(() => DepartmentEntity)
  @JoinColumn({ name: 'department_id' })
  department?: DepartmentEntity;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    name: 'coverage_polygon',
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    select: false,
  })
  coveragePolygon?: unknown;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'leader_user_id', type: 'uuid' })
  leaderUserId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'leader_user_id' })
  leaderUser?: UserEntity;
}
