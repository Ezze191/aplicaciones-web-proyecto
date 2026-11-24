import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CatalogsService } from './catalogs.service';

@ApiTags('Catalogs')
@Public()
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('departments')
  getDepartments() {
    return this.catalogsService.getDepartments();
  }

  @Get('categories')
  getCategories(@Query('departmentId') departmentId?: string) {
    return this.catalogsService.getCategories(departmentId);
  }

  @Get('colonias')
  getColonias() {
    return this.catalogsService.getColonias();
  }
}
