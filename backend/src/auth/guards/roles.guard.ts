import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { normalizeRoleName } from '../constants/roles.constants';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard RBAC encargado de validar que el usuario autenticado posea el rol o permisos exigidos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Usuario no autenticado para validar permisos.',
      );
    }

    if (requiredRoles.length > 0) {
      const userRole = normalizeRoleName(user.role);
      const allowedRoles = requiredRoles
        .map((role) => normalizeRoleName(role))
        .filter((role): role is NonNullable<typeof role> => role !== null);

      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ForbiddenException(
          `No tienes permisos suficientes para acceder a este recurso. Rol requerido: ${requiredRoles.join(', ')}.`,
        );
      }
    }

    if (requiredPermissions.length > 0) {
      const userPermissions = Array.isArray(user.permissions)
        ? user.permissions
        : [];
      const hasAllPermissions =
        userPermissions.includes('*') ||
        requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `No cuentas con los permisos requeridos: ${requiredPermissions.join(', ')}.`,
        );
      }
    }

    return true;
  }
}
