export type DependencyKey = 'simas' | 'la-ola' | 'obras-publicas';

export type ReportStatus = 'nuevos' | 'asignados' | 'en_reparacion' | 'resueltos';

export type PriorityLevel = 'critico' | 'en_riesgo' | 'a_tiempo';

export interface Report {
  id: string;
  folio: string;
  title: string;
  description?: string;
  address: string;
  colonia: string;
  status: ReportStatus;
  priority: PriorityLevel;
  elapsedHours: number;
  slaHours: number;
  confirmations: number;
  assignedCrew?: string;
  resolvedInHours?: number;
  reportedAt: string;
  hasEvidence?: boolean;
  evidenceImage?: string;
  resolutionEvidenceImage?: string;
  coordinates?: {
    lat: number;
    lng: number;
    referenceStreet: string;
  };
}

export interface Crew {
  id: string;
  name: string;
  sector: string;
  isRecommended?: boolean;
  loadStatus: 'normal' | 'alta' | 'baja';
  distance: string;
  eta: string;
  activeServices: number;
}

export interface DependencyConfig {
  key: DependencyKey;
  shortName: string;
  fullName: string;
  subtitle: string;
  headerBg: string;
  headerBgClass: string;
  accentColor: string;
  accentBtnClass: string;
  accentTextClass: string;
  accentBorderClass: string;
  accentLight: string;
  accentLightBgClass: string;
  borderAccent: string;
  badgeBg: string;
  iconName: 'droplets' | 'wave' | 'hammer';
  slaReferenceHours: number;
  colonias: string[];
  crews: Crew[];
}

