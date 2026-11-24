export interface InstitutionalDomainRule {
  domain: string;
  roleName: 'ROLE_SUPERVISOR' | 'ROLE_CREW';
  departmentCode: 'SIM' | 'OLA' | 'OBP';
  redirectTo: '/dashboard-admins' | '/dashboard-tecnicos';
  label: string;
}

export const INSTITUTIONAL_DOMAIN_RULES: Readonly<
  Record<string, InstitutionalDomainRule>
> = {
  'simas.com.mx': {
    domain: 'simas.com.mx',
    roleName: 'ROLE_SUPERVISOR',
    departmentCode: 'SIM',
    redirectTo: '/dashboard-admins',
    label: 'Administrador SIMAS',
  },
  'operador.simas.com.mx': {
    domain: 'operador.simas.com.mx',
    roleName: 'ROLE_CREW',
    departmentCode: 'SIM',
    redirectTo: '/dashboard-tecnicos',
    label: 'Operador SIMAS',
  },
  'laola.com.mx': {
    domain: 'laola.com.mx',
    roleName: 'ROLE_SUPERVISOR',
    departmentCode: 'OLA',
    redirectTo: '/dashboard-admins',
    label: 'Administrador La OLA',
  },
  'operador.laola.com.mx': {
    domain: 'operador.laola.com.mx',
    roleName: 'ROLE_CREW',
    departmentCode: 'OLA',
    redirectTo: '/dashboard-tecnicos',
    label: 'Operador La OLA',
  },
  'obraspublicas.com.mx': {
    domain: 'obraspublicas.com.mx',
    roleName: 'ROLE_SUPERVISOR',
    departmentCode: 'OBP',
    redirectTo: '/dashboard-admins',
    label: 'Administrador Obras Públicas',
  },
  'operador.obraspublicas.com.mx': {
    domain: 'operador.obraspublicas.com.mx',
    roleName: 'ROLE_CREW',
    departmentCode: 'OBP',
    redirectTo: '/dashboard-tecnicos',
    label: 'Operador Obras Públicas',
  },
};

export function extractEmailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return '';
  return normalized.slice(atIndex + 1);
}

export function resolveInstitutionalDomain(
  email: string,
): InstitutionalDomainRule | null {
  const domain = extractEmailDomain(email);
  return INSTITUTIONAL_DOMAIN_RULES[domain] ?? null;
}

export function isInstitutionalDomain(email: string): boolean {
  return resolveInstitutionalDomain(email) !== null;
}
