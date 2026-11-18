import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    createdAt: Date;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo electrónico.',
      );
    }

    const citizenRole = await this.rolesRepository.findOne({
      where: { name: 'ROLE_CITIZEN' },
    });

    if (!citizenRole) {
      this.logger.error('El rol ROLE_CITIZEN no existe en la tabla roles.');
      throw new InternalServerErrorException(
        'Error de configuración: el rol ciudadano no está disponible.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = this.usersRepository.create({
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim() || null,
      roleId: citizenRole.id,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(newUser);
    this.logger.log(`Nuevo usuario ciudadano registrado: ${savedUser.email}`);

    return {
      message: 'Cuenta ciudadana creada correctamente.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        phone: savedUser.phone,
        role: citizenRole.name,
        createdAt: savedUser.createdAt,
      },
    };
  }
}
