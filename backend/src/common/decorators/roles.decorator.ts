import { SetMetadata } from '@nestjs/common';

export type AppRole =
  | 'ROLE_ADMIN'
  | 'ROLE_SUPERVISOR'
  | 'ROLE_CREW'
  | 'ROLE_CITIZEN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
