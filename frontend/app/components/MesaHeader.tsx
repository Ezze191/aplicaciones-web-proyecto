'use client';

import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { DepartmentLogo } from './DepartmentLogo';

interface MesaHeaderProps {
  departmentName: string;
  departmentCode?: string | null;
  totalVisible: number;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
}

export const MesaHeader: React.FC<MesaHeaderProps> = ({
  departmentName,
  departmentCode,
  totalVisible,
  onRefresh,
  onExport,
  isRefreshing = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full">
      <div className="flex items-center gap-3.5 min-w-0">
        {departmentCode && (
          <DepartmentLogo
            code={departmentCode}
            size="lg"
            className="hidden sm:inline-flex"
          />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-[#0e315a] text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-tight">
            Gestión de reportes
          </h2>
          <p className="text-[#5e7085] text-[12px] sm:text-[13px] font-normal leading-relaxed">
            {departmentName} ·{' '}
            <span className="font-semibold text-[#172b43]">{totalVisible}</span>{' '}
            {totalVisible === 1 ? 'reporte visible' : 'reportes visibles'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
        <button
          type="button"
          onClick={onExport}
          className="bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] flex items-center justify-center gap-2 h-10 sm:h-[46px] px-3 sm:px-4 rounded-[12px] font-semibold text-[13px] sm:text-[14px] transition-all shadow-xs cursor-pointer"
        >
          <Download className="size-4" />
          <span>Exportar CSV</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-[#155ead] hover:bg-[#0f4a8a] border border-[#155ead] flex items-center justify-center gap-2 h-10 sm:h-[46px] px-3 sm:px-4 rounded-[12px] font-semibold text-[13px] sm:text-[14px] text-white transition-all shadow-xs cursor-pointer disabled:opacity-80"
        >
          <RefreshCw
            className={`size-4 text-white ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>{isRefreshing ? 'Actualizando...' : 'Actualizar tablero'}</span>
        </button>
      </div>
    </div>
  );
};
