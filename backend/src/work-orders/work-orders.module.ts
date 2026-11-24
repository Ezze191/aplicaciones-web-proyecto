import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { IncidentReportEntity } from '../reports/entities/incident-report.entity';
import { WorkOrderEntity } from './entities/work-order.entity';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrderEntity,
      FieldCrewEntity,
      IncidentReportEntity,
    ]),
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService, TypeOrmModule],
})
export class WorkOrdersModule {}
