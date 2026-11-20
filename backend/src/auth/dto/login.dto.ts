import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @MaxLength(255, { message: 'El correo no puede exceder 255 caracteres.' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres.',
  })
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres.',
  })
  password!: string;
}
