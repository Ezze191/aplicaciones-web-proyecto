import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryReportsDto {
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsEnum([
    'REGISTRADO',
    'VALIDADO',
    'ASIGNADO',
    'EN_PROCESO',
    'RESUELTO',
    'RECHAZADO',
  ])
  status?: string;

  @IsOptional()
  @IsEnum(['nuevos', 'asignados', 'en_reparacion', 'resueltos', 'rechazados'])
  kanbanStatus?: string;

  @IsOptional()
  @IsEnum(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'])
  riskLevel?: string;

  @IsOptional()
  @IsEnum(['a_tiempo', 'en_riesgo', 'critico'])
  slaStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minUpvotes?: number;

  @IsOptional()
  @IsString()
  crewId?: string;

  @IsOptional()
  @IsString()
  colonia?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(50000)
  radiusMeters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}
