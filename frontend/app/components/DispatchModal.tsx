'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CheckCircle2,
  Circle,
  MapPin,
  Truck,
  X,
} from 'lucide-react';
import { apiFetch, ApiError, ApiReport, CrewView } from '../lib/api';

const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface DispatchModalProps {
  report: ApiReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ApiReport, message: string) => void;
  onError: (message: string) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  report,
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [crews, setCrews] = useState<CrewView[]>([]);
  const [loadingCrews, setLoadingCrews] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !report) return;
    setLoadingCrews(true);
    setDispatchNotes('');
    apiFetch<CrewView[]>(
      `/crews?departmentId=${encodeURIComponent(report.departmentId)}&lat=${report.lat}&lng=${report.lng}`,
    )
      .then((list) => {
        const active = list.filter((c) => c.isActive);
        setCrews(active);
        const rec = active.find((c) => c.isRecommended) ?? active[0];
        setSelectedCrewId(rec?.id ?? '');
      })
      .catch(() => {
        setCrews([]);
      })
      .finally(() => setLoadingCrews(false));
  }, [isOpen, report]);

  if (!isOpen || !report) return null;

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) ?? null;

  const handleConfirm = async () => {
    if (!selectedCrewId) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<ApiReport>(`/reports/${report.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          crewId: selectedCrewId,
          notes: dispatchNotes.trim() || undefined,
        }),
      });
      onSuccess(
        updated,
        `Folio ${report.folio} despachado a ${selectedCrew?.name ?? 'cuadrilla'}.`,
      );
      onClose();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo despachar la cuadrilla.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/55 backdrop-blur-xs">
      <div
        className="bg-white rounded-[16px] sm:rounded-[20px] shadow-2xl border border-slate-100 w-full max-w-[1020px] max-h-[94vh] overflow-y-auto flex flex-col gap-5 p-4 sm:p-6 lg:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between w-full border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-bold text-[#0e315a] text-[20px] sm:text-[24px] leading-tight">
              Despachar cuadrilla
            </h2>
            <p className="text-[#5e7085] text-[12px] sm:text-[13px]">
              <span className="font-semibold text-[#155ead]">
                {report.folio}
              </span>{' '}
              · {report.categoryName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          {/* Izquierda: Evidencia y Mapa */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {report.beforeImageUrl && (
              <div className="relative h-[170px] w-full rounded-[14px] overflow-hidden bg-slate-100 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.beforeImageUrl}
                  alt="Evidencia ciudadana"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/65 text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                  Evidencia ciudadana adjunta
                </div>
              </div>
            )}

            <InteractiveMap
              center={{ lat: report.lat, lng: report.lng }}
              zoom={14}
              heightClass="h-[180px]"
              markers={[
                {
                  id: report.id,
                  lat: report.lat,
                  lng: report.lng,
                  colorHex: report.departmentColor,
                  selected: true,
                },
              ]}
              polygons={
                selectedCrew && selectedCrew.coverageCoordinates.length >= 3
                  ? [
                      {
                        id: selectedCrew.id,
                        name: selectedCrew.name,
                        coordinates: selectedCrew.coverageCoordinates,
                        colorHex: '#155ead',
                      },
                    ]
                  : []
              }
            />

            <div className="bg-[#f3f6fa] rounded-[12px] p-3.5 flex flex-col gap-1.5 border border-slate-200/60">
              <p className="font-semibold text-[#172b43] text-[13px]">
                {report.addressReference}
              </p>
              <p className="text-[#5e7085] text-[11px]">
                {report.upvotesCount} confirmaciones · {report.elapsedHours} h
                transcurridas (SLA {report.slaHours} h)
              </p>
            </div>
          </div>

          {/* Derecha: Cuadrillas disponibles */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-semibold text-[#172b43] text-[15px]">
                Selecciona una cuadrilla operativa
              </h3>
              <span className="text-[11px] text-[#5e7085] font-medium">
                {crews.length} disponibles
              </span>
            </div>

            {loadingCrews ? (
              <div className="h-36 rounded-xl bg-slate-100 animate-pulse" />
            ) : crews.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[#dce4ed] text-center text-xs text-[#5e7085]">
                No hay cuadrillas activas registradas para esta dependencia. Da
                de alta una en el módulo «Flotillas».
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {crews.map((crew) => {
                  const isSelected = crew.id === selectedCrewId;
                  return (
                    <div
                      key={crew.id}
                      onClick={() => setSelectedCrewId(crew.id)}
                      className={`p-3.5 rounded-[12px] border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#edf5ff] border-2 border-[#155ead] shadow-xs'
                          : 'bg-white border-[#dce4ed] hover:border-slate-300'
                      }`}
                    >
                      <div className="shrink-0 text-[#155ead]">
                        {isSelected ? (
                          <CheckCircle2 className="size-5 fill-[#155ead] text-white" />
                        ) : (
                          <Circle className="size-5 text-slate-300" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-[#172b43]">
                            {crew.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {crew.isRecommended && (
                              <span className="bg-[#155ead]/10 text-[#155ead] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Recomendada
                              </span>
                            )}
                            {crew.loadStatus === 'alta' && (
                              <span className="bg-[#fff5da] text-[#966409] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Carga alta
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#5e7085]">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {crew.distanceKm !== null
                              ? `${crew.distanceKm} km · ${crew.etaMinutes} min`
                              : 'Cobertura registrada'}
                            {crew.coversIncident ? ' · En su polígono' : ''}
                          </span>
                          <span>{crew.activeServices} servicios activos</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[12px] font-semibold text-[#172b43]">
                Instrucciones u observaciones para la cuadrilla (opcional)
              </label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Ej. Llevar cortadora y tubería de 3/4 pulg. Señalizar la zona..."
                rows={3}
                className="w-full text-[12px] text-[#172b43] p-3 rounded-[10px] border border-[#dce4ed] focus:border-[#155ead] outline-none resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[12px] border border-[#dce4ed] text-[#5e7085] text-[13px] font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting || !selectedCrewId}
                onClick={() => void handleConfirm()}
                className="justify-center px-5 py-2.5 rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white text-[13px] font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Truck className="size-4" />
                <span>
                  {submitting
                    ? 'Despachando...'
                    : 'Confirmar despacho inmediato'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
