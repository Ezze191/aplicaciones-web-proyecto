import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'departments' })
export class DepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'icon_name', type: 'varchar', length: 50 })
  iconName!: string;

  @Column({ name: 'color_hex', type: 'varchar', length: 7 })
  colorHex!: string;

  @Column({ name: 'default_sla_hours', type: 'integer', default: 48 })
  defaultSlaHours!: number;
}
