import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declara los roles autorizados para acceder a un endpoint protegido por RolesGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
