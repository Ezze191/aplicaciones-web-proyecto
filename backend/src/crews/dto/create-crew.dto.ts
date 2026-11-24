import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PolygonPointDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class CreateCrewDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la flotilla es obligatorio.' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de dependencia debe ser un UUID válido.' })
  departmentId?: string;

  @IsArray()
  @ArrayMinSize(3, {
    message: 'Debes definir al menos 3 puntos en el mapa para delimitar la zona de cobertura.',
  })
  @ValidateNested({ each: true })
  @Type(() => PolygonPointDto)
  polygonCoordinates!: PolygonPointDto[];

  // Datos para crear las credenciales del jefe de cuadrilla
  @IsString()
  @IsNotEmpty({ message: 'El nombre del responsable es obligatorio.' })
  @MaxLength(100)
  leaderFirstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del responsable son obligatorios.' })
  @MaxLength(100)
  leaderLastName!: string;

  @IsEmail({}, { message: 'Ingresa un correo válido para el acceso de campo.' })
  leaderEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  leaderPhone?: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña de acceso de campo debe tener al menos 8 caracteres.',
  })
  @MaxLength(72)
  leaderPassword!: string;
}
