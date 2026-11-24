'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, RefreshCw } from 'lucide-react';
import { AppLoader } from '../components/AppLoader';
import { CiudadanoHeader } from '../components/CiudadanoHeader';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import { apiFetch, ApiError, ApiReport } from '../lib/api';
import { useRequireAuth } from '../lib/auth';

type FiltroReportes = 'todos' | 'activos' | 'resueltos';

function getBadgeStyle(status: ApiReport['currentStatus']) {
  if (status === 'EN_PROCESO') {
    return {
      label: 'En proceso',
      bg: 'bg-[#edf5ff]',
      text: 'text-[#155ead]',
      dot: 'bg-[#155ead]',
    };
  }
  if (status === 'ASIGNADO') {
    return {
      label: 'Asignado',
      bg: 'bg-[#fef7e6]',
      text: 'text-[#966409]',
      dot: 'bg-[#d97706]',
    };
  }
  if (status === 'RESUELTO') {
    return {
      label: 'Resuelto',
      bg: 'bg-[#e9f7ef]',
      text: 'text-[#18734a]',
      dot: 'bg-[#18734a]',
    };
  }
  if (status === 'RECHAZADO') {
    return {
      label: 'Rechazado',
      bg: 'bg-[#fdeef0]',
      text: 'text-[#be313b]',
      dot: 'bg-[#be313b]',
    };
  }
  return {
    label: 'Recibido',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
  };
}

export default function MisReportesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroReportes>('todos');
  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const loadMyReports = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ApiReport[]>('/reports/my');
      setReports(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar tus reportes.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Error de carga',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void loadMyReports();
    }
  }, [authLoading]);

  const reportesFiltrados = useMemo(() => {
    if (filtro === 'todos') return reports;
    if (filtro === 'activos') {
      return reports.filter(
        (r) => r.currentStatus !== 'RESUELTO' && r.currentStatus !== 'RECHAZADO',
      );
    }
    return reports.filter((r) => r.currentStatus === 'RESUELTO');
  }, [filtro, reports]);

  const totalTodos = reports.length;
  const totalActivos = reports.filter(
    (r) => r.currentStatus !== 'RESUELTO' && r.currentStatus !== 'RECHAZADO',
  ).length;
  const totalResueltos = reports.filter(
    (r) => r.currentStatus === 'RESUELTO',
  ).length;

  if (authLoading) {
    return (
      <AppLoader
        title="Cargando tus reportes"
        subtitle="Consultando historial y estatus actualizado"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader userOverride={user} />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172b43] leading-tight">
              Mis reportes
            </h1>
            <p className="text-[14px] text-[#5e7085] leading-relaxed">
              Consulta el avance en tiempo real y las confirmaciones vecinales de
              tus solicitudes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadMyReports()}
              className="h-[46px] px-3.5 bg-white border border-[#dce4ed] rounded-[12px] text-[#155ead] hover:bg-slate-50 cursor-pointer"
              title="Actualizar lista"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>

            <Link
              href="/reportar"
              className="hidden sm:inline-flex h-[46px] px-5 bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[12px] items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Crear un nuevo reporte</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'todos', label: `Todos · ${totalTodos}` },
              { key: 'activos', label: `Activos · ${totalActivos}` },
              { key: 'resueltos', label: `Resueltos · ${totalResueltos}` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFiltro(item.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                filtro === item.key
                  ? 'bg-[#edf5ff] text-[#155ead]'
                  : 'bg-transparent text-[#5e7085] hover:bg-white/70'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  filtro === item.key ? 'bg-[#155ead]' : 'bg-[#5e7085]'
                }`}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-[18px] bg-white border border-[#dce4ed] animate-pulse"
              />
            ))}
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="bg-white border border-dashed border-[#dce4ed] rounded-[18px] p-10 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-[#5e7085]">
              No tienes reportes en esta categoría todavía.
            </p>
            <Link
              href="/reportar"
              className="px-5 py-2.5 rounded-[12px] bg-[#155ead] text-white text-sm font-semibold"
            >
              Reportar una falla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reportesFiltrados.map((reporte) => {
              const badge = getBadgeStyle(reporte.currentStatus);
              return (
                <article
                  key={reporte.id}
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
                        {badge.label}
                      </span>
                    </div>

                    <h2 className="text-[17px] font-bold text-[#172b43]">
                      {reporte.categoryName}
                    </h2>

                    <p className="text-[13px] text-[#5e7085]">
                      {reporte.addressReference}
                    </p>

                    <p className="text-[12px] text-[#5e7085] line-clamp-2">
                      {reporte.assignedCrewName
                        ? `Atendido por: ${reporte.assignedCrewName}`
                        : `${reporte.upvotesCount} confirmaciones vecinales`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#f0f4f8] flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#5e7085]">
                      {new Date(reporte.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Link
                      href={`/mis-reportes/${encodeURIComponent(reporte.folio)}`}
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
        )}

        <div className="pt-2 sm:hidden">
          <Link
            href="/reportar"
            className="w-full h-[52px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear un nuevo reporte</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
