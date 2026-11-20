import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  normalizeRoleName,
  RoleLabel,
  UserRole,
} from './constants/roles.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  roleLabel: RoleLabel;
  permissions: string[];
  departmentId: string | null;
  departmentCode: string | null;
  jti: string;
  iat: number;
  exp: number;
}

export interface SignedJwtResult {
  accessToken: string;
  expiresIn: number;
  expiresAt: string;
}

const DEFAULT_EXPIRES_IN_SECONDS = 24 * 60 * 60;
const DEV_FALLBACK_JWT_SECRET =
  'siu-torreon-dev-jwt-secret-change-in-production';

/**
 * Servicio encargado de firmar y verificar tokens JWT HS256 estándar (RFC 7519).
 */
@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: ConfigService) {}

  parseExpiresInSeconds(raw: string | undefined): number {
    if (!raw) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return parsed > 0 ? parsed : DEFAULT_EXPIRES_IN_SECONDS;
    }

    const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
    if (!match) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    const amount = Number(match[1]);
    if (amount <= 0) {
      return DEFAULT_EXPIRES_IN_SECONDS;
    }

    const unitMultiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return amount * unitMultiplier[match[2].toLowerCase()];
  }

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): SignedJwtResult {
    const iat = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpiresInSeconds(
      this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
    );
    const exp = iat + expiresIn;
    const expiresAt = new Date(exp * 1000).toISOString();

    const fullPayload: JwtPayload = {
      ...payload,
      iat,
      exp,
    };

    const encodedHeader = this.encodeBase64Url({
      alg: 'HS256',
      typ: 'JWT',
    });
    const encodedPayload = this.encodeBase64Url(fullPayload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.createSignature(signingInput);

    return {
      accessToken: `${signingInput}.${signature}`,
      expiresIn,
      expiresAt,
    };
  }

  verify(token: string): JwtPayload {
    const segments = token.split('.');
    if (segments.length !== 3 || segments.some((part) => !part)) {
      throw new UnauthorizedException('Token JWT inválido o malformado.');
    }

    const [encodedHeader, encodedPayload, providedSignature] = segments;

    const header = this.decodeJsonSegment(encodedHeader);
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Encabezado de token JWT no soportado.');
    }

    const expectedSignature = this.createSignature(
      `${encodedHeader}.${encodedPayload}`,
    );
    const providedBuf = Buffer.from(providedSignature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Firma de token JWT inválida.');
    }

    const rawPayload = this.decodeJsonSegment(encodedPayload);
    if (!rawPayload) {
      throw new UnauthorizedException('Payload de token JWT malformado.');
    }

    const normalizedRole =
      typeof rawPayload.role === 'string'
        ? normalizeRoleName(rawPayload.role)
        : null;

    if (
      typeof rawPayload.sub !== 'string' ||
      typeof rawPayload.email !== 'string' ||
      !normalizedRole ||
      typeof rawPayload.roleLabel !== 'string' ||
      typeof rawPayload.jti !== 'string' ||
      typeof rawPayload.iat !== 'number' ||
      typeof rawPayload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Claims del token JWT incompletos.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (rawPayload.exp <= nowSeconds) {
      throw new UnauthorizedException('El token JWT ha expirado.');
    }

    const permissions = Array.isArray(rawPayload.permissions)
      ? rawPayload.permissions.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];

    return {
      sub: rawPayload.sub,
      email: rawPayload.email,
      role: normalizedRole,
      roleLabel: rawPayload.roleLabel as JwtPayload['roleLabel'],
      permissions,
      departmentId:
        typeof rawPayload.departmentId === 'string'
          ? rawPayload.departmentId
          : null,
      departmentCode:
        typeof rawPayload.departmentCode === 'string'
          ? rawPayload.departmentCode
          : null,
      jti: rawPayload.jti,
      iat: rawPayload.iat,
      exp: rawPayload.exp,
    };
  }

  private getSecret(): string {
    const configured = this.configService.get<string>('JWT_SECRET')?.trim();
    return configured || DEV_FALLBACK_JWT_SECRET;
  }

  private createSignature(signingInput: string): string {
    return createHmac('sha256', this.getSecret())
      .update(signingInput)
      .digest('base64url');
  }

  private encodeBase64Url(value: object): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  }

  private decodeJsonSegment(segment: string): Record<string, unknown> | null {
    try {
      const json = Buffer.from(segment, 'base64url').toString('utf8');
      const parsed: unknown = JSON.parse(json);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
