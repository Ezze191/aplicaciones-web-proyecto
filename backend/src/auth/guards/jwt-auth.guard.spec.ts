jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { UserRole } from '../constants/roles.constants';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { JwtPayload } from '../jwt-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const samplePayload: JwtPayload = {
    sub: 'user-1',
    email: 'admin@torreon.gob.mx',
    role: UserRole.ADMIN,
    roleLabel: 'Admin',
    permissions: ['*'],
    departmentId: null,
    departmentCode: null,
    jti: 'jti-1',
    iat: 1000,
    exp: 9999999999,
  };

  const makeExecutionContext = (
    authorization?: string,
  ): { context: ExecutionContext; request: Partial<AuthenticatedRequest> } => {
    const request: Partial<AuthenticatedRequest> = {
      headers: authorization ? { authorization } : {},
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('allows public routes marked with @Public()', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const validateTokenAndSession = jest.fn();
    const authService = {
      validateTokenAndSession,
    } as unknown as AuthService;

    const guard = new JwtAuthGuard(reflector, authService);
    const { context } = makeExecutionContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(validateTokenAndSession).not.toHaveBeenCalled();
  });

  it('attaches validated user payload to request when Bearer token is valid', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const validateTokenAndSession = jest.fn().mockReturnValue(samplePayload);
    const authService = {
      validateTokenAndSession,
    } as unknown as AuthService;

    const guard = new JwtAuthGuard(reflector, authService);
    const { context, request } = makeExecutionContext('Bearer valid.jwt.token');

    expect(guard.canActivate(context)).toBe(true);
    expect(validateTokenAndSession).toHaveBeenCalledWith('valid.jwt.token');
    expect(request.user).toEqual(samplePayload);
  });

  it('throws UnauthorizedException when Authorization header is missing or malformed', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authService = {
      validateTokenAndSession: jest.fn(),
    } as unknown as AuthService;

    const guard = new JwtAuthGuard(reflector, authService);

    expect(() => guard.canActivate(makeExecutionContext().context)).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(makeExecutionContext('Basic abc123').context),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(makeExecutionContext('Bearer').context),
    ).toThrow(UnauthorizedException);
  });
});
