import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard encargado de validar el token Bearer JWT y verificar la vigencia de la sesión.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(
        'Token de autenticación requerido en el encabezado Authorization.',
      );
    }

    request.user = this.authService.validateTokenAndSession(token);
    return true;
  }

  private extractBearerToken(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/);
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}
