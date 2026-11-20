import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  getDashboardRedirectPath,
  getRoleLabel,
  isInstitutionalRole,
  normalizeRoleName,
  RoleLabel,
  UserRole,
} from './constants/roles.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { DepartmentEntity } from './entities/department.entity';
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
  role: UserRole;
  roleLabel: RoleLabel;
  permissions: string[];
  departmentId: string | null;
  department: AuthDepartmentSummary | null;
  createdAt: Date;
}

export interface AuthTokenResponse {
  message: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
  redirectTo: string;
  user: AuthUserSummary;
}

export type RegisterResponse = AuthTokenResponse;
export type LoginResponse = AuthTokenResponse;

export interface RoleSummary {
  id: string;
  name: string;
  label: RoleLabel;
  description: string;
  permissions: string[];
}

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
    private readonly jwtTokenService: JwtTokenService,
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
    return this.createAuthResponse(
      'Cuenta ciudadana creada correctamente.',
      savedUser,
      UserRole.CITIZEN,
      permissions,
      null,
    );
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
      relations: { role: true, department: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Credenciales inválidas. Verifica tu correo y contraseña.',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Esta cuenta se encuentra deshabilitada. Contacta al administrador.',
      );
    }

    const roleName = user.role?.name ? normalizeRoleName(user.role.name) : null;

    if (!roleName) {
      this.logger.error(
        `El usuario ${user.id} tiene un rol inválido o inexistente.`,
      );
      throw new InternalServerErrorException(
        'El usuario no tiene un rol válido asignado.',
      );
    }

    const permissions = this.normalizePermissions(user.role?.permissions);
    const department = user.department ?? null;

    return this.createAuthResponse(
      'Inicio de sesión exitoso.',
      user,
      roleName,
      permissions,
      department,
    );
  }

  /**
   * Valida la firma/expiración del JWT y verifica revocación o sesión única institucional.
   */
  validateTokenAndSession(token: string): JwtPayload {
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

  logout(payload: JwtPayload): { message: string } {
    this.revokedTokenJtis.add(payload.jti);

    if (this.activeInstitutionalSessions.get(payload.sub) === payload.jti) {
      this.activeInstitutionalSessions.delete(payload.sub);
    }

    this.logger.log(`Sesión cerrada para usuario: ${payload.email}`);
    return { message: 'Sesión cerrada correctamente.' };
  }

  async getProfile(
    payload: JwtPayload,
  ): Promise<{ user: AuthUserSummary; redirectTo: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: { role: true, department: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        'El usuario asociado al token no existe.',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Esta cuenta se encuentra deshabilitada. Contacta al administrador.',
      );
    }

    const roleName =
      (user.role?.name ? normalizeRoleName(user.role.name) : null) ??
      payload.role;
    const permissions = this.normalizePermissions(
      user.role?.permissions ?? payload.permissions,
    );
    const department = user.department ?? null;

    return {
      user: this.buildUserSummary(user, roleName, permissions, department),
      redirectTo: getDashboardRedirectPath(roleName),
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

  private createAuthResponse(
    message: string,
    user: UserEntity,
    roleName: UserRole,
    permissions: string[],
    department: DepartmentEntity | null,
  ): AuthTokenResponse {
    const jti = randomUUID();
    if (isInstitutionalRole(roleName)) {
      this.activeInstitutionalSessions.set(user.id, jti);
    }

    const roleLabel = getRoleLabel(roleName);
    const departmentId = department?.id ?? user.departmentId ?? null;
    const departmentCode = department?.code ?? null;

    const signed = this.jwtTokenService.sign({
      sub: user.id,
      email: user.email,
      role: roleName,
      roleLabel,
      permissions,
      departmentId,
      departmentCode,
      jti,
    });

    this.logger.log(
      `Sesión JWT emitida para ${user.email} (${roleLabel}${departmentCode ? ` - ${departmentCode}` : ''})`,
    );

    return {
      message,
      accessToken: signed.accessToken,
      tokenType: 'Bearer',
      expiresIn: signed.expiresIn,
      expiresAt: signed.expiresAt,
      redirectTo: getDashboardRedirectPath(roleName),
      user: this.buildUserSummary(user, roleName, permissions, department),
    };
  }

  private buildUserSummary(
    user: UserEntity,
    roleName: UserRole,
    permissions: string[],
    department: DepartmentEntity | null,
  ): AuthUserSummary {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      role: roleName,
      roleLabel: getRoleLabel(roleName),
      permissions,
      departmentId: department?.id ?? user.departmentId ?? null,
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
