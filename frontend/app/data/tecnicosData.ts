export type TechReportStatus = 'Asignado' | 'En proceso' | 'Resuelto';
export type TechPriority = 'Crítico' | 'En riesgo' | 'A tiempo';

export interface TechReport {
  id: string;
  folio: string;
  shortCode: string;
  title: string;
  description: string;
  address: string;
  distanceKm: number;
  etaMinutes: number;
  status: TechReportStatus;
  priority: TechPriority;
  elapsedText: string;
  elapsedMinutesTotal: number;
  slaHours: number;
  confirmations: number;
  assignedAt: string;
  resolvedAt?: string;
  evidenceImage: string;
  mapPosClass: string;
}

export const INITIAL_TECH_REPORTS: TechReport[] = [
  {
    id: 'tech-1',
    folio: 'SIM-2026-0843',
    shortCode: '0843',
    title: 'Drenaje obstruido',
    description:
      'Retorno de aguas residuales por registro pluvial domiciliario. Se requiere sondeo e inspección de pozo de visita.',
    address: 'C. Acuña 220 · Centro',
    distanceKm: 0.6,
    etaMinutes: 3,
    status: 'Asignado',
    priority: 'En riesgo',
    elapsedText: '20 h 04 min transcurridos · SLA 24 h',
    elapsedMinutesTotal: 1204,
    slaHours: 24,
    confirmations: 8,
    assignedAt: 'Hoy · 08:15',
    evidenceImage: '/images/evidencia-ciudadana.png',
    mapPosClass: 'top-[41%] left-[19%]',
  },
  {
    id: 'tech-2',
    folio: 'SIM-2026-0845',
    shortCode: '0845',
    title: 'Fuga en toma domiciliaria',
    description:
      'Fuga considerable de agua potable brotando en banqueta frente a domicilio residencial. Lleva 3 h 04 min fuera de SLA.',
    address: 'C. Falcón 350 · Centro',
    distanceKm: 1.2,
    etaMinutes: 6,
    status: 'Asignado',
    priority: 'Crítico',
    elapsedText: '27 h 04 min transcurridos · SLA 24 h',
    elapsedMinutesTotal: 1624,
    slaHours: 24,
    confirmations: 12,
    assignedAt: 'Hoy · 07:40',
    evidenceImage: '/images/evidencia-ciudadana.png',
    mapPosClass: 'top-[32%] left-[53%]',
  },
  {
    id: 'tech-3',
    folio: 'SIM-2026-0831',
    shortCode: '0831',
    title: 'Desazolve de drenaje',
    description:
      'Limpieza con camión hidroneumático y retiro de tapón de azolve en red sanitaria.',
    address: 'C. Leona Vicario 182 · Centro',
    distanceKm: 1.8,
    etaMinutes: 9,
    status: 'Resuelto',
    priority: 'A tiempo',
    elapsedText: 'Resuelto en 21 h · SLA 24 h',
    elapsedMinutesTotal: 1260,
    slaHours: 24,
    confirmations: 7,
    assignedAt: '23 oct · 14:15',
    resolvedAt: '24 oct · 11:15',
    evidenceImage: '/images/evidencia-ciudadana.png',
    mapPosClass: 'top-[55%] left-[72%]',
  },
];

export const CREW_INFO = {
  crewName: 'Flotilla · Cuadrilla 02',
  dependency: 'SIMAS Torreón · Sector Norte',
  unit: 'Unidad Hidroneumática V-024',
  leader: 'Carlos Mendoza · Jefe de Cuadrilla',
  members: [
    'Carlos Mendoza (Técnico Especialista)',
    'Roberto Díaz (Operador de Unidad)',
    'Miguel Ángel Torres (Auxiliar de Campo)',
  ],
  shift: 'Turno Matutino · 07:00 - 15:00 h',
  completedThisWeek: 14,
  avgResolutionHours: '16.5 h',
};
