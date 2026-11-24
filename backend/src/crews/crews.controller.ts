import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CrewsService } from './crews.service';
import { CreateCrewDto } from './dto/create-crew.dto';
import { UpdateCrewDto } from './dto/update-crew.dto';

@ApiTags('Crews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crews')
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_CREW')
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId') departmentId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.crewsService.listCrews(user, {
      departmentId,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });
  }

  @Roles('ROLE_CREW')
  @Get('my')
  getMyCrew(@CurrentUser() user: AuthenticatedUser) {
    return this.crewsService.getMyCrew(user);
  }

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Post()
  create(
    @Body() dto: CreateCrewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crewsService.createCrew(dto, user);
  }

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCrewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crewsService.updateCrew(id, dto, user);
  }
}
