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
  Matches,
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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3, {
    message:
      'Si delimitas una zona en el mapa debes marcar al menos 3 puntos.',
  })
  @ValidateNested({ each: true })
  @Type(() => PolygonPointDto)
  polygonCoordinates?: PolygonPointDto[];

  // Datos para crear las credenciales del jefe de cuadrilla / operador
  @IsString()
  @IsNotEmpty({ message: 'El nombre del responsable es obligatorio.' })
  @MaxLength(100)
  leaderFirstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del responsable son obligatorios.' })
  @MaxLength(100)
  leaderLastName!: string;

  /** Nombre de usuario (antes del @). El dominio se bloquea automáticamente según la dependencia. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{2,64}$/, {
    message:
      'El nombre de usuario solo puede contener letras, números, puntos, guiones y guion bajo.',
  })
  leaderUsername?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Ingresa un correo válido para el acceso de campo.' })
  leaderEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  leaderPhone?: string;

  @IsString()
  @MinLength(8, {
    message:
      'La contraseña de acceso de campo debe tener al menos 8 caracteres.',
  })
  @MaxLength(72)
  leaderPassword!: string;

  /** IDs de trabajadores pre-registrados en department_workers para asignar a la flotilla */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  workerIds?: string[];
}

export class AssignCrewWorkersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  workerIds!: string[];
}
