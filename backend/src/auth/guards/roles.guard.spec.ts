import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../constants/roles.constants';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../jwt-token.service';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (user?: Partial<JwtPayload>): ExecutionContext => {
    const request: Partial<AuthenticatedRequest> = {
      user: user as JwtPayload | undefined,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  const makeReflector = (options: {
    isPublic?: boolean;
    roles?: string[];
    permissions?: string[];
  }) =>
    ({
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
        if (key === ROLES_KEY) return options.roles;
        if (key === PERMISSIONS_KEY) return options.permissions;
        return undefined;
      }),
    }) as unknown as Reflector;

  it('allows access when route is public or has no role/permission metadata', () => {
    const publicGuard = new RolesGuard(makeReflector({ isPublic: true }));
    expect(publicGuard.canActivate(makeContext())).toBe(true);

    const openGuard = new RolesGuard(makeReflector({}));
    expect(openGuard.canActivate(makeContext())).toBe(true);
  });

  it('throws UnauthorizedException when request has no authenticated user', () => {
    const guard = new RolesGuard(makeReflector({ roles: ['Admin'] }));
    expect(() => guard.canActivate(makeContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('matches role aliases like Admin, Cuadrilla and Ciudadano against DB role names', () => {
    const adminGuard = new RolesGuard(makeReflector({ roles: ['Admin'] }));
    expect(
      adminGuard.canActivate(
        makeContext({ role: UserRole.ADMIN, permissions: ['*'] }),
      ),
    ).toBe(true);

    const crewGuard = new RolesGuard(
      makeReflector({ roles: ['Cuadrilla', 'Admin'] }),
    );
    expect(
      crewGuard.canActivate(
        makeContext({ role: UserRole.CREW, permissions: ['work_orders:read'] }),
      ),
    ).toBe(true);

    const citizenGuard = new RolesGuard(
      makeReflector({ roles: ['Ciudadano'] }),
    );
    expect(
      citizenGuard.canActivate(
        makeContext({
          role: UserRole.CITIZEN,
          permissions: ['reports:create'],
        }),
      ),
    ).toBe(true);
  });

  it('throws ForbiddenException when user role is not allowed', () => {
    const guard = new RolesGuard(
      makeReflector({ roles: ['Admin', 'Supervisor'] }),
    );

    expect(() =>
      guard.canActivate(
        makeContext({
          role: UserRole.CITIZEN,
          permissions: ['reports:create'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('checks granular permissions and supports wildcard "*" for admins', () => {
    const guard = new RolesGuard(
      makeReflector({ permissions: ['reports:assign', 'crews:manage'] }),
    );

    expect(
      guard.canActivate(
        makeContext({ role: UserRole.ADMIN, permissions: ['*'] }),
      ),
    ).toBe(true);

    expect(
      guard.canActivate(
        makeContext({
          role: UserRole.SUPERVISOR,
          permissions: ['reports:read', 'reports:assign', 'crews:manage'],
        }),
      ),
    ).toBe(true);

    expect(() =>
      guard.canActivate(
        makeContext({
          role: UserRole.CREW,
          permissions: ['work_orders:read'],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
