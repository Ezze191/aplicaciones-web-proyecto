jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: class {},
}));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole } from './constants/roles.constants';
import {
  isInstitutionalDomain,
  resolveInstitutionalDomain,
} from './domain-routing.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { DepartmentEntity } from './entities/department.entity';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';
import { JwtTokenService } from './jwt-token.service';

describe('AuthService', () => {
  const citizenRole: RoleEntity = {
    id: 'role-citizen-1',
    name: UserRole.CITIZEN,
    description: 'Ciudadano',
    permissions: ['reports:create', 'reports:read', 'reports:upvote'],
  };

  const adminRole: RoleEntity = {
    id: 'role-admin-1',
    name: UserRole.ADMIN,
    description: 'Administrador General',
    permissions: ['*'],
  };

  const supervisorRole: RoleEntity = {
    id: 'role-supervisor-1',
    name: UserRole.SUPERVISOR,
    description: 'Supervisor de Dependencia',
    permissions: ['reports:read', 'reports:assign', 'kanban:write'],
  };

  const crewRole: RoleEntity = {
    id: 'role-crew-1',
    name: UserRole.CREW,
    description: 'Jefe de Cuadrilla',
    permissions: [
      'work_orders:read',
      'work_orders:resolve',
      'evidences:upload',
    ],
  };

  const simasDepartment: DepartmentEntity = {
    id: 'dept-simas-1',
    code: 'SIM',
    name: 'Sistema Municipal de Aguas y Saneamiento (SIMAS)',
    iconName: 'Droplets',
    colorHex: '#0284C7',
    defaultSlaHours: 24,
  };

  const createJwtService = () => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-siu-2026';
        if (key === 'JWT_EXPIRES_IN') return '2h';
        return defaultValue;
      }),
    } as unknown as ConfigService;
    return new JwtTokenService(configService);
  };

  const makeService = (overrides?: {
    existingUser?: Partial<UserEntity> | null;
    role?: RoleEntity | null;
    rolesList?: RoleEntity[];
  }) => {
    const usersRepo = {
      findOne: jest.fn().mockResolvedValue(overrides?.existingUser ?? null),
      create: jest.fn((data: Partial<UserEntity>) => ({
        id: 'user-uuid-1',
        createdAt: new Date('2026-11-17T00:00:00Z'),
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        ...data,
      })),
      save: jest.fn((user: UserEntity) => Promise.resolve(user)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const rolesRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          overrides && 'role' in overrides ? overrides.role : citizenRole,
        ),
      find: jest
        .fn()
        .mockResolvedValue(
          overrides?.rolesList ?? [
            adminRole,
            supervisorRole,
            crewRole,
            citizenRole,
          ],
        ),
    };

    const jwtTokenService = createJwtService();
    const service = new AuthService(
      usersRepo as never,
      rolesRepo as never,
      undefined,
      undefined,
      undefined,
      undefined,
      jwtTokenService,
    );

    return { service, usersRepo, rolesRepo, jwtTokenService };
  };

  const registerDto: RegisterDto = {
    firstName: 'Juan Carlos',
    lastName: 'Hernández Ayala',
    email: '  Juan@Correo.COM ',
    phone: '8711234567',
    password: 'Password123',
  };

  describe('register', () => {
    it('registers a new citizen with hashed password, normalized email and JWT', async () => {
      const { service, usersRepo, jwtTokenService } = makeService();

      const result = await service.register(registerDto);

      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'juan@correo.com' },
        select: { id: true },
      });
      expect(result.user.email).toBe('juan@correo.com');
      expect(result.user.role).toBe(UserRole.CITIZEN);
      expect(result.user.roleLabel).toBe('Ciudadano');
      expect(result.redirectTo).toBe('/dashboard-ciudadano');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(7200);
      expect(result.accessToken).toBeTruthy();
      expect(
        (result.user as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();

      const decoded = jwtTokenService.verify(result.accessToken!);
      expect(decoded.sub).toBe('user-uuid-1');
      expect(decoded.role).toBe(UserRole.CITIZEN);
      expect(decoded.permissions).toEqual(citizenRole.permissions);
    });

    it('throws ConflictException when email already exists', async () => {
      const { service } = makeService({ existingUser: { id: 'existing-1' } });

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws InternalServerErrorException when ROLE_CITIZEN is missing', async () => {
      const { service } = makeService({ role: null });

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('blocks public web registration for institutional domains', async () => {
      const { service } = makeService();

      await expect(
        service.register({ ...registerDto, email: 'jesus@simas.com.mx' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        service.register({
          ...registerDto,
          email: 'roberto@operador.laola.com.mx',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('login', () => {
    it('authenticates a citizen and returns dashboard-ciudadano redirect', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const user: UserEntity = {
        id: 'citizen-1',
        email: 'ciudadano@correo.com',
        passwordHash,
        firstName: 'Juan Carlos',
        lastName: 'Treviño Garza',
        phone: '8711000007',
        roleId: citizenRole.id,
        role: citizenRole,
        departmentId: null,
        department: null,
        isActive: true,
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        createdAt: new Date('2026-11-17T00:00:00Z'),
      };

      const { service } = makeService({ existingUser: user });
      const dto: LoginDto = {
        email: '  CIUDADANO@Correo.com ',
        password: 'Torreon2026!',
      };

      const result = await service.login(dto);

      expect(result.redirectTo).toBe('/dashboard-ciudadano');
      expect(result.user.role).toBe(UserRole.CITIZEN);
      expect(result.user.roleLabel).toBe('Ciudadano');
      expect(result.user.department).toBeNull();
    });

    it('authenticates a crew leader with department and dashboard-tecnicos redirect', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const user: UserEntity = {
        id: 'crew-1',
        email: 'cuadrilla04.simas@torreon.gob.mx',
        passwordHash,
        firstName: 'Roberto',
        lastName: 'Méndez Lara',
        phone: '8711000005',
        roleId: crewRole.id,
        role: crewRole,
        departmentId: simasDepartment.id,
        department: simasDepartment,
        isActive: true,
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        createdAt: new Date('2026-11-17T00:00:00Z'),
      };

      const { service } = makeService({ existingUser: user });
      const result = await service.login({
        email: 'cuadrilla04.simas@torreon.gob.mx',
        password: 'Torreon2026!',
      });

      expect(result.redirectTo).toBe('/dashboard-tecnicos');
      expect(result.user.role).toBe(UserRole.CREW);
      expect(result.user.roleLabel).toBe('Cuadrilla');
      expect(result.user.department?.code).toBe('SIM');
    });

    it('authenticates an admin/supervisor and enforces single active institutional session', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const adminUser: UserEntity = {
        id: 'admin-1',
        email: 'admin@torreon.gob.mx',
        passwordHash,
        firstName: 'Sergio',
        lastName: 'González Acosta',
        phone: '8711000001',
        roleId: adminRole.id,
        role: adminRole,
        departmentId: null,
        department: null,
        isActive: true,
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        createdAt: new Date('2026-11-17T00:00:00Z'),
      };

      const { service } = makeService({ existingUser: adminUser });
      const firstLogin = await service.login({
        email: 'admin@torreon.gob.mx',
        password: 'Torreon2026!',
      });
      const secondLogin = await service.login({
        email: 'admin@torreon.gob.mx',
        password: 'Torreon2026!',
      });

      expect(firstLogin.redirectTo).toBe('/dashboard-admins');
      expect(firstLogin.user.roleLabel).toBe('Admin');
      expect(() =>
        service.validateTokenAndSession(firstLogin.accessToken),
      ).toThrow(UnauthorizedException);
      expect(service.validateTokenAndSession(secondLogin.accessToken).sub).toBe(
        'admin-1',
      );
    });

    it('allows concurrent sessions for citizen accounts', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const citizenUser: UserEntity = {
        id: 'citizen-multi',
        email: 'ciudadano@correo.com',
        passwordHash,
        firstName: 'Ana',
        lastName: 'López',
        phone: null,
        roleId: citizenRole.id,
        role: citizenRole,
        departmentId: null,
        department: null,
        isActive: true,
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        createdAt: new Date('2026-11-17T00:00:00Z'),
      };

      const { service } = makeService({ existingUser: citizenUser });
      const firstLogin = await service.login({
        email: 'ciudadano@correo.com',
        password: 'Torreon2026!',
      });
      const secondLogin = await service.login({
        email: 'ciudadano@correo.com',
        password: 'Torreon2026!',
      });

      expect(service.validateTokenAndSession(firstLogin.accessToken).sub).toBe(
        'citizen-multi',
      );
      expect(service.validateTokenAndSession(secondLogin.accessToken).sub).toBe(
        'citizen-multi',
      );
    });

    it('throws UnauthorizedException when user does not exist or password mismatches', async () => {
      const { service } = makeService({ existingUser: null });
      await expect(
        service.login({
          email: 'nobody@correo.com',
          password: 'Password123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const passwordHash = await bcrypt.hash('CorrectPass1', 4);
      const { service: serviceWithUser } = makeService({
        existingUser: {
          id: 'u1',
          email: 'user@correo.com',
          passwordHash,
          role: citizenRole,
          isActive: true,
        },
      });
      await expect(
        serviceWithUser.login({
          email: 'user@correo.com',
          password: 'WrongPassword',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws ForbiddenException when account is inactive', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const { service } = makeService({
        existingUser: {
          id: 'u-inactive',
          email: 'inactive@torreon.gob.mx',
          passwordHash,
          role: supervisorRole,
          isActive: false,
        },
      });

      await expect(
        service.login({
          email: 'inactive@torreon.gob.mx',
          password: 'Torreon2026!',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws InternalServerErrorException when user role is missing or invalid', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const { service } = makeService({
        existingUser: {
          id: 'u-bad-role',
          email: 'badrole@torreon.gob.mx',
          passwordHash,
          role: {
            id: 'r',
            name: 'UNKNOWN_ROLE',
            description: '',
            permissions: [],
          },
          isActive: true,
        },
      });

      await expect(
        service.login({
          email: 'badrole@torreon.gob.mx',
          password: 'Torreon2026!',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('logout, getProfile and listRoles', () => {
    it('revokes token on logout so subsequent validations fail', async () => {
      const passwordHash = await bcrypt.hash('Torreon2026!', 4);
      const { service } = makeService({
        existingUser: {
          id: 'sup-1',
          email: 'supervisor.simas@torreon.gob.mx',
          passwordHash,
          firstName: 'Erik',
          lastName: 'Hernández',
          phone: null,
          roleId: supervisorRole.id,
          role: supervisorRole,
          departmentId: simasDepartment.id,
          department: simasDepartment,
          isActive: true,
          activeSessionId: null,
          resetToken: null,
          resetTokenExpiresAt: null,
          createdAt: new Date('2026-11-17T00:00:00Z'),
        },
      });

      const loginRes = await service.login({
        email: 'supervisor.simas@torreon.gob.mx',
        password: 'Torreon2026!',
      });
      const payload = service.validateTokenAndSession(loginRes.accessToken);
      const logoutRes = await service.logout(payload);

      expect(logoutRes.message).toBe('Sesión cerrada correctamente.');
      expect(() =>
        service.validateTokenAndSession(loginRes.accessToken),
      ).toThrow(UnauthorizedException);
    });

    it('returns active user profile and handles missing or inactive user', async () => {
      const supervisorUser: UserEntity = {
        id: 'sup-1',
        email: 'supervisor.simas@torreon.gob.mx',
        passwordHash: 'hash',
        firstName: 'Erik',
        lastName: 'Hernández',
        phone: '8711000002',
        roleId: supervisorRole.id,
        role: supervisorRole,
        departmentId: simasDepartment.id,
        department: simasDepartment,
        isActive: true,
        activeSessionId: null,
        resetToken: null,
        resetTokenExpiresAt: null,
        createdAt: new Date('2026-11-17T00:00:00Z'),
      };

      const { service, jwtTokenService } = makeService({
        existingUser: supervisorUser,
      });

      const { accessToken } = jwtTokenService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: UserRole.SUPERVISOR,
        roleLabel: 'Supervisor',
        permissions: ['reports:read'],
        departmentId: simasDepartment.id,
        departmentCode: simasDepartment.code,
        jti: 'jti-profile-1',
      });

      const payload = jwtTokenService.verify(accessToken);
      const profile = await service.getProfileWithRedirect(payload);

      expect(profile.redirectTo).toBe('/dashboard-admins');
      expect(profile.user.roleLabel).toBe('Supervisor');
      expect(profile.user.department?.code).toBe('SIM');

      const { service: missingService } = makeService({ existingUser: null });
      await expect(
        missingService.getProfileWithRedirect(payload),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      const { service: inactiveService } = makeService({
        existingUser: { ...supervisorUser, isActive: false },
      });
      await expect(
        inactiveService.getProfileWithRedirect(payload),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lists available roles with normalized labels and permissions', async () => {
      const { service } = makeService();
      const roles = await service.listRoles();

      expect(roles).toHaveLength(4);
      expect(roles[0]).toMatchObject({
        name: UserRole.ADMIN,
        label: 'Admin',
        permissions: ['*'],
      });
    });
  });

  it('resolves institutional admin and operator domains regardless of username', () => {
    expect(resolveInstitutionalDomain('jesus@simas.com.mx')).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'SIM',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('roberto@operador.simas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'SIM',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(resolveInstitutionalDomain('admin@laola.com.mx')).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'OLA',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('operador@operador.laola.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'OLA',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(
      resolveInstitutionalDomain('admin@obraspublicas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_SUPERVISOR',
      departmentCode: 'OBP',
      redirectTo: '/dashboard-admins',
    });
    expect(
      resolveInstitutionalDomain('operador@operador.obraspublicas.com.mx'),
    ).toMatchObject({
      roleName: 'ROLE_CREW',
      departmentCode: 'OBP',
      redirectTo: '/dashboard-tecnicos',
    });
    expect(isInstitutionalDomain('ciudadano@gmail.com')).toBe(false);
  });
});
