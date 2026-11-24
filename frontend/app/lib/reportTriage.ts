import { CategoryItem } from './api';

export type ProblemAreaKey =
  | 'AGUA_DRENAJE'
  | 'LIMPIEZA_ESPACIOS'
  | 'VIALIDAD_OBRAS';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface TriageIssueOption {
  id: string;
  label: string;
  helper: string;
  departmentCode: 'SIM' | 'OLA' | 'OBP';
  categoryName: string;
  baseRisk: RiskLevel;
}

export const PROBLEM_AREAS: Array<{
  key: ProblemAreaKey;
  label: string;
  departmentCode: 'SIM' | 'OLA' | 'OBP';
}> = [
  {
    key: 'AGUA_DRENAJE',
    label: 'Agua potable, fugas, drenaje o alcantarillado',
    departmentCode: 'SIM',
  },
  {
    key: 'LIMPIEZA_ESPACIOS',
    label: 'Basura, escombro, maleza o limpieza de calles y plazas',
    departmentCode: 'OLA',
  },
  {
    key: 'VIALIDAD_OBRAS',
    label: 'Baches, pavimento, banquetas, puentes o infraestructura urbana',
    departmentCode: 'OBP',
  },
];

export const TRIAGE_ISSUES_BY_AREA: Record<ProblemAreaKey, TriageIssueOption[]> =
  {
    AGUA_DRENAJE: [
      {
        id: 'sim_fuga_agua',
        label: 'Fuga o derrame de agua potable en calle, banqueta o toma',
        helper: 'Ruptura de tubería o filtración visible de agua limpia.',
        departmentCode: 'SIM',
        categoryName: 'Fuga de Agua Potable',
        baseRisk: 'ALTO',
      },
      {
        id: 'sim_aguas_negras',
        label: 'Brote de aguas negras, drenaje colapsado o mal olor sanitario',
        helper: 'Desbordamiento de alcantarillado sanitario con riesgo a la salud.',
        departmentCode: 'SIM',
        categoryName: 'Brote de Aguas Negras / Drenaje Colapsado',
        baseRisk: 'CRITICO',
      },
      {
        id: 'sim_alcantarilla',
        label: 'Alcantarilla, registro o boca de tormenta sin tapa o rota',
        helper: 'Registro abierto con peligro de caída para peatones o vehículos.',
        departmentCode: 'SIM',
        categoryName: 'Alcantarilla sin Tapa',
        baseRisk: 'CRITICO',
      },
      {
        id: 'sim_baja_presion',
        label: 'Falta de suministro de agua potable o muy baja presión',
        helper: 'Sin servicio de agua o flujo mínimo en la red de la colonia.',
        departmentCode: 'SIM',
        categoryName: 'Falta de Agua o Baja Presión',
        baseRisk: 'ALTO',
      },
      {
        id: 'sim_azolve',
        label: 'Drenaje azolvado o encharcamiento persistente en colector / cárcamo',
        helper: 'Requiere limpieza y desazolve con camión Vactor.',
        departmentCode: 'SIM',
        categoryName: 'Azolve o Encharcamiento en Colector / Cárcamo',
        baseRisk: 'ALTO',
      },
    ],
    LIMPIEZA_ESPACIOS: [
      {
        id: 'ola_basura',
        label: 'Acumulación de basura o tiradero clandestino en vía pública / lote',
        helper: 'Desechos sólidos acumulados en calles, lotes baldíos o esquinas.',
        departmentCode: 'OLA',
        categoryName: 'Acumulación de Basura / Tiradero Clandestino',
        baseRisk: 'MEDIO',
      },
      {
        id: 'ola_escombro',
        label: 'Escombro, ramas o maleza crecida invadiendo banqueta o calle',
        helper: 'Restos de obra o desecho vegetal obstruyendo el paso.',
        departmentCode: 'OLA',
        categoryName: 'Escombro o Maleza Invadiendo Vialidad',
        baseRisk: 'ALTO',
      },
      {
        id: 'ola_barrido',
        label: 'Calle, bulevar o camellón sucio que requiere barrido manual',
        helper: 'Tierra, hojas o basura dispersa en vialidades o camellones.',
        departmentCode: 'OLA',
        categoryName: 'Falta de Barrido en Vialidad o Camellón',
        baseRisk: 'BAJO',
      },
      {
        id: 'ola_plaza',
        label: 'Limpieza de plaza, parque, monumento o contenedor desbordado',
        helper: 'Mantenimiento y retiro de basura en espacios públicos.',
        departmentCode: 'OLA',
        categoryName: 'Limpieza de Plaza, Parque o Contenedor',
        baseRisk: 'MEDIO',
      },
    ],
    VIALIDAD_OBRAS: [
      {
        id: 'obp_bache',
        label: 'Bache profundo o desprendimiento de asfalto en calle o bulevar',
        helper: 'Daño en carpeta asfáltica que afecta el tránsito vehicular.',
        departmentCode: 'OBP',
        categoryName: 'Bache Profundo en Vialidad',
        baseRisk: 'MEDIO',
      },
      {
        id: 'obp_socavon',
        label: 'Hundimiento grave o socavón en el pavimento',
        helper: 'Fractura profunda del subsuelo con riesgo de colapso.',
        departmentCode: 'OBP',
        categoryName: 'Hundimiento / Socavón en Pavimento',
        baseRisk: 'CRITICO',
      },
      {
        id: 'obp_banqueta',
        label: 'Daño en banqueta, guarnición, puente o paso a desnivel',
        helper: 'Infraestructura vial o peatonal fracturada o deteriorada.',
        departmentCode: 'OBP',
        categoryName: 'Daño en Banqueta, Guarnición o Paso Vial',
        baseRisk: 'MEDIO',
      },
      {
        id: 'obp_espacio',
        label: 'Deterioro estructural en parque, techumbre escolar o centro comunitario',
        helper: 'Daño físico en obra pública o equipamiento comunitario.',
        departmentCode: 'OBP',
        categoryName: 'Deterioro en Parque, Techumbre o Espacio Comunitario',
        baseRisk: 'MEDIO',
      },
    ],
  };

