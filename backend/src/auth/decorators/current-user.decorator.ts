import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../jwt-token.service';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Extrae el payload del usuario autenticado adjunto al request por JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
