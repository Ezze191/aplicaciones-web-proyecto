import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @IsUUID('4', { message: 'Debes seleccionar una categoría válida.' })
  categoryId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de dependencia debe ser un UUID válido.' })
  departmentId?: string;

  @IsOptional()
  @IsEnum(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'], {
    message: 'Nivel de riesgo inválido (BAJO, MEDIO, ALTO, CRITICO).',
  })
  riskLevel?: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

  @Type(() => Number)
  @IsLatitude({ message: 'Latitud GPS inválida.' })
  lat!: number;

  @Type(() => Number)
  @IsLongitude({ message: 'Longitud GPS inválida.' })
  lng!: number;

  @IsString()
  @IsNotEmpty({ message: 'La referencia de dirección es obligatoria.' })
  @MaxLength(255)
  addressReference!: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del problema es obligatoria.' })
  @MaxLength(2000)
  description!: string;

  @IsString()
  @IsNotEmpty({ message: 'La fotografía inicial de evidencia es obligatoria.' })
  @MaxLength(500)
  imageUrl!: string;

  @IsOptional()
  @IsUUID('4')
  masterReportId?: string;
}
