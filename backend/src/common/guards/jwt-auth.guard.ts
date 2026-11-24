import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { resolveInstitutionalDomain } from '../../auth/domain-routing.util';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  departmentId: string | null;
  sessionId?: string | null;
}

const INSTITUTIONAL_ROLES = new Set([
  'ROLE_ADMIN',
  'ROLE_SUPERVISOR',
  'ROLE_CREW',
]);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic) return true;
      throw new UnauthorizedException(
        'Debes iniciar sesión para acceder a este recurso.',
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Token de autenticación inválido.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException(
        'Tu sesión expiró o el token no es válido.',
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Cuenta inactiva o inexistente.');
    }

    const domainRule = resolveInstitutionalDomain(user.email);
    const roleName = domainRule?.roleName ?? user.role?.name ?? payload.role;
    if (
      INSTITUTIONAL_ROLES.has(roleName) &&
      user.activeSessionId &&
      payload.sessionId !== user.activeSessionId
    ) {
      throw new UnauthorizedException(
        'Tu sesión institucional fue cerrada porque se inició sesión en otro dispositivo.',
      );
    }

    request.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roleName,
      departmentId: user.departmentId ?? payload.departmentId ?? null,
      sessionId: payload.sessionId ?? null,
    };

    return true;
  }
}
