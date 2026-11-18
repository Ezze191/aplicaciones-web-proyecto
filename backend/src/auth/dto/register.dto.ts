import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  firstName!: string;

  @IsString({ message: 'Los apellidos deben ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @MaxLength(100, {
    message: 'Los apellidos no pueden exceder 100 caracteres.',
  })
  lastName!: string;

  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @MaxLength(255, { message: 'El correo no puede exceder 255 caracteres.' })
  email!: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto.' })
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres.' })
  phone?: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres.',
  })
  password!: string;
}
