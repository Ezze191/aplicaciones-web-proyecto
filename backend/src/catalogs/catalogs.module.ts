import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { DepartmentEntity } from './entities/department.entity';
import { ReportCategoryEntity } from './entities/report-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentEntity, ReportCategoryEntity])],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService, TypeOrmModule],
})
export class CatalogsModule {}
