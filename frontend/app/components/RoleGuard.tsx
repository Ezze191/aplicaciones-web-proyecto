'use client';

import { ReactNode, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDashboardPath,
  getSession,
  SESSION_KEY,
  UserRole,
} from '../lib/session';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

/**
 * Protege un dashboard: sin sesión manda a login; con otro rol manda a su propio dashboard.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const rawSession = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(SESSION_KEY),
    () => null,
  );

  const session = rawSession ? getSession() : null;
  const role = session?.user.role;
  const authorized = Boolean(role && allowedRoles.includes(role));

  useEffect(() => {
    // Se lee directo de localStorage: en la hidratación el snapshot inicial es null.
    const current = getSession();
    if (!current) {
      router.replace('/auth/login');
    } else if (!allowedRoles.includes(current.user.role)) {
      router.replace(getDashboardPath(current.user.role));
    }
  }, [rawSession, allowedRoles, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
