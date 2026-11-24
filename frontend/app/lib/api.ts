export function getBackendUrl(): string {
  const ip = process.env.NEXT_PUBLIC_BACKEND_IP?.trim() || 'localhost';
  const port = process.env.NEXT_PUBLIC_BACKEND_PORT?.trim() || '3000';
  if (ip.startsWith('http://') || ip.startsWith('https://')) {
    return ip.replace(/\/$/, '');
  }
  const protocol = port === '443' ? 'https' : 'http';
  return `${protocol}://${ip}:${port}`;
}

export const TOKEN_STORAGE_KEY = 'siu_access_token';
export const USER_STORAGE_KEY = 'siu_auth_user';
export const SESSION_EXPIRES_AT_KEY = 'siu_session_expires_at';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'ROLE_ADMIN' | 'ROLE_SUPERVISOR' | 'ROLE_CREW' | 'ROLE_CITIZEN';
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  crewId: string | null;
  crewName: string | null;
  createdAt?: string;
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  iconName: string;
  colorHex: string;
  defaultSlaHours: number;
  categories?: CategoryItem[];
}

export interface CategoryItem {
  id: string;
  departmentId: string;
  name: string;
  description: string;
  priorityWeight: number;
  department?: DepartmentItem;
}

export interface ApiReport {
  id: string;
  folio: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  departmentColor: string;
  categoryId: string;
  categoryName: string;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  currentStatus:
    | 'REGISTRADO'
    | 'VALIDADO'
    | 'ASIGNADO'
    | 'EN_PROCESO'
    | 'RESUELTO'
    | 'RECHAZADO';
  kanbanStatus: 'nuevos' | 'asignados' | 'en_reparacion' | 'resueltos' | 'rechazados';
  addressReference: string;
  description: string;
  upvotesCount: number;
  lat: number;
  lng: number;
  distanceMeters: number | null;
  elapsedHours: number;
  remainingHours: number;
  slaHours: number;
  slaStatus: 'a_tiempo' | 'en_riesgo' | 'critico';
  priorityScore: number;
  assignedCrewId: string | null;
  assignedCrewName: string | null;
  workOrderId: string | null;
  workOrderFolio: string | null;
  workOrderStatus: string | null;
  workOrderNotes: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReportHistoryItem {
  id: string;
  reportId: string;
  previousStatus: string;
  newStatus: string;
  changedByUserId: string;
  notes: string | null;
  createdAt: string;
}

export interface PhotographicEvidenceItem {
  id: string;
  reportId: string;
  stage: 'ANTES' | 'DESPUES';
  imageUrl: string;
  verifiedInSitu: boolean;
  capturedAt: string;
}

export interface CrewWorkerItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  position: string;
  crewId: string | null;
  crewName: string | null;
  departmentId: string;
  departmentCode: string;
}

export interface CrewView {
  id: string;
  name: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
  leader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  workers?: CrewWorkerItem[];
  coverageCoordinates: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number } | null;
  activeServices: number;
  completedThisWeek: number;
  avgResolutionHours: number;
  loadStatus: 'baja' | 'normal' | 'alta';
  distanceKm: number | null;
  etaMinutes: number | null;
  coversIncident: boolean;
  isRecommended: boolean;
}

export interface WorkOrderView {
  id: string;
  orderFolio: string;
  workOrderStatus: string;
  assignedAt: string;
  slaDeadline: string;
  fieldNotes: string | null;
  crewId: string;
  crewName: string;
  reportId: string;
  folio: string;
  departmentCode: string;
  departmentName: string;
  categoryName: string;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  reportStatus: string;
  addressReference: string;
  description: string;
  upvotesCount: number;
  lat: number;
  lng: number;
  distanceKm: number;
  etaMinutes: number;
  elapsedHours: number;
  remainingHours: number;
  slaHours: number;
  slaStatus: 'a_tiempo' | 'en_riesgo' | 'critico';
  priorityScore: number;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AnalyticsDashboard {
  kpis: {
    totalReports: number;
    resolvedReports: number;
    pendingReports: number;
    rejectedReports: number;
    slaCompliancePct: number;
    avgResolutionHours: number;
    groupedConfirmations: number;
    activeCrewsCount: number;
  };
  byDepartment: Array<{
    id: string;
    code: string;
    name: string;
    colorHex: string;
    total: number;
    resolved: number;
    pending: number;
  }>;
  byStatus: Array<{ status: string; count: number }>;
  byRiskLevel: Array<{ riskLevel: string; count: number }>;
  heatmapPoints: Array<{
    id: string;
    folio: string;
    lat: number;
    lng: number;
    weight: number;
    riskLevel: string;
    status: string;
    departmentCode: string;
    addressReference: string;
  }>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  reportId?: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {},
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const baseUrl = getBackendUrl();
  const headers = new Headers(fetchOptions.headers || {});

  if (
    !(fetchOptions.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      `No se pudo conectar con el servidor (${baseUrl}). Verifica que el backend esté en ejecución.`,
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401 &&
      !skipAuthRedirect &&
      typeof window !== 'undefined'
    ) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
      if (
        !window.location.pathname.startsWith('/auth/login') &&
        window.location.pathname !== '/' &&
        window.location.pathname !== '/registro'
      ) {
        window.location.href = '/auth/login?sessionExpired=1';
      }
    }

    const rawMsg = data?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(' ')
      : rawMsg || `Error HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function uploadEvidenceFile(
  file: File,
  options?: { folio?: string; stage?: 'antes' | 'despues' },
): Promise<{ url: string; path?: string; provider?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.folio) {
    formData.append('folio', options.folio);
  }
  if (options?.stage) {
    formData.append('stage', options.stage);
  }
  return apiFetch<{ url: string; path?: string; provider?: string }>(
    '/uploads/evidence',
    {
      method: 'POST',
      body: formData,
      skipAuthRedirect: true,
    },
  );
}
