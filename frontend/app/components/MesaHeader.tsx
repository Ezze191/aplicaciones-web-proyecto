'use client';

import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { DependencyConfig } from '../types/dashboard';

interface MesaHeaderProps {
  dependency: DependencyConfig;
  totalVisible: number;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
}

export const MesaHeader: React.FC<MesaHeaderProps> = ({
  dependency,
  totalVisible,
  onRefresh,
  onExport,
  isRefreshing = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
      {/* Title & Metadata */}
      <div className="flex flex-col gap-1">
        <h2 className="text-[#0e315a] text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-tight">
          Gestión de reportes
        </h2>
        <p className="text-[#5e7085] text-[12px] sm:text-[13px] font-normal leading-relaxed">
          Domingo 25 de octubre de 2026 · Turno matutino ·{' '}
          <span className="font-semibold text-[#172b43]">{totalVisible}</span>{' '}
          {totalVisible === 1 ? 'reporte visible' : 'reportes visibles'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
        <button
          onClick={onExport}
          className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-[#dce4ed] text-[#155ead] hover:text-[#0f4a8a] flex items-center justify-center gap-2 h-10 sm:h-[46px] px-3 sm:px-4 rounded-[12px] font-semibold text-[13px] sm:text-[14px] transition-all shadow-xs cursor-pointer w-full sm:w-auto"
          title="Exportar reportes a CSV"
        >
          <Download className="size-4 sm:size-4.5 text-[#155ead]" />
          <span>Exportar</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`border flex items-center justify-center gap-2 h-10 sm:h-[46px] px-3 sm:px-4 rounded-[12px] font-semibold text-[13px] sm:text-[14px] text-white transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-80 w-full sm:w-auto ${dependency.accentBtnClass}`}
          title="Actualizar datos del tablero"
        >
          <RefreshCw
            className={`size-4 sm:size-4.5 text-white ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="truncate">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>
    </div>
  );
};
