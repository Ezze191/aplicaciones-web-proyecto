jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './constants/roles.constants';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { JwtPayload } from './jwt-token.service';

describe('AuthController', () => {
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    listRoles: jest.fn(),
  } as unknown as AuthService;

  const controller = new AuthController(mockAuthService);
  const reflector = new Reflector();

  const adminUser: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@torreon.gob.mx',
    role: UserRole.ADMIN,
    roleLabel: 'Admin',
    permissions: ['*'],
    departmentId: null,
    departmentCode: null,
    jti: 'jti-admin',
    iat: 1000,
    exp: 9999,
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
    (mockAuthService.logout as jest.Mock).mockReturnValue({ message: 'bye' });
    (mockAuthService.getProfile as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1' },
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

    expect(controller.logout(adminUser)).toEqual({ message: 'bye' });
    await expect(controller.getProfile(adminUser)).resolves.toEqual({
      user: { id: 'admin-1' },
    });
    await expect(controller.getMe(adminUser)).resolves.toEqual({
      user: { id: 'admin-1' },
    });
    await expect(controller.listRoles()).resolves.toEqual([
      { name: UserRole.ADMIN },
    ]);
  });

  it('returns RBAC verification responses for admin, cuadrilla and ciudadano endpoints', () => {
    expect(controller.verifyAdminAccess(adminUser).scope).toBe('admin');

    const crewUser: JwtPayload = {
      ...adminUser,
      role: UserRole.CREW,
      roleLabel: 'Cuadrilla',
      departmentCode: 'SIM',
    };
    expect(controller.verifyCrewAccess(crewUser)).toMatchObject({
      scope: 'cuadrilla',
      user: {
        role: UserRole.CREW,
        roleLabel: 'Cuadrilla',
        departmentCode: 'SIM',
      },
    });

    const citizenUser: JwtPayload = {
      ...adminUser,
      role: UserRole.CITIZEN,
      roleLabel: 'Ciudadano',
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
    ).toEqual(['Admin', 'Supervisor']);
    expect(getHandlerMetadata<string[]>('verifyCrewAccess', ROLES_KEY)).toEqual(
      ['Cuadrilla', 'Admin'],
    );
    expect(
      getHandlerMetadata<string[]>('verifyCitizenAccess', ROLES_KEY),
    ).toEqual(['Ciudadano', 'Admin']);
  });
});
