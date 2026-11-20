export enum UserRole {
  ADMIN = 'ROLE_ADMIN',
  SUPERVISOR = 'ROLE_SUPERVISOR',
  CREW = 'ROLE_CREW',
  CITIZEN = 'ROLE_CITIZEN',
}

export type RoleLabel = 'Admin' | 'Supervisor' | 'Cuadrilla' | 'Ciudadano';

const ROLE_ALIAS_MAP: Record<string, UserRole> = {
  ROLE_ADMIN: UserRole.ADMIN,
  ADMIN: UserRole.ADMIN,
  ROLE_SUPERVISOR: UserRole.SUPERVISOR,
  SUPERVISOR: UserRole.SUPERVISOR,
  ROLE_CREW: UserRole.CREW,
  CUADRILLA: UserRole.CREW,
  CREW: UserRole.CREW,
  ROLE_CITIZEN: UserRole.CITIZEN,
  CIUDADANO: UserRole.CITIZEN,
  CITIZEN: UserRole.CITIZEN,
};

const ROLE_LABEL_MAP: Record<UserRole, RoleLabel> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SUPERVISOR]: 'Supervisor',
  [UserRole.CREW]: 'Cuadrilla',
  [UserRole.CITIZEN]: 'Ciudadano',
};

const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/dashboard-admins',
  [UserRole.SUPERVISOR]: '/dashboard-admins',
  [UserRole.CREW]: '/dashboard-tecnicos',
  [UserRole.CITIZEN]: '/dashboard-ciudadano',
};

/**
 * Normaliza un nombre o alias de rol (ej. 'Admin', 'ROLE_ADMIN', 'Cuadrilla') al valor canónico de BD.
 */
export function normalizeRoleName(roleInput: string): UserRole | null {
  if (!roleInput) {
    return null;
  }
  const normalizedKey = roleInput.trim().toUpperCase();
  return ROLE_ALIAS_MAP[normalizedKey] ?? null;
}

/**
 * Devuelve la etiqueta legible en español correspondiente al rol.
 */
export function getRoleLabel(role: string): RoleLabel {
  const canonical = normalizeRoleName(role) ?? UserRole.CITIZEN;
  return ROLE_LABEL_MAP[canonical];
}

/**
 * Determina la ruta de dashboard Frontend correspondiente al rol autenticado.
 */
export function getDashboardRedirectPath(role: string): string {
  const canonical = normalizeRoleName(role) ?? UserRole.CITIZEN;
  return ROLE_REDIRECT_MAP[canonical];
}

/**
 * Indica si el rol pertenece a personal institucional sujeto a restricción de sesión única (RF-01 / RNF-02).
 */
export function isInstitutionalRole(role: string): boolean {
  const canonical = normalizeRoleName(role);
  return (
    canonical === UserRole.ADMIN ||
    canonical === UserRole.SUPERVISOR ||
    canonical === UserRole.CREW
  );
}