export const LOCATION_CONTEXT_BY_AREA: Record<
  ProblemAreaKey,
  { question: string; options: string[] }
> = {
  AGUA_DRENAJE: {
    question: '¿Dónde se presenta la fuga, drenaje o falla hidráulica?',
    options: [
      'En medio de la calle o carril vehicular',
      'En banqueta o toma domiciliaria',
      'En esquina, registro o boca de tormenta',
      'Frente a viviendas, escuela o clínica',
    ],
  },
  LIMPIEZA_ESPACIOS: {
    question: '¿En qué espacio se encuentra la basura, escombro o maleza?',
    options: [
      'En calle, avenida, bulevar o camellón central',
      'En plaza, parque, paseo público o monumento',
      'En terreno baldío o tiradero clandestino',
      'En banqueta o contenedor de basura desbordado',
    ],
  },
  VIALIDAD_OBRAS: {
    question: '¿En qué parte de la vialidad o infraestructura está el daño?',
    options: [
      'En carril vehicular, calle o bulevar',
      'En banqueta, rampa peatonal o guarnición',
      'En puente vehicular o paso a desnivel',
      'En parque, techumbre escolar o centro comunitario',
    ],
  },
};

export const QUESTION_2_BY_AREA: Record<ProblemAreaKey, string> = {
  AGUA_DRENAJE: '¿Qué está ocurriendo exactamente con el agua o drenaje?',
  LIMPIEZA_ESPACIOS: '¿Qué tipo de limpieza o retiro se necesita?',
  VIALIDAD_OBRAS: '¿Qué daño en vialidad u obra pública observas?',
};

export const LOCATION_CONTEXT_OPTIONS = [
  'En medio de la calle / carril vehicular',
  'En la banqueta o paso peatonal',
  'En esquina, crucero o camellón central',
  'En plaza, parque o espacio público',
  'Frente a viviendas, escuela o comercio',
  'En terreno baldío o lote abandonado',
] as const;

export const IMPACT_LEVEL_OPTIONS: Array<{
  value: RiskLevel;
  label: string;
}> = [
  {
    value: 'BAJO',
    label: 'Bajo — Afectación menor o estética, no bloquea el paso',
  },
  {
    value: 'MEDIO',
    label: 'Medio — Molestia moderada en banqueta o vialidad',
  },
  {
    value: 'ALTO',
    label: 'Alto — Obstruye carriles, genera riesgo o afecta a varios vecinos',
  },
  {
    value: 'CRITICO',
    label: 'Crítico — Emergencia inmediata, peligro grave para peatones o vehículos',
  },
];

export const DURATION_OPTIONS = [
  'Acaba de ocurrir hoy',
  'Lleva entre 1 y 3 días',
  'Lleva más de una semana',
  'Es un problema recurrente en la zona',
] as const;

export const REFERENCE_SELECT_OPTIONS = [
  'Sin referencia adicional',
  'Frente a domicilio particular',
  'Frente a comercio o negocio',
  'Frente a escuela, clínica o parque',
  'En esquina o crucero principal',
  'Junto a camellón o glorieta',
  'En terreno baldío o zona poco iluminada',
] as const;

const RISK_ORDER: Record<RiskLevel, number> = {
  BAJO: 1,
  MEDIO: 2,
  ALTO: 3,
  CRITICO: 4,
};

export interface EvaluatedTriage {
  issue: TriageIssueOption;
  departmentCode: 'SIM' | 'OLA' | 'OBP';
  matchedCategory: CategoryItem | null;
  computedRiskLevel: RiskLevel;
  generatedDescription: string;
}

export function evaluateReportTriage(params: {
  areaKey: ProblemAreaKey;
  issueId: string;
  locationContext: string;
  impactLevel: RiskLevel;
  duration: string;
  categories: CategoryItem[];
}): EvaluatedTriage {
  const areaIssues = TRIAGE_ISSUES_BY_AREA[params.areaKey];
  const issue =
    areaIssues.find((item) => item.id === params.issueId) ?? areaIssues[0];

  // Emparejar categoría real en BD por nombre exacto o por dependencia de respaldo
  const matchedCategory =
    params.categories.find(
      (c) =>
        c.name.trim().toLowerCase() === issue.categoryName.trim().toLowerCase(),
    ) ??
    params.categories.find(
      (c) => c.department?.code === issue.departmentCode,
    ) ??
    params.categories[0] ??
    null;

  // El riesgo final toma el mayor entre la gravedad base de la falla y el impacto percibido
  const computedRiskLevel: RiskLevel =
    RISK_ORDER[params.impactLevel] >= RISK_ORDER[issue.baseRisk]
      ? params.impactLevel
      : issue.baseRisk;

  const impactText =
    IMPACT_LEVEL_OPTIONS.find((opt) => opt.value === params.impactLevel)
      ?.label ?? params.impactLevel;

  const generatedDescription = [
    `Incidencia: ${issue.label}.`,
    `Ubicación en sitio: ${params.locationContext}.`,
    `Afectación reportada: ${impactText}.`,
    `Antigüedad: ${params.duration}.`,
  ].join(' ');

  return {
    issue,
    departmentCode: issue.departmentCode,
    matchedCategory,
    computedRiskLevel,
    generatedDescription,
  };
}
