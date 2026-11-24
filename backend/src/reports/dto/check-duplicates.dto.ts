import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CheckDuplicatesDto {
  @Type(() => Number)
  @IsLatitude({ message: 'Latitud inválida.' })
  lat!: number;

  @Type(() => Number)
  @IsLongitude({ message: 'Longitud inválida.' })
  lng!: number;

  @IsUUID('4', { message: 'El ID de categoría debe ser un UUID válido.' })
  categoryId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(500)
  radiusMeters?: number;
}
