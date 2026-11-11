'use client';

import React from 'react';
import Image from 'next/image';
import {
  X,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  Wrench,
  Truck,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { DependencyConfig, Report, ReportStatus } from '../types/dashboard';

interface DetailModalProps {
  report: Report | null;
  dependency: DependencyConfig;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStatus?: (reportId: string, nextStatus: ReportStatus) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  report,
  dependency,
  isOpen,
  onClose,
  onAdvanceStatus,
}) => {
  if (!isOpen || !report) return null;

  const getNextStatus = (): { status: ReportStatus; label: string } | null => {
    switch (report.status) {
      case 'nuevos':
        return { status: 'asignados', label: 'Asignar cuadrilla' };
      case 'asignados':
        return { status: 'en_reparacion', label: 'Iniciar reparación en campo' };
      case 'en_reparacion':
        return { status: 'resueltos', label: 'Marcar como resuelto con evidencia' };
      default:
        return null;
    }
  };

  const nextAction = getNextStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[16px] sm:rounded-[20px] shadow-2xl border border-slate-100 w-full max-w-[760px] max-h-[92vh] overflow-y-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-6 lg:p-7"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between w-full border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold text-[13px] ${dependency.accentTextClass}`}
              >
                {report.folio}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                {report.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-[#0e315a] leading-tight">
              {report.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-sm">
          {/* Location & Report time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-slate-900">Ubicación</p>
                <p className="text-xs text-slate-600">{report.address}</p>
                <p className="text-[11px] text-slate-400">Colonia: {report.colonia}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-700">
              <Calendar className="size-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-slate-900">Registro</p>
                <p className="text-xs text-slate-600">{report.reportedAt}</p>
                <p className="text-[11px] text-slate-400">
                  {report.elapsedHours} h transcurridas (SLA: {report.slaHours} h)
                </p>
              </div>
            </div>
          </div>

          {/* Incident Description */}
          {report.description && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Descripción reportada
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 p-3 rounded-lg">
                {report.description}
              </p>
            </div>
          )}

          {/* Assigned Crew or Evidence */}
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cuadrilla Responsable
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">
                  {report.assignedCrew ?? 'Pendiente de despacho'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="size-3.5" />
                <span>{report.confirmations} vecinos confirmaron</span>
              </div>
            </div>
          </div>

          {/* Evidence photo */}
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Evidencia del reporte
            </h4>
            <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <Image
                src={report.evidenceImage ?? '/images/evidencia-ciudadana.png'}
                alt="Evidencia fotográfica"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs">
                {report.status === 'resueltos'
                  ? 'Evidencia de validación de cierre'
                  : 'Evidencia ciudadana inicial'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-center cursor-pointer"
          >
            Cerrar
          </button>

          {nextAction && onAdvanceStatus && (
            <button
              onClick={() => {
                onAdvanceStatus(report.id, nextAction.status);
                onClose();
              }}
              className={`w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ${dependency.accentBtnClass}`}
            >
              <span>{nextAction.label}</span>
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

