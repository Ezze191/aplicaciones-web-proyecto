'use client';

import React from 'react';
import {
  MapPin,
  Users,
  Truck,
  MoreHorizontal,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { DependencyConfig, Report } from '../types/dashboard';

interface ReportCardProps {
  report: Report;
  dependency: DependencyConfig;
  onDispatch: (report: Report) => void;
  onViewDetail: (report: Report) => void;
  onStatusChange?: (reportId: string, newStatus: Report['status']) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  dependency,
  onDispatch,
  onViewDetail,
  onStatusChange,
}) => {
  const isEnReparacion = report.status === 'en_reparacion';

  const renderPriorityBadge = () => {
    switch (report.priority) {
      case 'critico':
        return (
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="bg-[#fdeef0] border border-[#f8d7da]/60 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px]">
              <span className="size-1.5 rounded-full bg-[#be313b]" />
              <span className="font-semibold text-[#be313b] text-[11px]">
                Crítico
              </span>
            </div>
            <p className="text-[#5e7085] text-[10px] font-normal">
              {report.elapsedHours} h transcurridas · SLA {report.slaHours} h
            </p>
          </div>
        );
      case 'en_riesgo':
        return (
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="bg-[#fff5da] border border-[#fde8b3]/60 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px]">
              <span className="size-1.5 rounded-full bg-[#966409]" />
              <span className="font-semibold text-[#966409] text-[11px]">
                En riesgo
              </span>
            </div>
            <p className="text-[#5e7085] text-[10px] font-normal">
              {report.elapsedHours} h transcurridas · SLA {report.slaHours} h
            </p>
          </div>
        );
      case 'a_tiempo':
      default:
        return (
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="bg-[#eaf6ef] border border-[#c1e5cf]/60 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px]">
              <span className="size-1.5 rounded-full bg-[#18734a]" />
              <span className="font-semibold text-[#18734a] text-[11px]">
                A tiempo
              </span>
            </div>
            <p className="text-[#5e7085] text-[10px] font-normal">
              {report.status === 'resueltos'
                ? `Resuelto en ${report.resolvedInHours ?? report.elapsedHours} h · SLA ${report.slaHours} h`
                : `${report.elapsedHours} h transcurridas · SLA ${report.slaHours} h`}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`bg-white border rounded-[12px] p-4 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all group ${
        isEnReparacion
          ? 'border-[#a5cbef] ring-1 ring-[#a5cbef]/50'
          : 'border-[#dce4ed]'
      }`}
    >
      {/* Folio & Options */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`font-bold text-[12px] tracking-tight ${dependency.accentTextClass}`}
        >
          {report.folio}
        </span>
        <button
          onClick={() => onViewDetail(report)}
          className="text-[#5e7085] hover:text-[#0e315a] p-1 rounded-md hover:bg-slate-100 transition-colors"
          title="Ver opciones y detalles"
        >
          <MoreHorizontal className="size-4.5" />
        </button>
      </div>

      {/* Incident Title */}
      <h3
        onClick={() => onViewDetail(report)}
        className="font-semibold text-[15px] lg:text-[16px] text-[#172b43] leading-[1.35] hover:text-[#155ead] cursor-pointer transition-colors"
      >
        {report.title}
      </h3>

      {/* Location */}
      <div className="flex items-start gap-1.5 w-full text-[#5e7085]">
        <MapPin className="size-3.5 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-tight flex-1">{report.address}</p>
      </div>

      {/* Status & SLA Semaphore */}
      <div className="w-full">{renderPriorityBadge()}</div>

      {/* Citizen Participation (Confirmations) */}
      <div className="flex items-center gap-1.5 text-[#5e7085]">
        <Users className="size-3.5 shrink-0" />
        <span className="text-[11px]">{report.confirmations} confirmaciones</span>
      </div>

      {/* Footer Actions Based on Column Status */}
      {report.status === 'nuevos' ? (
        <button
          onClick={() => onDispatch(report)}
          className={`w-full h-[46px] rounded-[12px] text-white flex items-center justify-center gap-2 font-semibold text-[14px] shadow-xs active:scale-98 transition-all cursor-pointer mt-1 ${dependency.accentBtnClass}`}
        >
          <Truck className="size-4.5" />
          <span>Despachar</span>
        </button>
      ) : (
        <div className="border-t border-[#dce4ed] pt-2.5 mt-0.5 flex flex-col gap-1.5">
          <p className="text-[#5e7085] text-[10px] font-semibold truncate">
            {report.assignedCrew ?? 'Cuadrilla asignada'}
          </p>
          <button
            onClick={() => onViewDetail(report)}
            className={`flex items-center gap-1 text-[12px] font-semibold text-left transition-colors group-hover:translate-x-0.5 duration-150 cursor-pointer ${dependency.accentTextClass}`}
          >
            <span>
              {report.status === 'resueltos'
                ? 'Ver evidencia de cierre →'
                : 'Ver detalle del reporte →'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

