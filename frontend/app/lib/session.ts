/**
 * Manejo de sesión JWT en el cliente (localStorage) y rutas por rol.
 */
export type UserRole =
  | 'ROLE_ADMIN'
  | 'ROLE_SUPERVISOR'
  | 'ROLE_CREW'
  | 'ROLE_CITIZEN';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roleLabel: string;
  permissions: string[];
  departmentId: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: string;
  redirectTo: string;
  user: SessionUser;
}

export const SESSION_KEY = 'siu_session';

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  ROLE_ADMIN: '/dashboard-admins',
  ROLE_SUPERVISOR: '/dashboard-admins',
  ROLE_CREW: '/dashboard-tecnicos',
  ROLE_CITIZEN: '/dashboard-ciudadano',
};

export function getDashboardPath(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role] ?? '/auth/login';
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.accessToken || new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

/** Cierra sesión en el backend (revoca el JWT) y limpia el cliente. */
export async function logout(backendUrl: string): Promise<void> {
  const session = getSession();
  if (session) {
    try {
      await fetch(`${backendUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      // Si el backend no responde igual se limpia la sesión local.
    }
  }
  clearSession();
}
