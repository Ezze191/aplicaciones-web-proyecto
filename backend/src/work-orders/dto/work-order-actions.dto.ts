import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StartWorkOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ResolveWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'La fotografía de cierre tomada con cámara es obligatoria.' })
  @MaxLength(500)
  imageUrl!: string;

  @Type(() => Number)
  @IsLatitude({ message: 'Latitud GPS de verificación inválida.' })
  lat!: number;

  @Type(() => Number)
  @IsLongitude({ message: 'Longitud GPS de verificación inválida.' })
  lng!: number;

  @IsIn(['CAMERA'], {
    message: 'La evidencia de cierre debe ser capturada en tiempo real con la cámara.',
  })
  captureSource!: 'CAMERA';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fieldNotes?: string;
}
