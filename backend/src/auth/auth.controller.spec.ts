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

import { Reflector } from '@nestjs/core';
import { type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './constants/roles.constants';

describe('AuthController', () => {
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    getProfileWithRedirect: jest.fn(),
    listRoles: jest.fn(),
  } as unknown as AuthService;

  const controller = new AuthController(mockAuthService);
  const reflector = new Reflector();

  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@torreon.gob.mx',
    role: UserRole.ADMIN,
    departmentId: null,
    sessionId: 'sess-admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates register, login, logout, profile, me and roles to AuthService', async () => {
    (mockAuthService.register as jest.Mock).mockResolvedValue({
      message: 'ok',
    });
    (mockAuthService.login as jest.Mock).mockResolvedValue({
      accessToken: 'tok',
    });
    (mockAuthService.logout as jest.Mock).mockResolvedValue({ message: 'bye' });
    (mockAuthService.getProfile as jest.Mock).mockResolvedValue({
      id: 'admin-1',
    });
    (mockAuthService.getProfileWithRedirect as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1' },
      redirectTo: '/dashboard-admins',
    });
    (mockAuthService.listRoles as jest.Mock).mockResolvedValue([
      { name: UserRole.ADMIN },
    ]);

    await expect(
      controller.register({
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@correo.com',
        password: 'Password123',
      }),
    ).resolves.toEqual({ message: 'ok' });

    await expect(
      controller.login({
        email: 'ana@correo.com',
        password: 'Password123',
      }),
    ).resolves.toEqual({ accessToken: 'tok' });

    await expect(controller.logout(adminUser)).resolves.toEqual({
      message: 'bye',
    });
    await expect(controller.me(adminUser)).resolves.toEqual({ id: 'admin-1' });
    await expect(controller.getProfile(adminUser)).resolves.toEqual({
      user: { id: 'admin-1' },
      redirectTo: '/dashboard-admins',
    });
    await expect(controller.listRoles()).resolves.toEqual([
      { name: UserRole.ADMIN },
    ]);
  });

  it('returns RBAC verification responses for admin, cuadrilla and ciudadano endpoints', () => {
    expect(controller.verifyAdminAccess(adminUser).scope).toBe('admin');

    const crewUser: AuthenticatedUser = {
      ...adminUser,
      role: UserRole.CREW,
      departmentId: 'dept-simas-1',
    };
    expect(controller.verifyCrewAccess(crewUser)).toMatchObject({
      scope: 'cuadrilla',
      user: {
        role: UserRole.CREW,
        roleLabel: 'Cuadrilla',
        departmentId: 'dept-simas-1',
      },
    });

    const citizenUser: AuthenticatedUser = {
      ...adminUser,
      role: UserRole.CITIZEN,
    };
    expect(controller.verifyCitizenAccess(citizenUser)).toMatchObject({
      scope: 'ciudadano',
      user: { role: UserRole.CITIZEN, roleLabel: 'Ciudadano' },
    });
  });

  it('declares @Public() and @Roles() metadata accurately on endpoints', () => {
    const getHandlerMetadata = <T>(
      methodName: keyof AuthController,
      metadataKey: string,
    ): T | undefined => {
      const descriptor = Object.getOwnPropertyDescriptor(
        AuthController.prototype,
        methodName,
      );
      return reflector.get<T>(
        metadataKey,
        descriptor?.value as (...args: unknown[]) => unknown,
      );
    };

    expect(getHandlerMetadata<boolean>('register', IS_PUBLIC_KEY)).toBe(true);
    expect(getHandlerMetadata<boolean>('login', IS_PUBLIC_KEY)).toBe(true);
    expect(
      getHandlerMetadata<string[]>('verifyAdminAccess', ROLES_KEY),
    ).toEqual(['ROLE_ADMIN', 'ROLE_SUPERVISOR']);
    expect(getHandlerMetadata<string[]>('verifyCrewAccess', ROLES_KEY)).toEqual(
      ['ROLE_CREW', 'ROLE_ADMIN'],
    );
    expect(
      getHandlerMetadata<string[]>('verifyCitizenAccess', ROLES_KEY),
    ).toEqual(['ROLE_CITIZEN', 'ROLE_ADMIN']);
  });
});
