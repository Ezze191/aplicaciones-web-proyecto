'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Camera,
  ExternalLink,
  MapPin,
  Maximize2,
  Minimize2,
  ShieldAlert,
  ThumbsUp,
  Truck,
  X,
} from 'lucide-react';
import { ApiReport } from '../lib/api';
import { DepartmentLogo } from './DepartmentLogo';

interface ReportMapModalProps {
  report: ApiReport | null;
  mode: 'mini' | 'expanded';
  onModeChange: (mode: 'mini' | 'expanded') => void;
  onClose: () => void;
  onUpvote: (reportId: string) => void;
  upvoting?: boolean;
}

function translateStatus(status: ApiReport['currentStatus']): string {
  switch (status) {
    case 'REGISTRADO':
    case 'VALIDADO':
      return 'Reportado';
    case 'ASIGNADO':
      return 'Asignado';
    case 'EN_PROCESO':
      return 'En proceso';
    case 'RESUELTO':
      return 'Resuelto';
    case 'RECHAZADO':
      return 'Rechazado';
  }
}

function getStatusClasses(status: ApiReport['currentStatus']): string {
  switch (status) {
    case 'EN_PROCESO':
      return 'bg-[#edf5ff] text-[#155ead] border-[#cde2ff]';
    case 'ASIGNADO':
      return 'bg-[#fff5da] text-[#966409] border-[#f4df9e]';
    case 'RESUELTO':
      return 'bg-[#eaf6ef] text-[#18734a] border-[#bfe6cf]';
    case 'RECHAZADO':
      return 'bg-[#fdeef0] text-[#be313b] border-[#f5c6cb]';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getRiskClasses(risk: ApiReport['riskLevel']): string {
  switch (risk) {
    case 'CRITICO':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'ALTO':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'MEDIO':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export const ReportMapModal: React.FC<ReportMapModalProps> = ({
  report,
  mode,
  onModeChange,
  onClose,
  onUpvote,
  upvoting = false,
}) => {
  if (!report) return null;

  const isActive =
    report.currentStatus !== 'RESUELTO' && report.currentStatus !== 'RECHAZADO';
  const isExpanded = mode === 'expanded';

  return (
    <div
      className="fixed inset-0 z-[1000] bg-[#0e315a]/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del reporte ${report.folio}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full bg-white rounded-2xl border border-[#dce4ed] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isExpanded ? 'max-w-[760px]' : 'max-w-[430px]'
        }`}
      >
        {/* Header con logo, color de marcador y folio */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#eef2f6] bg-[#f8fafd] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <DepartmentLogo code={report.departmentCode} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: report.departmentColor }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#0e315a] truncate">
                  {report.departmentCode} · {report.folio}
                </span>
              </div>
              <p className="text-[11px] text-[#5e7085] truncate">
                {report.departmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onModeChange(isExpanded ? 'mini' : 'expanded')}
              title={isExpanded ? 'Vista compacta' : 'Agrandar detalle'}
              className="p-1.5 rounded-lg text-[#5e7085] hover:bg-slate-200/70 hover:text-[#0e315a] cursor-pointer"
            >
              {isExpanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-1.5 rounded-lg text-[#5e7085] hover:bg-slate-200/70 hover:text-[#0e315a] cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Badges de estado: Activo / Estatus / Riesgo */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {isActive ? 'Reporte activo' : 'Reporte cerrado'}
            </span>

            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusClasses(
                report.currentStatus,
              )}`}
            >
              {translateStatus(report.currentStatus)}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getRiskClasses(
                report.riskLevel,
              )}`}
            >
              <ShieldAlert className="size-3" />
              Riesgo {report.riskLevel}
            </span>
          </div>

          {/* Vista previa de foto (clickable para agrandar) */}
          {isExpanded && report.afterImageUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl overflow-hidden border border-[#dce4ed] bg-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-[#dce4ed] text-[11px] font-bold text-[#5e7085]">
                  Evidencia inicial (ANTES)
                </div>
                {report.beforeImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.beforeImageUrl}
                    alt={`Evidencia antes - ${report.folio}`}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-[#5e7085] gap-1.5">
                    <Camera className="size-6 opacity-50" />
                    <span className="text-xs">Sin fotografía inicial</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl overflow-hidden border border-emerald-200 bg-slate-100">
                <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-[11px] font-bold text-emerald-700">
                  Evidencia de resolución (DESPUÉS)
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.afterImageUrl}
                  alt={`Evidencia después - ${report.folio}`}
                  className="w-full h-56 object-cover"
                />
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                if (!isExpanded) onModeChange('expanded');
              }}
              className={`relative rounded-xl overflow-hidden border border-[#dce4ed] bg-slate-100 group ${
                !isExpanded ? 'cursor-pointer' : ''
              }`}
            >
              {report.beforeImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.beforeImageUrl}
                    alt={`Fotografía de incidencia ${report.folio}`}
                    className={`w-full object-cover transition-transform duration-300 ${
                      isExpanded
                        ? 'max-h-[360px] object-contain bg-[#0e315a]/5'
                        : 'h-44 group-hover:scale-[1.02]'
                    }`}
                  />
                  {!isExpanded && (
                    <div className="absolute bottom-2.5 right-2.5 bg-[#0e315a]/85 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                      <Maximize2 className="size-3" />
                      <span>Clic para agrandar</span>
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center text-[#5e7085] gap-1.5 ${
                    isExpanded ? 'h-48' : 'h-32'
                  }`}
                >
                  <Camera className="size-6 opacity-50" />
                  <span className="text-xs">
                    Este reporte no cuenta con fotografía adjunta
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Título, descripción y ubicación */}
          <div className="flex flex-col gap-1.5">
            <h3
              className={`font-bold text-[#0e315a] leading-snug ${
                isExpanded ? 'text-xl' : 'text-[17px]'
              }`}
            >
              {report.categoryName}
            </h3>
            <p
              className={`text-[13px] text-[#3c5068] leading-relaxed ${
                isExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {report.description}
            </p>
            <p className="text-[12px] text-[#5e7085] flex items-start gap-1.5 pt-1">
              <MapPin className="size-3.5 text-[#155ead] shrink-0 mt-0.5" />
              <span>{report.addressReference}</span>
            </p>
          </div>

          {/* Detalles extra en vista agrandada */}
          {isExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="bg-[#f8fafd] border border-[#e3eaf2] rounded-xl p-3 flex items-center gap-2.5">
                <Calendar className="size-4 text-[#155ead] shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#5e7085]">
                    Fecha de reporte
                  </p>
                  <p className="text-xs font-bold text-[#172b43]">
                    {new Date(report.createdAt).toLocaleString('es-MX', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-[#f8fafd] border border-[#e3eaf2] rounded-xl p-3 flex items-center gap-2.5">
                <Truck className="size-4 text-[#155ead] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-[#5e7085]">
                    Cuadrilla asignada
                  </p>
                  <p className="text-xs font-bold text-[#172b43] truncate">
                    {report.assignedCrewName || 'Pendiente de asignación'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: likes + acciones */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-[#eef2f6] bg-[#f8fafd] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#172b43]">
              <ThumbsUp className="size-4 text-[#155ead]" />
              {report.upvotesCount}{' '}
              <span className="font-normal text-xs text-[#5e7085]">
                {report.upvotesCount === 1 ? 'like / confirmación' : 'likes / confirmaciones'}
              </span>
            </span>
            {report.distanceMeters !== null && (
              <span className="text-[11px] text-[#5e7085]">
                · A {report.distanceMeters} m
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isActive && (
              <button
                type="button"
                disabled={upvoting}
                onClick={() => onUpvote(report.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#edf5ff] text-[#155ead] hover:bg-[#dcebff] cursor-pointer disabled:opacity-60"
              >
                <ThumbsUp className="size-3.5" />
                <span>Sigue ahí (+1)</span>
              </button>
            )}

            {!isExpanded ? (
              <button
                type="button"
                onClick={() => onModeChange('expanded')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0e315a] hover:bg-[#154278] text-white cursor-pointer"
              >
                <Maximize2 className="size-3.5" />
                <span>Ver más detalles</span>
              </button>
            ) : (
              <Link
                href={`/mis-reportes/${encodeURIComponent(report.folio)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0e315a] hover:bg-[#154278] text-white"
              >
                <span>Trazabilidad completa</span>
                <ExternalLink className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
