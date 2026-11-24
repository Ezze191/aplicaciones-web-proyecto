import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './entities/department.entity';
import { ReportCategoryEntity } from './entities/report-category.entity';

export const TORREON_COLONIAS = [
  'Centro',
  'Primero de Cobián Centro',
  'Navarro',
  'Ampliación Los Ángeles',
  'Campestre La Rosita',
  'Diagonal de las Fuentes',
  'Fuentes del Sur',
  'Nuevo Torreón',
  'Las Etnias',
  'Roma',
  'Senderos',
  'Sol de Oriente',
  'Viñedos',
  'Residencial del Norte',
  'Las Torres',
  'San Antonio',
  'Jacarandas',
];

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departmentsRepo: Repository<DepartmentEntity>,
    @InjectRepository(ReportCategoryEntity)
    private readonly categoriesRepo: Repository<ReportCategoryEntity>,
  ) {}

  async getDepartments() {
    return this.departmentsRepo.find({
      relations: { categories: true },
      order: { name: 'ASC' },
    });
  }

  async getCategories(departmentId?: string) {
    const where = departmentId ? { departmentId } : {};
    return this.categoriesRepo.find({
      where,
      relations: { department: true },
      order: { priorityWeight: 'DESC', name: 'ASC' },
    });
  }

  getColonias() {
    return TORREON_COLONIAS;
  }
}
