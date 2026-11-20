jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { UserRole } from './constants/roles.constants';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const makeService = (overrides?: Record<string, string | undefined>) => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (overrides && key in overrides) {
          return overrides[key];
        }
        if (key === 'JWT_SECRET') return 'siu-unit-test-secret';
        if (key === 'JWT_EXPIRES_IN') return '24h';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    return new JwtTokenService(configService);
  };

  it('parses duration strings and numeric strings properly', () => {
    const service = makeService();

    expect(service.parseExpiresInSeconds(undefined)).toBe(86400);
    expect(service.parseExpiresInSeconds('  ')).toBe(86400);
    expect(service.parseExpiresInSeconds('120')).toBe(120);
    expect(service.parseExpiresInSeconds('30s')).toBe(30);
    expect(service.parseExpiresInSeconds('15m')).toBe(900);
    expect(service.parseExpiresInSeconds('2h')).toBe(7200);
    expect(service.parseExpiresInSeconds('7d')).toBe(604800);
    expect(service.parseExpiresInSeconds('invalid')).toBe(86400);
    expect(service.parseExpiresInSeconds('0h')).toBe(86400);
  });

  it('signs and verifies a valid HS256 token', () => {
    const service = makeService({ JWT_EXPIRES_IN: '1h' });

    const signed = service.sign({
      sub: 'user-123',
      email: 'admin@torreon.gob.mx',
      role: UserRole.ADMIN,
      roleLabel: 'Admin',
      permissions: ['*'],
      departmentId: null,
      departmentCode: null,
      jti: 'jti-abc',
    });

    expect(signed.expiresIn).toBe(3600);
    expect(signed.accessToken.split('.')).toHaveLength(3);

    const verified = service.verify(signed.accessToken);
    expect(verified.sub).toBe('user-123');
    expect(verified.email).toBe('admin@torreon.gob.mx');
    expect(verified.role).toBe(UserRole.ADMIN);
    expect(verified.roleLabel).toBe('Admin');
    expect(verified.permissions).toEqual(['*']);
    expect(verified.jti).toBe('jti-abc');
  });

  it('throws UnauthorizedException for malformed tokens or tampered signatures', () => {
    const service = makeService();
    const signed = service.sign({
      sub: 'user-123',
      email: 'ciudadano@correo.com',
      role: UserRole.CITIZEN,
      roleLabel: 'Ciudadano',
      permissions: ['reports:read'],
      departmentId: null,
      departmentCode: null,
      jti: 'jti-1',
    });

    expect(() => service.verify('not-a-jwt')).toThrow(UnauthorizedException);

    const parts = signed.accessToken.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalid_signature`;
    expect(() => service.verify(tampered)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is expired', () => {
    const secret = 'siu-unit-test-secret';
    const service = makeService({ JWT_SECRET: secret });

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'user-1',
        email: 'cuadrilla@torreon.gob.mx',
        role: UserRole.CREW,
        roleLabel: 'Cuadrilla',
        permissions: [],
        departmentId: null,
        departmentCode: null,
        jti: 'expired-jti',
        iat: now - 1000,
        exp: now - 10,
      }),
    ).toString('base64url');
    const sig = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    expect(() => service.verify(`${header}.${payload}.${sig}`)).toThrow(
      'El token JWT ha expirado.',
    );
  });

  it('throws UnauthorizedException when header alg is unsupported or claims are incomplete', () => {
    const secret = 'siu-unit-test-secret';
    const service = makeService({ JWT_SECRET: secret });

    const badHeader = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const validPayload = Buffer.from(JSON.stringify({ sub: '1' })).toString(
      'base64url',
    );
    expect(() => service.verify(`${badHeader}.${validPayload}.sig`)).toThrow(
      UnauthorizedException,
    );

    const goodHeader = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const incompletePayload = Buffer.from(
      JSON.stringify({ sub: '1' }),
    ).toString('base64url');
    const sig = createHmac('sha256', secret)
      .update(`${goodHeader}.${incompletePayload}`)
      .digest('base64url');

    expect(() =>
      service.verify(`${goodHeader}.${incompletePayload}.${sig}`),
    ).toThrow('Claims del token JWT incompletos.');
  });
});
