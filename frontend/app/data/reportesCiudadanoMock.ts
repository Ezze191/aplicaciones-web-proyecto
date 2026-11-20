export type EstadoReporte = 'En proceso' | 'Asignado' | 'Resuelto';

export interface PasoTrazabilidad {
  titulo: string;
  fecha: string;
  descripcion: string;
  estado: 'completado' | 'actual' | 'pendiente';
}

export interface ReporteCiudadanoMock {
  folio: string;
  dependencia: 'SIMAS' | 'La Ola' | 'Obras Públicas';
  titulo: string;
  ubicacion: string;
  notaEstado: string;
  fechaRecibido: string;
  fechaCorta: string;
  estado: EstadoReporte;
  sla: string;
  actualizado: string;
  resumenCuadrillaTitle: string;
  resumenCuadrillaDesc: string;
  pasos: PasoTrazabilidad[];
}

export const REPORTES_CIUDADANO_MOCK: ReporteCiudadanoMock[] = [
  {
    folio: 'SIM-2026-0842',
    dependencia: 'SIMAS',
    titulo: 'Fuga de agua en vía pública',
    ubicacion: 'Av. Juárez y Calz. Colón · Centro',
    notaEstado: 'La cuadrilla 03 ya está en el sitio.',
    fechaRecibido: 'Recibido el 25 oct 2026 · 09:41',
    fechaCorta: '25 oct · 09:41',
    estado: 'En proceso',
    sla: 'SLA 24 hrs',
    actualizado: 'Actualizado hoy a las 11:20 · SLA 24 hrs',
    resumenCuadrillaTitle: 'La cuadrilla ya está trabajando',
    resumenCuadrillaDesc:
      'Cuadrilla 03 · Sector Centro. Se está reparando la tubería. Atención estimada antes del 26 oct, 09:41.',
    pasos: [
      {
        titulo: 'Recibido',
        fecha: '25 oct · 09:41',
        descripcion: 'Reporte registrado correctamente.',
        estado: 'completado',
      },
      {
        titulo: 'Asignado',
        fecha: '25 oct · 10:05',
        descripcion: 'Cuadrilla 03 · Sector Centro.',
        estado: 'completado',
      },
      {
        titulo: 'En proceso',
        fecha: '25 oct · 11:20',
        descripcion: 'Reparación de tubería en curso.',
        estado: 'actual',
      },
      {
        titulo: 'Resuelto',
        fecha: 'Pendiente',
        descripcion: 'Se notificará el cierre con evidencia.',
        estado: 'pendiente',
      },
    ],
  },
  {
    folio: 'OP-2026-0318',
    dependencia: 'Obras Públicas',
    titulo: 'Bache en carril de circulación',
    ubicacion: 'Av. Morelos 620 · Centro',
    notaEstado: 'Programado para el siguiente recorrido.',
    fechaRecibido: 'Recibido el 24 oct 2026 · 16:20',
    fechaCorta: '24 oct · 16:20',
    estado: 'Asignado',
    sla: 'SLA 48 hrs',
    actualizado: 'Actualizado ayer a las 18:10 · SLA 48 hrs',
    resumenCuadrillaTitle: 'Cuadrilla asignada al recorrido',
    resumenCuadrillaDesc:
      'Cuadrilla Bacheo 02 · Zona Centro. Programado para atención en el turno matutino.',
    pasos: [
      {
        titulo: 'Recibido',
        fecha: '24 oct · 16:20',
        descripcion: 'Reporte registrado correctamente.',
        estado: 'completado',
      },
      {
        titulo: 'Asignado',
        fecha: '24 oct · 18:10',
        descripcion: 'Cuadrilla Bacheo 02 · Zona Centro.',
        estado: 'actual',
      },
      {
        titulo: 'En proceso',
        fecha: 'Pendiente',
        descripcion: 'Rehabilitación de carpeta asfáltica.',
        estado: 'pendiente',
      },
      {
        titulo: 'Resuelto',
        fecha: 'Pendiente',
        descripcion: 'Se notificará el cierre con evidencia.',
        estado: 'pendiente',
      },
    ],
  },
  {
    folio: 'OLA-2026-0176',
    dependencia: 'La Ola',
    titulo: 'Basura sin recolectar',
    ubicacion: 'C. Acuña y Av. Hidalgo · Centro',
    notaEstado: 'Atendido y cerrado con evidencia.',
    fechaRecibido: 'Recibido el 23 oct 2026 · 12:05',
    fechaCorta: '23 oct · 12:05',
    estado: 'Resuelto',
    sla: 'SLA 24 hrs',
    actualizado: 'Cerrado el 23 oct a las 17:45 · SLA 24 hrs',
    resumenCuadrillaTitle: 'Reporte atendido y cerrado',
    resumenCuadrillaDesc:
      'Unidad de Recolección 11 completó la limpieza del punto con evidencia fotográfica.',
    pasos: [
      {
        titulo: 'Recibido',
        fecha: '23 oct · 12:05',
        descripcion: 'Reporte registrado correctamente.',
        estado: 'completado',
      },
      {
        titulo: 'Asignado',
        fecha: '23 oct · 13:15',
        descripcion: 'Unidad de Recolección 11 · Centro.',
        estado: 'completado',
      },
      {
        titulo: 'En proceso',
        fecha: '23 oct · 16:30',
        descripcion: 'Retiro de residuos en el punto.',
        estado: 'completado',
      },
      {
        titulo: 'Resuelto',
        fecha: '23 oct · 17:45',
        descripcion: 'Atendido y cerrado con evidencia.',
        estado: 'completado',
      },
    ],
  },
];
