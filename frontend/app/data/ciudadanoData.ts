export type CitizenDependency = 'SIMAS' | 'La Ola' | 'Obras Públicas';

export interface CitizenReport {
  id: string;
  folio: string;
  dependency: CitizenDependency;
  title: string;
  description: string;
  address: string;
  status: 'En proceso' | 'Asignado' | 'Reportado' | 'Resuelto';
  confirmations: number;
  distanceMeters: number;
  reportedAt: string;
  hasConfirmed?: boolean;
  // Tailwind position classes on the stylized map container
  mapPosClass: string;
  timeline: {
    label: string;
    time: string;
    completed: boolean;
  }[];
}

export const INITIAL_CITIZEN_REPORTS: CitizenReport[] = [
  {
    id: 'cit-1',
    folio: 'SIM-2026-0842',
    dependency: 'SIMAS',
    title: 'Fuga de agua en vía pública',
    description: 'Fuga considerable sobre carril vehicular por ruptura de línea secundaria.',
    address: 'Av. Juárez y Calz. Colón · Centro',
    status: 'En proceso',
    confirmations: 24,
    distanceMeters: 28,
    reportedAt: 'Hoy · 09:20',
    hasConfirmed: false,
    mapPosClass: 'top-[28%] left-[25%]',
    timeline: [
      { label: 'Reporte recibido en plataforma', time: '09:20', completed: true },
      { label: 'Asignado a Cuadrilla 03 · Sector Centro', time: '09:45', completed: true },
      { label: 'Cuadrilla en sitio realizando reparación', time: '10:30', completed: true },
      { label: 'Cierre con evidencia fotográfica', time: 'Pendiente', completed: false },
    ],
  },
  {
    id: 'cit-2',
    folio: 'OLA-2026-1120',
    dependency: 'La Ola',
    title: 'Acumulación de escombros en camellón',
    description: 'Descarga clandestina de desechos de construcción obstruyendo visibilidad.',
    address: 'Av. Morelos y C. Cepeda · Centro',
    status: 'Asignado',
    confirmations: 18,
    distanceMeters: 145,
    reportedAt: 'Ayer · 21:00',
    hasConfirmed: false,
    mapPosClass: 'top-[42%] left-[64%]',
    timeline: [
      { label: 'Reporte recibido en plataforma', time: '21:00', completed: true },
      { label: 'Asignado a Cuadrilla La Ola 02', time: '08:15', completed: true },
      { label: 'Unidad en camino', time: 'En curso', completed: false },
    ],
  },
  {
    id: 'cit-3',
    folio: 'OBP-2026-0512',
    dependency: 'Obras Públicas',
    title: 'Socavón en carpeta asfáltica',
    description: 'Hundimiento severo en esquina con riesgo para vehículos.',
    address: 'Blvd. Independencia y C. Falcón · Centro',
    status: 'Reportado',
    confirmations: 34,
    distanceMeters: 310,
    reportedAt: 'Hace 2 días',
    hasConfirmed: false,
    mapPosClass: 'top-[12%] left-[13%]',
    timeline: [
      { label: 'Reporte recibido en plataforma', time: '23 oct · 20:10', completed: true },
      { label: 'Validación técnica pendiente', time: 'En revisión', completed: false },
    ],
  },
  {
    id: 'cit-4',
    folio: 'SIM-2026-0836',
    dependency: 'SIMAS',
    title: 'Fuga en red de agua potable',
    description: 'Sustitución de tramo de tubería y restablecimiento de presión.',
    address: 'Av. Hidalgo 305 · Centro',
    status: 'Resuelto',
    confirmations: 16,
    distanceMeters: 210,
    reportedAt: '23 oct · 17:00',
    hasConfirmed: true,
    mapPosClass: 'top-[66%] left-[70%]',
    timeline: [
      { label: 'Reporte recibido', time: '23 oct · 17:00', completed: true },
      { label: 'Reparado por Cuadrilla 03', time: '24 oct · 11:00', completed: true },
    ],
  },
];
