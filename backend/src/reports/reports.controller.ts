import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CheckDuplicatesDto } from './dto/check-duplicates.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  AssignReportDto,
  RejectReportDto,
  UpdateReportStatusDto,
  UpvoteReportDto,
} from './dto/report-actions.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Post('check-duplicates')
  checkDuplicates(@Body() dto: CheckDuplicatesDto) {
    return this.reportsService.checkDuplicates(dto);
  }

  @Public()
  @Post()
  create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.reportsService.createReport(dto, user);
  }

  @Public()
  @Get()
  list(
    @Query() query: QueryReportsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.reportsService.listReports(query, user);
  }

  @Get('my')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.listMyReports(user);
  }

  @Public()
  @Get('folio/:folio')
  getByFolio(@Param('folio') folio: string) {
    return this.reportsService.getByFolio(folio);
  }

  @Public()
  @Post(':id/upvote')
  upvote(
    @Param('id') id: string,
    @Body() dto: UpvoteReportDto,
    @Req() req: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ||
      req.ip ||
      '127.0.0.1';
    return this.reportsService.upvoteReport(id, dto, user, ip.trim());
  }

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.assignCrew(id, dto, user);
  }

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.rejectReport(id, dto, user);
  }

  @Roles('ROLE_ADMIN', 'ROLE_SUPERVISOR')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.updateStatus(id, dto, user);
  }
}
