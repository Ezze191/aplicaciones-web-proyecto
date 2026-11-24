import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { ReportCategoryEntity } from '../catalogs/entities/report-category.entity';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { CitizenUpvoteEntity } from './entities/citizen-upvote.entity';
import { IncidentReportEntity } from './entities/incident-report.entity';
import { PhotographicEvidenceEntity } from './entities/photographic-evidence.entity';
import { ReportStatusHistoryEntity } from './entities/report-status-history.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidentReportEntity,
      ReportStatusHistoryEntity,
      CitizenUpvoteEntity,
      PhotographicEvidenceEntity,
      ReportCategoryEntity,
      DepartmentEntity,
      FieldCrewEntity,
      UserEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService, TypeOrmModule],
})
export class ReportsModule {}
