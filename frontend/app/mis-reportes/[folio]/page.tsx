'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  RefreshCw,
  Share2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { CiudadanoHeader } from '../../components/CiudadanoHeader';
import { AlertType, SweetAlert } from '../../components/SweetAlert';
import {
  apiFetch,
  ApiError,
  ApiReport,
  PhotographicEvidenceItem,
  ReportHistoryItem,
} from '../../lib/api';

const InteractiveMap = dynamic(
  () => import('../../components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface FolioDetailResponse {
  report: ApiReport;
  history: ReportHistoryItem[];
  evidences: PhotographicEvidenceItem[];
}

function TrazabilidadReporteContent() {
  const params = useParams<{ folio?: string }>();
  const folioParam = decodeURIComponent(params?.folio ?? '').toUpperCase();

  const [data, setData] = useState<FolioDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const loadFolio = async () => {
    if (!folioParam) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<FolioDetailResponse>(
        `/reports/folio/${encodeURIComponent(folioParam)}`,
        { skipAuthRedirect: true },
      );
      setData(res);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : 'No se pudo consultar el expediente del folio.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folioParam]);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setAlertState({
          open: true,
          type: 'success',
          title: 'Enlace copiado',
          message: `El enlace público de seguimiento para ${folioParam} se copió al portapapeles.`,
        });
      }
    } catch {
      // ignore
    }
  };

  const timelineSteps = [
    { key: 'REGISTRADO', titulo: 'Recibido', desc: 'Reporte registrado y geo-validado.' },
    { key: 'ASIGNADO', titulo: 'Asignado', desc: 'Orden de trabajo despachada a cuadrilla.' },
    { key: 'EN_PROCESO', titulo: 'En proceso', desc: 'Cuadrilla trabajando en sitio.' },
    { key: 'RESUELTO', titulo: 'Resuelto', desc: 'Cierre técnico con evidencia fotográfica.' },
  ];

  const getStepIndex = (status: ApiReport['currentStatus']) => {
    switch (status) {
      case 'REGISTRADO':
      case 'VALIDADO':
        return 0;
      case 'ASIGNADO':
        return 1;
      case 'EN_PROCESO':
        return 2;
      case 'RESUELTO':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Link
              href="/mis-reportes"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#155ead] hover:underline w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Mis reportes</span>
            </Link>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172b43] leading-tight">
              Trazabilidad del folio {folioParam}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadFolio()}
              className="h-10 px-3.5 bg-white border border-[#dce4ed] rounded-[10px] text-[#155ead] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-10 px-3.5 bg-[#155ead] text-white rounded-[10px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 rounded-[18px] bg-white border border-[#dce4ed] animate-pulse" />
        ) : errorMsg || !data ? (
          <div className="bg-white border border-[#f5c6cb] rounded-[18px] p-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-[#be313b]" />
            <p className="text-sm font-semibold text-[#172b43]">
              {errorMsg || 'Folio no encontrado.'}
            </p>
            <Link
              href="/auth/login#rastreo"
              className="px-4 py-2 rounded-[10px] bg-[#155ead] text-white text-xs font-semibold"
            >
              Buscar otro folio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Izquierda: Resumen + Mapa + Evidencias Antes/Después */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <section className="bg-white border border-[#dce4ed] rounded-[18px] p-5 sm:p-6 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[16px] font-bold text-[#0e315a]">
                    {data.report.folio}
                  </span>
                  <span className="text-[12px] font-bold text-[#155ead]">
                    {data.report.departmentCode} · {data.report.departmentName}
                  </span>
                </div>

                <h2 className="text-[18px] font-bold text-[#172b43]">
                  {data.report.categoryName}
                </h2>

                <p className="text-[13px] text-[#5e7085] leading-relaxed">
                  {data.report.addressReference}
                </p>

                <p className="text-[13px] text-[#172b43]">
                  {data.report.description}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ff] px-3 py-1 text-[12px] font-semibold text-[#155ead]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#155ead]" />
                    {data.report.currentStatus.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[#5e7085]">
                    {data.report.upvotesCount} confirmaciones · SLA{' '}
                    {data.report.slaHours} h
                  </span>
                </div>
              </section>

              {data.report.assignedCrewName && (
                <section className="bg-[#edf5ff] rounded-[16px] p-5 space-y-1.5 border border-[#d6e7ff]">
                  <h3 className="text-[14px] font-bold text-[#155ead]">
                    Cuadrilla responsable
                  </h3>
                  <p className="text-[13px] font-semibold text-[#0e315a]">
                    {data.report.assignedCrewName}
                  </p>
                  {data.report.workOrderNotes && (
                    <p className="text-[12px] text-[#5e7085]">
                      {data.report.workOrderNotes}
                    </p>
                  )}
                </section>
              )}

              <InteractiveMap
                center={{ lat: data.report.lat, lng: data.report.lng }}
                zoom={16}
                heightClass="h-[220px]"
                markers={[
                  {
                    id: data.report.id,
                    lat: data.report.lat,
                    lng: data.report.lng,
                    title: data.report.folio,
                    colorHex: data.report.departmentColor,
                    selected: true,
                  },
                ]}
              />

              {/* Comparativa Antes y Después */}
              {(data.report.beforeImageUrl || data.report.afterImageUrl) && (
                <section className="bg-white border border-[#dce4ed] rounded-[18px] p-5 space-y-3">
                  <h3 className="text-[14px] font-bold text-[#0e315a]">
                    Evidencia fotográfica auditada
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.report.beforeImageUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase text-[#5e7085]">
                          Antes (Reporte ciudadano)
                        </span>
                        <div className="rounded-xl overflow-hidden border border-[#dce4ed] aspect-[4/3] bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data.report.beforeImageUrl}
                            alt="Evidencia antes"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {data.report.afterImageUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase text-[#18734a] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Después (Cierre en sitio)
                        </span>
                        <div className="rounded-xl overflow-hidden border border-[#c1e5cf] aspect-[4/3] bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data.report.afterImageUrl}
                            alt="Evidencia después"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Derecha: Línea de tiempo real */}
            <div className="lg:col-span-7 flex flex-col gap-5 bg-white border border-[#dce4ed] rounded-[18px] p-5 sm:p-7 shadow-xs">
              <h3 className="text-[16px] font-bold text-[#172b43]">
                Seguimiento de atención
              </h3>

              {data.report.currentStatus === 'RECHAZADO' ? (
                <div className="bg-[#fdeef0] border border-[#f5c6cb] rounded-xl p-4 text-sm text-[#be313b]">
                  <p className="font-bold">Solicitud rechazada</p>
                  <p className="mt-1">
                    {data.history[data.history.length - 1]?.notes ||
                      'Revisa los motivos con la dependencia correspondiente.'}
                  </p>
                </div>
              ) : (
                <ol className="flex flex-col">
                  {timelineSteps.map((paso, index) => {
                    const currentIdx = getStepIndex(data.report.currentStatus);
                    const completado =
                      index < currentIdx ||
                      data.report.currentStatus === 'RESUELTO';
                    const actual =
                      index === currentIdx &&
                      data.report.currentStatus !== 'RESUELTO';
                    const pendiente = !completado && !actual;
                    const esUltimo = index === timelineSteps.length - 1;
                    const historyItem = data.history.find(
                      (h) => h.newStatus === paso.key,
                    );

                    return (
                      <li key={paso.key} className="flex gap-3.5 items-start">
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
                              className={`text-[15px] font-semibold ${
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
                          <p className="text-[12px] text-[#5e7085]">
                            {historyItem
                              ? new Date(historyItem.createdAt).toLocaleString(
                                  'es-MX',
                                  { dateStyle: 'medium', timeStyle: 'short' },
                                )
                              : completado
                                ? 'Completado'
                                : 'Pendiente'}
                          </p>
                          <p className="text-[13px] text-[#5e7085] pt-0.5">
                            {historyItem?.notes || paso.desc}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrazabilidadReportePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f6fa] flex items-center justify-center text-sm text-[#5e7085]">
          Cargando expediente...
        </div>
      }
    >
      <TrazabilidadReporteContent />
    </Suspense>
  );
}
