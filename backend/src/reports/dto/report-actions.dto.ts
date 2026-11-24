import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignReportDto {
  @IsUUID('4', { message: 'Debes seleccionar una cuadrilla válida.' })
  crewId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Debes indicar el motivo formal del rechazo.' })
  @MaxLength(1000)
  reason!: string;
}

export class UpdateReportStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: 'REGISTRADO' | 'VALIDADO' | 'ASIGNADO' | 'EN_PROCESO' | 'RESUELTO' | 'RECHAZADO';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpvoteReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}
