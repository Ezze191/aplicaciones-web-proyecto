'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  Ban,
  Calendar,
  MapPin,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, ApiError, ApiReport } from '../lib/api';

const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface DetailModalProps {
  report: ApiReport | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: ApiReport, message: string) => void;
  onError: (message: string) => void;
  onOpenDispatch: (report: ApiReport) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onUpdated,
  onError,
  onOpenDispatch,
}) => {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !report) return null;

  const getNextAction = (): {
    status: 'EN_PROCESO' | 'RESUELTO';
    label: string;
  } | null => {
    if (report.currentStatus === 'ASIGNADO') {
      return { status: 'EN_PROCESO', label: 'Pasar a En Reparación' };
    }
    if (report.currentStatus === 'EN_PROCESO') {
      return { status: 'RESUELTO', label: 'Marcar como Resuelto' };
    }
    return null;
  };

  const nextAction = getNextAction();

  const handleAdvance = async (nextStatus: 'EN_PROCESO' | 'RESUELTO') => {
    setLoading(true);
    try {
      const updated = await apiFetch<ApiReport>(`/reports/${report.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      onUpdated(updated, `Folio ${report.folio} actualizado.`);
      onClose();
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : 'No se pudo actualizar estado.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setLoading(true);
    try {
      const updated = await apiFetch<ApiReport>(`/reports/${report.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectOpen(false);
      setRejectReason('');
      onUpdated(updated, `Folio ${report.folio} rechazado con justificación.`);
      onClose();
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : 'No se pudo rechazar reporte.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/55 backdrop-blur-xs">
      <div
        className="bg-white rounded-[16px] sm:rounded-[20px] shadow-2xl border border-slate-100 w-full max-w-[780px] max-h-[92vh] overflow-y-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-6 lg:p-7"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between w-full border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-[13px]"
                style={{ color: report.departmentColor }}
              >
                {report.folio} · {report.departmentCode}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                {report.currentStatus.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-[#0e315a] leading-tight">
              {report.categoryName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-slate-900">Ubicación</p>
                <p className="text-xs text-slate-600">
                  {report.addressReference}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-700">
              <Calendar className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-slate-900">Registro</p>
                <p className="text-xs text-slate-600">
                  {new Date(report.createdAt).toLocaleString('es-MX', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <p className="text-[11px] text-slate-400">
                  {report.elapsedHours} h transcurridas (SLA: {report.slaHours} h)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Descripción reportada
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 p-3 rounded-lg">
              {report.description}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-800">
                {report.assignedCrewName ?? 'Pendiente de despacho'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="size-3.5" />
              <span>{report.upvotesCount} confirmaciones</span>
            </div>
          </div>

          <InteractiveMap
            center={{ lat: report.lat, lng: report.lng }}
            zoom={15}
            heightClass="h-[170px]"
            markers={[
              {
                id: report.id,
                lat: report.lat,
                lng: report.lng,
                colorHex: report.departmentColor,
                selected: true,
              },
            ]}
          />

          {(report.beforeImageUrl || report.afterImageUrl) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.beforeImageUrl && (
                <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.beforeImageUrl}
                    alt="Evidencia antes"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                    Evidencia inicial (Antes)
                  </div>
                </div>
              )}
              {report.afterImageUrl && (
                <div className="relative h-44 rounded-xl overflow-hidden border border-emerald-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.afterImageUrl}
                    alt="Evidencia después"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-emerald-700/85 text-white text-[10px] px-2 py-0.5 rounded">
                    Evidencia de cierre (Después)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulario de rechazo formal (RF-05) */}
          {rejectOpen && (
            <form
              onSubmit={handleReject}
              className="bg-[#fdeef0] border border-[#f5c6cb] rounded-xl p-4 flex flex-col gap-2.5"
            >
              <label className="text-xs font-bold text-[#be313b]">
                Motivo formal de rechazo *
              </label>
              <textarea
                required
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. Corresponde a instalación domiciliaria interna fuera de medidor..."
                className="w-full bg-white p-2.5 rounded-lg border border-[#f5c6cb] text-xs outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5e7085] bg-white border border-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#be313b] hover:bg-[#9f262f] cursor-pointer"
                >
                  Confirmar rechazo
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cerrar
            </button>
            {report.currentStatus !== 'RESUELTO' &&
              report.currentStatus !== 'RECHAZADO' &&
              !rejectOpen && (
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#be313b] border border-[#f5c6cb] bg-[#fdeef0] rounded-lg hover:bg-[#fbdce0] flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="size-3.5" />
                  <span>Rechazar</span>
                </button>
              )}
          </div>

          <div className="flex items-center gap-2">
            {report.kanbanStatus === 'nuevos' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDispatch(report);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#155ead] hover:bg-[#0f4a8a] rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="size-3.5" />
                <span>Aceptar y despachar</span>
              </button>
            )}

            {nextAction && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleAdvance(nextAction.status)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#155ead] hover:bg-[#0f4a8a] rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <span>{nextAction.label}</span>
                <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
