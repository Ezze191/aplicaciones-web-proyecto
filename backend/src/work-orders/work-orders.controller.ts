import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ResolveWorkOrderDto,
  StartWorkOrderDto,
} from './dto/work-order-actions.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('WorkOrders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Roles('ROLE_CREW', 'ROLE_ADMIN')
  @Get('my')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
  ) {
    return this.workOrdersService.listMyWorkOrders(user, {
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      sort,
    });
  }

  @Roles('ROLE_CREW', 'ROLE_ADMIN')
  @Post(':id/start')
  start(
    @Param('id') id: string,
    @Body() dto: StartWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.startWorkOrder(id, dto, user);
  }

  @Roles('ROLE_CREW', 'ROLE_ADMIN')
  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workOrdersService.resolveWorkOrder(id, dto, user);
  }
}
