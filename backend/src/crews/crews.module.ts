import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { CrewsController } from './crews.controller';
import { CrewsService } from './crews.service';
import { FieldCrewEntity } from './entities/field-crew.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FieldCrewEntity,
      UserEntity,
      RoleEntity,
      DepartmentEntity,
    ]),
  ],
  controllers: [CrewsController],
  providers: [CrewsService],
  exports: [CrewsService, TypeOrmModule],
})
export class CrewsModule {}
