'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';
import { CiudadanoHeader } from '../components/CiudadanoHeader';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import {
  EstadoReporte,
  REPORTES_CIUDADANO_MOCK,
} from '../data/reportesCiudadanoMock';

type FiltroReportes = 'todos' | 'activos' | 'resueltos';

function getBadgeStyle(estado: EstadoReporte) {
  if (estado === 'En proceso') {
    return {
      bg: 'bg-[#edf5ff]',
      text: 'text-[#155ead]',
      dot: 'bg-[#155ead]',
    };
  }
  if (estado === 'Asignado') {
    return {
      bg: 'bg-[#fef7e6]',
      text: 'text-[#966409]',
      dot: 'bg-[#d97706]',
    };
  }
  return {
    bg: 'bg-[#e9f7ef]',
    text: 'text-[#18734a]',
    dot: 'bg-[#18734a]',
  };
}

export default function MisReportesPage() {
  const [filtro, setFiltro] = useState<FiltroReportes>('todos');
  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({
    open: false,
    type: 'info',
    message: '',
  });

  const reportesFiltrados = useMemo(() => {
    if (filtro === 'todos') return REPORTES_CIUDADANO_MOCK;
    if (filtro === 'activos') {
      return REPORTES_CIUDADANO_MOCK.filter((r) => r.estado !== 'Resuelto');
    }
    return REPORTES_CIUDADANO_MOCK.filter((r) => r.estado === 'Resuelto');
  }, [filtro]);

  const totalTodos = REPORTES_CIUDADANO_MOCK.length;
  const totalActivos = REPORTES_CIUDADANO_MOCK.filter(
    (r) => r.estado !== 'Resuelto',
  ).length;
  const totalResueltos = REPORTES_CIUDADANO_MOCK.filter(
    (r) => r.estado === 'Resuelto',
  ).length;

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader
        onBellClick={() =>
          setAlertState({
            open: true,
            type: 'info',
            title: 'Notificaciones',
            message:
              'La cuadrilla 03 actualizó el folio SIM-2026-0842 hace unos momentos.',
          })
        }
      />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-6">
        {/* Cabecera responsive */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172b43] leading-tight">
              Mis reportes
            </h1>
            <p className="text-[14px] text-[#5e7085] leading-relaxed">
              Cada reporte cuenta. Consulta su avance y las confirmaciones de tu
              comunidad.
            </p>
          </div>

          <Link
            href="/reportar"
            className="hidden sm:inline-flex h-[46px] px-5 bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[12px] items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear un nuevo reporte</span>
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              filtro === 'todos'
                ? 'bg-[#edf5ff] text-[#155ead]'
                : 'bg-transparent text-[#5e7085] hover:bg-white/70'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                filtro === 'todos' ? 'bg-[#155ead]' : 'bg-[#5e7085]'
              }`}
            />
            <span>Todos · {totalTodos}</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltro('activos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              filtro === 'activos'
                ? 'bg-[#edf5ff] text-[#155ead]'
                : 'bg-transparent text-[#5e7085] hover:bg-white/70'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                filtro === 'activos' ? 'bg-[#155ead]' : 'bg-[#5e7085]'
              }`}
            />
            <span>Activos · {totalActivos}</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltro('resueltos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              filtro === 'resueltos'
                ? 'bg-[#edf5ff] text-[#155ead]'
                : 'bg-transparent text-[#5e7085] hover:bg-white/70'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                filtro === 'resueltos' ? 'bg-[#155ead]' : 'bg-[#5e7085]'
              }`}
            />
            <span>Resueltos · {totalResueltos}</span>
          </button>
        </div>

        {/* Grid responsive: 1 columna en móvil (Figma), 2 en tablet, 3 en desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reportesFiltrados.map((reporte) => {
            const badge = getBadgeStyle(reporte.estado);
            return (
              <article
                key={reporte.folio}
                className="bg-white border border-[#dce4ed] rounded-[18px] p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-[#b5c7db] transition-colors"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#155ead]">
                      {reporte.folio}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}
                      />
                      {reporte.estado}
                    </span>
                  </div>

                  <h2 className="text-[17px] font-bold text-[#172b43]">
                    {reporte.titulo}
                  </h2>

                  <p className="text-[13px] text-[#5e7085]">
                    {reporte.ubicacion}
                  </p>

                  <p className="text-[13px] text-[#5e7085]">
                    {reporte.notaEstado}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#f0f4f8] flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#5e7085]">
                    {reporte.fechaCorta}
                  </span>
                  <Link
                    href={`/mis-reportes/${reporte.folio}`}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#155ead] hover:underline"
                  >
                    <span>Ver trazabilidad</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Botón inferior en móvil (como en Figma) */}
        <div className="pt-2 sm:hidden">
          <Link
            href="/reportar"
            className="w-full h-[52px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Crear un nuevo reporte</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
