import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  isInstitutionalDomain,
  resolveInstitutionalDomain,
} from './domain-routing.util';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

export interface AuthUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  crewId: string | null;
  crewName: string | null;
  createdAt: Date;
}

export interface RegisterResponse {
  message: string;
  accessToken?: string;
  expiresAt?: string;
  user: AuthUserSummary;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  expiresAt: string;
  redirectTo: string;
  user: AuthUserSummary;
}

const INSTITUTIONAL_ROLES = new Set([
  'ROLE_ADMIN',
  'ROLE_SUPERVISOR',
  'ROLE_CREW',
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
    @Optional()
    private readonly jwtService?: JwtService,
    @Optional()
    @InjectRepository(DepartmentEntity)
    private readonly departmentsRepository?: Repository<DepartmentEntity>,
    @Optional()
    @InjectRepository(FieldCrewEntity)
    private readonly crewsRepository?: Repository<FieldCrewEntity>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    if (isInstitutionalDomain(normalizedEmail)) {
      throw new ForbiddenException(
        'Los correos con dominio institucional (@simas.com.mx, @operador.simas.com.mx, @laola.com.mx, @operador.laola.com.mx, @obraspublicas.com.mx, @operador.obraspublicas.com.mx) solo pueden ser dados de alta manualmente desde la base de datos.',
      );
    }

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

    const summary: AuthUserSummary = {
      id: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phone: savedUser.phone,
      role: citizenRole.name,
      departmentId: null,
      departmentCode: null,
      departmentName: null,
      crewId: null,
      crewName: null,
      createdAt: savedUser.createdAt,
    };

    const accessToken = this.jwtService
      ? await this.jwtService.signAsync({
          sub: savedUser.id,
          email: savedUser.email,
          role: citizenRole.name,
          departmentId: null,
          sessionId: null,
        })
      : undefined;

    const expiresAt = accessToken
      ? this.extractTokenExpiresAt(accessToken)
      : undefined;

    return {
      message: 'Cuenta ciudadana creada correctamente.',
      ...(accessToken ? { accessToken, expiresAt } : {}),
      user: summary,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    if (!this.jwtService) {
      throw new InternalServerErrorException('JwtService no inicializado.');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      relations: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Esta cuenta se encuentra deshabilitada. Contacta al administrador.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const { roleName, effectiveDepartmentId, redirectTo } =
      await this.resolveUserAccessContext(user);
    let sessionId: string | null = null;

    if (INSTITUTIONAL_ROLES.has(roleName)) {
      sessionId = crypto.randomUUID();
      user.activeSessionId = sessionId;
      await this.usersRepository.save(user);
    }

    const summary = await this.buildUserSummary(
      user,
      roleName,
      effectiveDepartmentId,
    );
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: roleName,
      departmentId: effectiveDepartmentId,
      sessionId,
    });

    const expiresAt = this.extractTokenExpiresAt(accessToken);

    return {
      message: `Bienvenido(a), ${user.firstName}.`,
      accessToken,
      expiresAt,
      redirectTo,
      user: summary,
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersRepository.update(
      { id: userId },
      { activeSessionId: null },
    );
    return { message: 'Sesión cerrada correctamente.' };
  }

  async getProfile(userId: string): Promise<AuthUserSummary> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    const { roleName, effectiveDepartmentId } =
      await this.resolveUserAccessContext(user);
    return this.buildUserSummary(user, roleName, effectiveDepartmentId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.resetToken = await bcrypt.hash(code, 8);
      user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await this.usersRepository.save(user);

      if (this.notificationsService) {
        await this.notificationsService.sendEventEmail('PASSWORD_RESET', {
          recipientEmail: user.email,
          recipientName: `${user.firstName} ${user.lastName}`,
          resetCode: code,
        });
      }
    }

    return {
      message:
        'Si el correo está registrado, enviamos un código de verificación válido por 30 minutos.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.resetToken ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El código de recuperación es inválido o ha expirado.',
      );
    }

    const codeMatches = await bcrypt.compare(dto.code.trim(), user.resetToken);
    if (!codeMatches) {
      throw new BadRequestException('Código de verificación incorrecto.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.activeSessionId = null;
    await this.usersRepository.save(user);

    return {
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    };
  }

  private extractTokenExpiresAt(token: string): string {
    const decoded = this.jwtService?.decode(token) as { exp?: number } | null;
    if (decoded && typeof decoded.exp === 'number') {
      return new Date(decoded.exp * 1000).toISOString();
    }
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }

  private async resolveUserAccessContext(user: UserEntity): Promise<{
    roleName: string;
    effectiveDepartmentId: string | null;
    redirectTo: string;
  }> {
    const domainRule = resolveInstitutionalDomain(user.email);
    if (domainRule) {
      let effectiveDepartmentId = user.departmentId;
      if (this.departmentsRepository) {
        const dept = await this.departmentsRepository.findOne({
          where: { code: domainRule.departmentCode },
        });
        if (dept) {
          effectiveDepartmentId = dept.id;
        }
      }
      return {
        roleName: domainRule.roleName,
        effectiveDepartmentId,
        redirectTo: domainRule.redirectTo,
      };
    }

    const roleName = user.role?.name ?? 'ROLE_CITIZEN';
    return {
      roleName,
      effectiveDepartmentId: user.departmentId,
      redirectTo: this.resolveRedirectPath(roleName),
    };
  }

  private resolveRedirectPath(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN':
      case 'ROLE_SUPERVISOR':
        return '/dashboard-admins';
      case 'ROLE_CREW':
        return '/dashboard-tecnicos';
      default:
        return '/dashboard-ciudadano';
    }
  }

  private async buildUserSummary(
    user: UserEntity,
    roleName: string,
    effectiveDepartmentId: string | null = user.departmentId,
  ): Promise<AuthUserSummary> {
    let departmentCode: string | null = null;
    let departmentName: string | null = null;
    let crewId: string | null = null;
    let crewName: string | null = null;

    if (effectiveDepartmentId && this.departmentsRepository) {
      const dept = await this.departmentsRepository.findOne({
        where: { id: effectiveDepartmentId },
      });
      if (dept) {
        departmentCode = dept.code;
        departmentName = dept.name;
      }
    }

    if (roleName === 'ROLE_CREW' && this.crewsRepository) {
      const crew = await this.crewsRepository.findOne({
        where: { leaderUserId: user.id },
      });
      if (crew) {
        crewId = crew.id;
        crewName = crew.name;
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: roleName,
      departmentId: effectiveDepartmentId,
      departmentCode,
      departmentName,
      crewId,
      crewName,
      createdAt: user.createdAt,
    };
  }
}
