'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiFetch,
  AuthUser,
  SESSION_EXPIRES_AT_KEY,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from './api';

const SESSION_DURATION_MS = 30 * 60 * 1000;
const EXPIRY_SKEW_MS = 3_000;

interface DecodedJwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decodifica el payload de un JWT en cliente únicamente para lectura de `exp` (UX/expiración local).
 * La verificación criptográfica siempre la realiza el backend en cada petición.
 */
export function parseJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const json = atob(padded);
    return JSON.parse(json) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpirationMs(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000;
  }
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const expMs = getTokenExpirationMs(token);
  if (!expMs) return true;
  return Date.now() >= expMs - EXPIRY_SKEW_MS;
}

export function getStoredSession(): {
  token: string | null;
  user: AuthUser | null;
  expiresAtMs: number | null;
} {
  if (typeof window === 'undefined') {
    return { token: null, user: null, expiresAtMs: null };
  }
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!token || !rawUser) {
    return { token: null, user: null, expiresAtMs: null };
  }

  const expiresAtMs = getTokenExpirationMs(token);
  if (!expiresAtMs || Date.now() >= expiresAtMs - EXPIRY_SKEW_MS) {
    clearSession();
    return { token: null, user: null, expiresAtMs: null };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser) as AuthUser,
      expiresAtMs,
    };
  } catch {
    clearSession();
    return { token: null, user: null, expiresAtMs: null };
  }
}

export function saveSession(
  accessToken: string,
  user: AuthUser,
  expiresAtIso?: string,
) {
  if (typeof window === 'undefined') return;
  const jwtExpMs = getTokenExpirationMs(accessToken);
  const parsedIso = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
  const expiresAtMs =
    jwtExpMs ??
    (Number.isFinite(parsedIso) ? parsedIso : Date.now() + SESSION_DURATION_MS);

  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_EXPIRES_AT_KEY, String(expiresAtMs));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
}

export function getRedirectForRole(role: AuthUser['role']): string {
  switch (role) {
    case 'ROLE_ADMIN':
    case 'ROLE_SUPERVISOR':
      return '/dashboard-admins';
    case 'ROLE_CREW':
      return '/dashboard-tecnicos';
    default:
      return '/dashboard-ciudadano';
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST', skipAuthRedirect: true });
  } catch {
    // Ignore network failures during logout
  } finally {
    clearSession();
  }
}

/**
 * Protege rutas privadas: valida JWT (30 min), sincroniza cierres/cambios entre pestañas
 * y programa expiración automática al vencer el token.
 */
export function useRequireAuth(allowedRoles?: AuthUser['role'][]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const allowedRolesKey = allowedRoles ? allowedRoles.join(',') : '';

  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;
    const allowedList = allowedRolesKey
      ? (allowedRolesKey.split(',') as AuthUser['role'][])
      : undefined;

    const scheduleAutoExpiry = (expiresAtMs: number) => {
      if (expiryTimer) clearTimeout(expiryTimer);
      const remainingMs = Math.max(0, expiresAtMs - Date.now());
      expiryTimer = setTimeout(() => {
        if (!active) return;
        clearSession();
        router.replace('/auth/login?sessionExpired=1');
      }, remainingMs);
    };

    async function verify() {
      const { token, user: cached, expiresAtMs } = getStoredSession();
      if (!token || !expiresAtMs) {
        router.replace('/auth/login');
        return;
      }

      scheduleAutoExpiry(expiresAtMs);

      if (cached && active) {
        if (allowedList && !allowedList.includes(cached.role)) {
          router.replace(getRedirectForRole(cached.role));
          return;
        }
        setUser((prev) =>
          prev && JSON.stringify(prev) === JSON.stringify(cached)
            ? prev
            : cached,
        );
      }

      try {
        const fresh = await apiFetch<AuthUser>('/auth/me');
        if (!active) return;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fresh));
        if (allowedList && !allowedList.includes(fresh.role)) {
          router.replace(getRedirectForRole(fresh.role));
          return;
        }
        setUser((prev) =>
          prev && JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh,
        );
      } catch {
        // apiFetch handles 401 redirect; if server offline, keep cached if role allowed
        if (!cached && active) {
          clearSession();
          router.replace('/auth/login');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key !== TOKEN_STORAGE_KEY &&
        event.key !== USER_STORAGE_KEY &&
        event.key !== null
      ) {
        return;
      }
      const { token, user: nextUser, expiresAtMs } = getStoredSession();
      if (!token || !nextUser || !expiresAtMs) {
        router.replace('/auth/login');
        return;
      }
      scheduleAutoExpiry(expiresAtMs);
      if (allowedList && !allowedList.includes(nextUser.role)) {
        router.replace(getRedirectForRole(nextUser.role));
        return;
      }
      setUser(nextUser);
    };

    void verify();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      active = false;
      if (expiryTimer) clearTimeout(expiryTimer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router, allowedRolesKey]);

  return { user, loading };
}

/**
 * Para rutas públicas de acceso (`/`, `/auth/login`, `/registro`):
 * Si ya existe una sesión JWT activa y vigente en el mismo navegador (incluso en otra pestaña),
 * valida contra `/auth/me` y redirige automáticamente al panel correspondiente.
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkActiveSession() {
      const { token, user: cached } = getStoredSession();
      if (!token) {
        if (active) setCheckingSession(false);
        return;
      }

      try {
        const fresh = await apiFetch<AuthUser>('/auth/me', {
          skipAuthRedirect: true,
        });
        if (!active) return;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fresh));
        router.replace(getRedirectForRole(fresh.role));
      } catch (err) {
        if (!active) return;
        const status =
          typeof err === 'object' && err !== null && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        if (status === 401 || status === 403 || !cached) {
          clearSession();
          setCheckingSession(false);
          return;
        }
        // Si el backend no responde temporalmente pero el token aún no vence, restaurar panel
        router.replace(getRedirectForRole(cached.role));
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== TOKEN_STORAGE_KEY && event.key !== USER_STORAGE_KEY) {
        return;
      }
      const { token, user: nextUser } = getStoredSession();
      if (token && nextUser) {
        router.replace(getRedirectForRole(nextUser.role));
      }
    };

    void checkActiveSession();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  return { checkingSession };
}
