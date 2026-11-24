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
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { DepartmentEntity } from '../catalogs/entities/department.entity';
import { FieldCrewEntity } from '../crews/entities/field-crew.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getDashboardRedirectPath,
  getRoleLabel,
  isInstitutionalRole,
  normalizeRoleName,
  RoleLabel,
  UserRole,
} from './constants/roles.constants';
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
import { JwtPayload, JwtTokenService } from './jwt-token.service';

export interface AuthDepartmentSummary {
  id: string;
  code: string;
  name: string;
  iconName: string;
  colorHex: string;
  defaultSlaHours: number;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  roleLabel: RoleLabel;
  permissions: string[];
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  department: AuthDepartmentSummary | null;
  crewId: string | null;
  crewName: string | null;
  createdAt: Date;
}

export interface RegisterResponse {
  message: string;
  accessToken?: string;
  tokenType?: 'Bearer';
  expiresIn?: number;
  expiresAt?: string;
  redirectTo: string;
  user: AuthUserSummary;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
  redirectTo: string;
  user: AuthUserSummary;
}

export interface RoleSummary {
  id: string;
  name: string;
  label: RoleLabel;
  description: string;
  permissions: string[];
}

const INSTITUTIONAL_ROLES = new Set([
  'ROLE_ADMIN',
  'ROLE_SUPERVISOR',
  'ROLE_CREW',
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly activeInstitutionalSessions = new Map<string, string>();
  private readonly revokedTokenJtis = new Set<string>();

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
    @Optional()
    private readonly jwtTokenService?: JwtTokenService,
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
      where: { name: UserRole.CITIZEN },
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
      departmentId: null,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(newUser);
    this.logger.log(`Nuevo usuario ciudadano registrado: ${savedUser.email}`);

    const permissions = this.normalizePermissions(citizenRole.permissions);
    const summary = await this.buildUserSummary(
      savedUser,
      UserRole.CITIZEN,
      null,
      permissions,
      null,
    );

    const tokenBundle = await this.signSessionToken({
      sub: savedUser.id,
      email: savedUser.email,
      role: UserRole.CITIZEN,
      permissions,
      departmentId: null,
      departmentCode: null,
      sessionId: null,
    });

    return {
      message: 'Cuenta ciudadana creada correctamente.',
      ...(tokenBundle
        ? {
            accessToken: tokenBundle.accessToken,
            tokenType: 'Bearer' as const,
            expiresIn: tokenBundle.expiresIn,
            expiresAt: tokenBundle.expiresAt,
          }
        : {}),
      redirectTo: '/dashboard-ciudadano',
      user: summary,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      relations: { role: true, department: true },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Esta cuenta se encuentra deshabilitada. Contacta al administrador.',
      );
    }

    const { roleName, effectiveDepartmentId, redirectTo, departmentEntity } =
      await this.resolveUserAccessContext(user);

    const normalizedRole = normalizeRoleName(roleName);
    if (!normalizedRole) {
      this.logger.error(
        `El usuario ${user.id} tiene un rol inválido o inexistente (${roleName}).`,
      );
      throw new InternalServerErrorException(
        'El usuario no tiene un rol válido asignado.',
      );
    }

    let sessionId: string | null = null;
    if (INSTITUTIONAL_ROLES.has(normalizedRole)) {
      sessionId = randomUUID();
      user.activeSessionId = sessionId;
      await this.usersRepository.save(user);
    }

    const permissions = this.normalizePermissions(user.role?.permissions);
    const summary = await this.buildUserSummary(
      user,
      normalizedRole,
      effectiveDepartmentId,
      permissions,
      departmentEntity,
    );

    const tokenBundle = await this.signSessionToken({
      sub: user.id,
      email: user.email,
      role: normalizedRole,
      permissions,
      departmentId: effectiveDepartmentId,
      departmentCode: summary.departmentCode,
      sessionId,
    });

    if (!tokenBundle) {
      throw new InternalServerErrorException(
        'Servicio de tokens JWT no inicializado.',
      );
    }

    return {
      message: `Bienvenido(a), ${user.firstName}.`,
      accessToken: tokenBundle.accessToken,
      tokenType: 'Bearer',
      expiresIn: tokenBundle.expiresIn,
      expiresAt: tokenBundle.expiresAt,
      redirectTo,
      user: summary,
    };
  }

  /**
   * Valida la firma/expiración del JWT (vía JwtTokenService) y verifica revocación o sesión única institucional.
   */
  validateTokenAndSession(token: string): JwtPayload {
    if (!this.jwtTokenService) {
      throw new InternalServerErrorException('JwtTokenService no inicializado.');
    }

    const payload = this.jwtTokenService.verify(token);

    if (this.revokedTokenJtis.has(payload.jti)) {
      throw new UnauthorizedException('La sesión ya fue cerrada.');
    }

    if (
      isInstitutionalRole(payload.role) &&
      this.activeInstitutionalSessions.has(payload.sub) &&
      this.activeInstitutionalSessions.get(payload.sub) !== payload.jti
    ) {
      throw new UnauthorizedException(
        'Sesión invalidada: se inició una nueva sesión activa en otro dispositivo.',
      );
    }

    return payload;
  }

  async logout(
    userOrPayload: string | JwtPayload,
  ): Promise<{ message: string }> {
    const userId =
      typeof userOrPayload === 'string' ? userOrPayload : userOrPayload.sub;

    if (typeof userOrPayload !== 'string' && userOrPayload.jti) {
      this.revokedTokenJtis.add(userOrPayload.jti);
      if (this.activeInstitutionalSessions.get(userId) === userOrPayload.jti) {
        this.activeInstitutionalSessions.delete(userId);
      }
    } else {
      this.activeInstitutionalSessions.delete(userId);
    }

    if (typeof this.usersRepository.update === 'function') {
      await this.usersRepository.update(
        { id: userId },
        { activeSessionId: null },
      );
    }

    return { message: 'Sesión cerrada correctamente.' };
  }

  async getProfile(userId: string): Promise<AuthUserSummary> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { role: true, department: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Esta cuenta se encuentra deshabilitada. Contacta al administrador.',
      );
    }

    const { roleName, effectiveDepartmentId, departmentEntity } =
      await this.resolveUserAccessContext(user);
    const permissions = this.normalizePermissions(user.role?.permissions);

    return this.buildUserSummary(
      user,
      roleName,
      effectiveDepartmentId,
      permissions,
      departmentEntity,
    );
  }

  async getProfileWithRedirect(
    userOrPayload: string | JwtPayload,
  ): Promise<{ user: AuthUserSummary; redirectTo: string }> {
    const userId =
      typeof userOrPayload === 'string' ? userOrPayload : userOrPayload.sub;
    const summary = await this.getProfile(userId);
    const normalizedRole = normalizeRoleName(summary.role) ?? UserRole.CITIZEN;

    return {
      user: summary,
      redirectTo: getDashboardRedirectPath(normalizedRole),
    };
  }

  async listRoles(): Promise<RoleSummary[]> {
    const roles = await this.rolesRepository.find({
      order: { name: 'ASC' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      label: getRoleLabel(role.name),
      description: role.description,
      permissions: this.normalizePermissions(role.permissions),
    }));
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

  private async signSessionToken(params: {
    sub: string;
    email: string;
    role: UserRole;
    permissions: string[];
    departmentId: string | null;
    departmentCode: string | null;
    sessionId: string | null;
  }): Promise<{
    accessToken: string;
    expiresIn: number;
    expiresAt: string;
  } | null> {
    const jti = params.sessionId ?? randomUUID();
    if (isInstitutionalRole(params.role)) {
      this.activeInstitutionalSessions.set(params.sub, jti);
    }

    const roleLabel = getRoleLabel(params.role);

    if (this.jwtService) {
      const accessToken = await this.jwtService.signAsync({
        sub: params.sub,
        email: params.email,
        role: params.role,
        roleLabel,
        permissions: params.permissions,
        departmentId: params.departmentId,
        departmentCode: params.departmentCode,
        sessionId: params.sessionId,
        jti,
      });

      const { expiresIn, expiresAt } = this.extractTokenTiming(accessToken);
      return { accessToken, expiresIn, expiresAt };
    }

    if (this.jwtTokenService) {
      const signed = this.jwtTokenService.sign({
        sub: params.sub,
        email: params.email,
        role: params.role,
        roleLabel,
        permissions: params.permissions,
        departmentId: params.departmentId,
        departmentCode: params.departmentCode,
        jti,
      });
      return {
        accessToken: signed.accessToken,
        expiresIn: signed.expiresIn,
        expiresAt: signed.expiresAt,
      };
    }

    return null;
  }

  private extractTokenTiming(token: string): {
    expiresIn: number;
    expiresAt: string;
  } {
    const decoded = this.jwtService?.decode(token) as
      | { exp?: number; iat?: number }
      | null;
    if (decoded && typeof decoded.exp === 'number') {
      const iat =
        typeof decoded.iat === 'number'
          ? decoded.iat
          : Math.floor(Date.now() / 1000);
      return {
        expiresIn: Math.max(0, decoded.exp - iat),
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      };
    }
    return {
      expiresIn: 1800,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  private async resolveUserAccessContext(user: UserEntity): Promise<{
    roleName: string;
    effectiveDepartmentId: string | null;
    redirectTo: string;
    departmentEntity: DepartmentEntity | null;
  }> {
    const domainRule = resolveInstitutionalDomain(user.email);
    if (domainRule) {
      let effectiveDepartmentId = user.departmentId;
      let departmentEntity: DepartmentEntity | null = user.department ?? null;
      if (this.departmentsRepository) {
        const dept = await this.departmentsRepository.findOne({
          where: { code: domainRule.departmentCode },
        });
        if (dept) {
          effectiveDepartmentId = dept.id;
          departmentEntity = dept;
        }
      }
      return {
        roleName: domainRule.roleName,
        effectiveDepartmentId,
        redirectTo: domainRule.redirectTo,
        departmentEntity,
      };
    }

    const roleName = user.role?.name ?? '';
    return {
      roleName,
      effectiveDepartmentId: user.departmentId,
      redirectTo: this.resolveRedirectPath(roleName),
      departmentEntity: user.department ?? null,
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
    permissions: string[] = [],
    preloadedDepartment: DepartmentEntity | null = user.department ?? null,
  ): Promise<AuthUserSummary> {
    let department: DepartmentEntity | null = preloadedDepartment;
    let crewId: string | null = null;
    let crewName: string | null = null;

    if (!department && effectiveDepartmentId && this.departmentsRepository) {
      department = await this.departmentsRepository.findOne({
        where: { id: effectiveDepartmentId },
      });
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
      phone: user.phone ?? null,
      role: roleName,
      roleLabel: getRoleLabel(roleName),
      permissions,
      departmentId: department?.id ?? effectiveDepartmentId ?? null,
      departmentCode: department?.code ?? null,
      departmentName: department?.name ?? null,
      department: department
        ? {
            id: department.id,
            code: department.code,
            name: department.name,
            iconName: department.iconName,
            colorHex: department.colorHex,
            defaultSlaHours: department.defaultSlaHours,
          }
        : null,
      crewId,
      crewName,
      createdAt: user.createdAt,
    };
  }

  private normalizePermissions(rawPermissions: unknown): string[] {
    if (!Array.isArray(rawPermissions)) {
      return [];
    }
    return rawPermissions.filter(
      (item): item is string => typeof item === 'string',
    );
  }
}
