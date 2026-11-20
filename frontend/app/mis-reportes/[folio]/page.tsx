'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, RefreshCw, Map as MapIcon } from 'lucide-react';
import { CiudadanoHeader } from '../../components/CiudadanoHeader';
import { AlertType, SweetAlert } from '../../components/SweetAlert';
import { REPORTES_CIUDADANO_MOCK } from '../../data/reportesCiudadanoMock';

function TrazabilidadReporteContent() {
  const params = useParams<{ folio?: string }>();
  const folioParam = decodeURIComponent(params?.folio ?? 'SIM-2026-0842');

  const reporte =
    REPORTES_CIUDADANO_MOCK.find(
      (r) => r.folio.toUpperCase() === folioParam.toUpperCase(),
    ) ?? {
      ...REPORTES_CIUDADANO_MOCK[0],
      folio: folioParam.toUpperCase(),
    };

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

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader
        onBellClick={() =>
          setAlertState({
            open: true,
            type: 'info',
            title: 'Notificaciones',
            message: `Seguimiento activo para el folio ${reporte.folio}.`,
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
        <div className="space-y-3">
          <Link
            href="/mis-reportes"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#155ead] hover:underline w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mis reportes</span>
          </Link>

          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172b43] leading-tight">
            Así va tu reporte
          </h1>
        </div>

        {/* 1 columna en móvil (Figma), 2 columnas en web */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Columna izquierda: Resumen y estado de cuadrilla */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <section className="bg-white border border-[#dce4ed] rounded-[18px] p-5 sm:p-6 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[16px] font-semibold text-[#0e315a]">
                  {reporte.folio}
                </span>
                <span className="text-[12px] font-bold text-[#155ead]">
                  {reporte.dependencia}
                </span>
              </div>

              <h2 className="text-[17px] font-bold text-[#172b43]">
                {reporte.titulo}
              </h2>

              <p className="text-[13px] text-[#5e7085] leading-relaxed">
                {reporte.ubicacion} {reporte.fechaRecibido}
              </p>

              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ff] px-3 py-1 text-[12px] font-semibold text-[#155ead]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#155ead]" />
                  {reporte.estado} · Estado actual
                </span>
              </div>
            </section>

            <section className="bg-[#edf5ff] rounded-[16px] p-5 space-y-1.5 border border-[#d6e7ff]">
              <h3 className="text-[14px] font-bold text-[#155ead]">
                {reporte.resumenCuadrillaTitle}
              </h3>
              <p className="text-[13px] text-[#5e7085] leading-relaxed">
                {reporte.resumenCuadrillaDesc}
              </p>
            </section>

            <Link
              href="/dashboard-ciudadano"
              className="hidden lg:flex w-full h-[48px] bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[14px] items-center justify-center gap-2 transition-colors"
            >
              <MapIcon className="w-4 h-4" />
              <span>Ver ubicación en el mapa</span>
            </Link>
          </div>

          {/* Columna derecha: Línea de tiempo */}
          <div className="lg:col-span-7 flex flex-col gap-5 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-[18px] lg:p-7 lg:shadow-xs">
            <h3 className="hidden lg:block text-[15px] font-bold text-[#172b43]">
              Seguimiento de atención
            </h3>

            <ol className="flex flex-col">
              {reporte.pasos.map((paso, index) => {
                const completado = paso.estado === 'completado';
                const actual = paso.estado === 'actual';
                const pendiente = paso.estado === 'pendiente';
                const esUltimo = index === reporte.pasos.length - 1;

                return (
                  <li key={paso.titulo} className="flex gap-3.5 items-start">
                    <div className="flex flex-col items-center shrink-0 w-[28px]">
                      <div
                        className={`size-[28px] rounded-full flex items-center justify-center ${
                          completado
                            ? 'bg-[#155ead] text-white'
                            : actual
                              ? 'bg-white border-2 border-[#155ead]'
                              : 'bg-[#e8eef5] border border-[#dce4ed]'
                        }`}
                      >
                        {completado ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : actual ? (
                          <span className="size-2.5 rounded-full bg-[#155ead]" />
                        ) : (
                          <span className="size-2 rounded-full bg-[#9fb0c4]" />
                        )}
                      </div>

                      {!esUltimo && (
                        <div
                          className={`w-[2px] h-[54px] ${
                            completado ? 'bg-[#155ead]' : 'bg-[#dce4ed]'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-[15px] font-medium ${
                            pendiente ? 'text-[#8ea0b5]' : 'text-[#172b43]'
                          }`}
                        >
                          {paso.titulo}
                        </p>
                        {actual && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#155ead]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#155ead]" />
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#5e7085]">{paso.fecha}</p>
                      <p className="text-[13px] text-[#5e7085] pt-0.5">
                        {paso.descripcion}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center gap-2 text-[12px] text-[#5e7085] pt-1 lg:border-t lg:border-[#f0f4f8] lg:pt-4">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>{reporte.actualizado}</span>
            </div>

            <Link
              href="/dashboard-ciudadano"
              className="lg:hidden w-full h-[48px] bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 transition-colors"
            >
              <MapIcon className="w-4 h-4" />
              <span>Ver ubicación en el mapa</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TrazabilidadReportePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
          <CiudadanoHeader />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-48 rounded-[18px] bg-white border border-[#dce4ed] animate-pulse" />
          </main>
        </div>
      }
    >
      <TrazabilidadReporteContent />
    </Suspense>
  );
}
