'use client';

import React from 'react';
import { MapPin, MoreHorizontal, Truck, Users } from 'lucide-react';
import { ApiReport } from '../lib/api';

interface ReportCardProps {
  report: ApiReport;
  onDispatch: (report: ApiReport) => void;
  onViewDetail: (report: ApiReport) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, report: ApiReport) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onDispatch,
  onViewDetail,
  onDragStart,
}) => {
  const isEnReparacion = report.kanbanStatus === 'en_reparacion';

  const renderPriorityBadge = () => {
    switch (report.slaStatus) {
      case 'critico':
        return (
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="bg-[#fdeef0] border border-[#f8d7da]/60 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px]">
              <span className="size-1.5 rounded-full bg-[#be313b]" />
              <span className="font-semibold text-[#be313b] text-[11px]">
                Crítico
              </span>
            </div>
            <p className="text-[#5e7085] text-[10px]">
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
            <p className="text-[#5e7085] text-[10px]">
              {report.elapsedHours} h transcurridas · SLA {report.slaHours} h
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="bg-[#eaf6ef] border border-[#c1e5cf]/60 flex items-center gap-1.5 px-2 py-0.5 rounded-[8px]">
              <span className="size-1.5 rounded-full bg-[#18734a]" />
              <span className="font-semibold text-[#18734a] text-[11px]">
                A tiempo
              </span>
            </div>
            <p className="text-[#5e7085] text-[10px]">
              {report.kanbanStatus === 'resueltos'
                ? `Resuelto en ${report.elapsedHours} h · SLA ${report.slaHours} h`
                : `${report.elapsedHours} h transcurridas · SLA ${report.slaHours} h`}
            </p>
          </div>
        );
    }
  };

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, report)}
      className={`bg-white border rounded-[12px] p-4 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${
        isEnReparacion
          ? 'border-[#a5cbef] ring-1 ring-[#a5cbef]/50'
          : 'border-[#dce4ed]'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className="font-bold text-[12px] tracking-tight"
          style={{ color: report.departmentColor || '#155ead' }}
        >
          {report.folio} · {report.departmentCode}
        </span>
        <button
          type="button"
          onClick={() => onViewDetail(report)}
          className="text-[#5e7085] hover:text-[#0e315a] p-1 rounded-md hover:bg-slate-100 cursor-pointer"
          title="Ver opciones y detalles"
        >
          <MoreHorizontal className="size-4.5" />
        </button>
      </div>

      <h3
        onClick={() => onViewDetail(report)}
        className="font-semibold text-[15px] lg:text-[16px] text-[#172b43] leading-[1.35] hover:text-[#155ead] cursor-pointer transition-colors"
      >
        {report.categoryName}
      </h3>

      <div className="flex items-start gap-1.5 w-full text-[#5e7085]">
        <MapPin className="size-3.5 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-tight flex-1">
          {report.addressReference}
        </p>
      </div>

      <div className="w-full">{renderPriorityBadge()}</div>

      <div className="flex items-center justify-between text-[#5e7085] text-[11px]">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 shrink-0" />
          <span>{report.upvotesCount} confirmaciones</span>
        </div>
        <span className="font-semibold text-[10px] uppercase text-[#5e7085]">
          {report.riskLevel}
        </span>
      </div>

      {report.kanbanStatus === 'nuevos' ? (
        <button
          type="button"
          onClick={() => onDispatch(report)}
          className="w-full h-[44px] rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white flex items-center justify-center gap-2 font-semibold text-[13px] shadow-xs transition-all cursor-pointer mt-1"
        >
          <Truck className="size-4" />
          <span>Despachar</span>
        </button>
      ) : (
        <div className="border-t border-[#dce4ed] pt-2.5 mt-0.5 flex flex-col gap-1.5">
          <p className="text-[#5e7085] text-[10px] font-semibold truncate">
            {report.assignedCrewName ?? 'Sin cuadrilla asignada'}
          </p>
          <button
            type="button"
            onClick={() => onViewDetail(report)}
            className="text-[12px] font-semibold text-[#155ead] text-left hover:underline cursor-pointer"
          >
            {report.kanbanStatus === 'resueltos'
              ? 'Ver evidencia de cierre →'
              : 'Ver detalle del reporte →'}
          </button>
        </div>
      )}
    </div>
  );
};
