'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  MapPin,
  CheckCircle2,
  Circle,
  Truck,
  LocateFixed,
  Droplets,
  AlertCircle,
  Clock,
  Sparkles,
  Waves,
  Hammer,
} from 'lucide-react';
import { Crew, DependencyConfig, Report } from '../types/dashboard';

interface DispatchModalProps {
  report: Report | null;
  dependency: DependencyConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDispatch: (reportId: string, assignedCrew: string, notes?: string) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  report,
  dependency,
  isOpen,
  onClose,
  onConfirmDispatch,
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    dependency.crews.find((c) => c.isRecommended)?.id ?? dependency.crews[0]?.id ?? ''
  );
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  if (!isOpen || !report) return null;

  const selectedCrew =
    dependency.crews.find((c) => c.id === selectedCrewId) ?? dependency.crews[0];

  const handleConfirm = () => {
    if (selectedCrew) {
      onConfirmDispatch(report.id, selectedCrew.name, dispatchNotes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[16px] sm:rounded-[20px] shadow-[0px_16px_36px_rgba(14,49,90,0.18)] border border-slate-100 w-full max-w-[1020px] max-h-[94vh] overflow-y-auto flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between w-full border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <h2 className="font-bold text-[#0e315a] text-[20px] sm:text-[24px] lg:text-[26px] leading-tight">
              Despachar cuadrilla
            </h2>
            <p className="text-[#5e7085] text-[12px] sm:text-[13px]">
              <span className="font-semibold text-[#155ead]">{report.folio}</span> ·{' '}
              {report.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="size-5 sm:size-5.5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* Left Column (5 cols): Incident Context */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Citizen Evidence Photo */}
            <div className="relative h-[160px] w-full rounded-[14px] overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group">
              <Image
                src={report.evidenceImage ?? '/images/evidencia-ciudadana.png'}
                alt="Evidencia fotográfica ciudadana"
                fill
                className="object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                Evidencia ciudadana adjunta
              </div>
            </div>

            {/* Ilustrative Urban Map of Torreón (Matching Figma) */}
            <div className="relative bg-[#e9eef0] h-[160px] w-full rounded-[14px] overflow-hidden border border-slate-200 shadow-inner flex flex-col justify-between p-3">
              {/* Simplified stylized city blocks */}
              <div className="absolute inset-0 opacity-40 pointer-events-none">
                <div className="absolute top-4 left-6 w-28 h-10 bg-[#d7e2e8] rounded-xs" />
                <div className="absolute top-18 left-6 w-24 h-14 bg-[#d7e2e8] rounded-xs" />
                <div className="absolute top-4 right-8 w-32 h-20 bg-[#d0e4d8] rounded-md border border-[#b8d6c3] flex items-center justify-center">
                  <span className="text-[9px] font-semibold text-[#497c5d]">
                    Alameda Zaragoza
                  </span>
                </div>
                {/* Street Lines */}
                <div className="absolute top-15 left-0 right-0 h-3 bg-white/80" />
                <div className="absolute top-0 bottom-0 left-36 w-3 bg-white/80" />
              </div>

              {/* Street Names */}
              <div className="relative z-10 text-[8px] font-bold text-[#697c89] tracking-wider uppercase">
                AV. JUÁREZ / CALZ. COLÓN
              </div>

              {/* Pulsing GPS Location Pin */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="absolute size-14 rounded-full bg-blue-400/30 animate-ping" />
                <span className="absolute size-8 rounded-full bg-blue-500/20" />
                <div
                  className={`size-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-md relative z-10 ${dependency.accentBtnClass.split(' ')[0]}`}
                >
                  <MapPin className="size-4" />
                </div>
              </div>

              {/* Selected Address Pill */}
              <div className="relative z-10 self-center bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-[8px] shadow-xs border border-slate-200/80">
                <p className="text-[10px] font-bold text-[#0e315a]">
                  {report.address}
                </p>
              </div>

              {/* Map Footer & Controls */}
              <div className="relative z-10 flex items-center justify-between text-[8px] text-[#5e7085]">
                <span>Torreón, Coah. · 100 m ━━━</span>
                <button
                  className="bg-white p-1 rounded-md shadow-xs text-slate-600 hover:text-blue-600"
                  title="Centrar mapa en la ubicación"
                >
                  <LocateFixed className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Address & Priority Summary */}
            <div className="bg-[#f3f6fa] rounded-[12px] p-3.5 flex flex-col gap-2 border border-slate-200/60">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#172b43] text-[13px]">
                  {report.address}
                </p>
                <span className="text-[11px] text-[#5e7085] font-medium">
                  {report.colonia}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-[#fdeef0] px-2 py-0.5 rounded-[6px] border border-[#f8d7da] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#be313b]" />
                  <span className="text-[11px] font-semibold text-[#be313b]">
                    {report.priority === 'critico'
                      ? 'Crítico · Fuera de SLA'
                      : report.priority === 'en_riesgo'
                      ? 'En riesgo de SLA'
                      : 'A tiempo de atención'}
                  </span>
                </div>
                <span className="text-[10px] text-[#5e7085]">
                  {report.elapsedHours} h transcurridas
                </span>
              </div>

              <p className="text-[#5e7085] text-[11px] leading-relaxed">
                {report.confirmations} confirmaciones ciudadanas acumuladas.
                Registrado el {report.reportedAt}.
              </p>
            </div>
          </div>

          {/* Right Column (7 cols): Crew Selection & Dispatch Action */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-semibold text-[#172b43] text-[15px]">
                Selecciona una cuadrilla operativa
              </h3>
              <span className="text-[11px] text-[#5e7085] font-medium">
                {dependency.crews.length} disponibles
              </span>
            </div>

            {/* Crew Radio List */}
            <div className="flex flex-col gap-2.5">
              {dependency.crews.map((crew) => {
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
                    {/* Radio Icon */}
                    <div className="shrink-0 text-[#155ead]">
                      {isSelected ? (
                        <CheckCircle2 className="size-5 fill-[#155ead] text-white" />
                      ) : (
                        <Circle className="size-5 text-slate-300" />
                      )}
                    </div>

                    {/* Crew Details */}
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#172b43]">
                          {crew.name}
                        </span>
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

                      <div className="flex items-center justify-between text-[11px] text-[#5e7085]">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {crew.distance} · {crew.eta} de traslado
                        </span>
                        <span>
                          {crew.activeServices}{' '}
                          {crew.activeServices === 1
                            ? 'servicio activo'
                            : 'servicios activos'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dispatch Instructions / Notes */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[12px] font-semibold text-[#172b43]">
                Instrucciones u observaciones para la cuadrilla (opcional)
              </label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Ej. Llevar cortadora y tubería de 3/4 pulg. Solicitar apoyo a Tránsito para abanderamiento..."
                rows={3}
                className="w-full text-[12px] text-[#172b43] placeholder-[#5e7085] p-3 rounded-[10px] border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/15 outline-none resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] border border-[#dce4ed] text-[#5e7085] hover:text-[#172b43] text-[13px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`w-full sm:w-auto justify-center px-5 py-2.5 rounded-[12px] text-white text-[13px] font-semibold flex items-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer ${dependency.accentBtnClass}`}
              >
                <Truck className="size-4" />
                <span>Confirmar despacho inmediato</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

