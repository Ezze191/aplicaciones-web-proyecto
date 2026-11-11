'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { DependencyConfig, PriorityLevel } from '../types/dashboard';

interface FilterBarProps {
  dependency: DependencyConfig;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedColonia: string;
  onColoniaChange: (value: string) => void;
  selectedCrew: string;
  onCrewChange: (value: string) => void;
  selectedPriority: PriorityLevel | 'all';
  onPriorityChange: (priority: PriorityLevel | 'all') => void;
  criticalCount: number;
  atRiskCount: number;
  onTimeCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dependency,
  searchQuery,
  onSearchChange,
  selectedColonia,
  onColoniaChange,
  selectedCrew,
  onCrewChange,
  selectedPriority,
  onPriorityChange,
  criticalCount,
  atRiskCount,
  onTimeCount,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full">
      {/* Search & Select dropdowns */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
        {/* Search Input */}
        <div className="bg-white border border-[#dce4ed] flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] w-full sm:w-[300px] lg:w-[340px] shadow-xs focus-within:border-[#155ead] focus-within:ring-2 focus-within:ring-[#155ead]/15 transition-all">
          <Search className="size-4.5 text-[#5e7085] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar folio, dirección o colonia"
            className="w-full text-[13px] text-[#172b43] placeholder-[#5e7085] bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Colonias Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedColonia}
              onChange={(e) => onColoniaChange(e.target.value)}
              aria-label="Filtrar por colonia"
              className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 sm:py-3 pl-3 pr-7 rounded-[12px] shadow-xs outline-none cursor-pointer hover:border-slate-300 transition-colors appearance-none truncate"
            >
              {dependency.colonias.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
          </div>

          {/* Cuadrillas Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCrew}
              onChange={(e) => onCrewChange(e.target.value)}
              aria-label="Filtrar por cuadrilla"
              className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 sm:py-3 pl-3 pr-7 rounded-[12px] shadow-xs outline-none cursor-pointer hover:border-slate-300 transition-colors appearance-none truncate"
            >
              <option value="all">Todas las cuadrillas</option>
              {dependency.crews.map((crew) => (
                <option key={crew.id} value={crew.name}>
                  {crew.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Alert / SLA Summary badges (Clickable Filters) */}
      <div className="flex items-center gap-1.5 sm:gap-2 justify-start lg:justify-end shrink-0 overflow-x-auto pb-1 sm:pb-0 w-full lg:w-auto">
        {/* Reset filter if one is active */}
        {selectedPriority !== 'all' && (
          <button
            onClick={() => onPriorityChange('all')}
            className="text-[11px] text-[#5e7085] underline hover:text-[#0e315a] pr-1 whitespace-nowrap cursor-pointer"
          >
            Ver todos
          </button>
        )}

        {/* Críticos */}
        <button
          onClick={() =>
            onPriorityChange(selectedPriority === 'critico' ? 'all' : 'critico')
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
            selectedPriority === 'critico'
              ? 'bg-[#be313b] text-white border-[#be313b] shadow-sm font-bold scale-102'
              : 'bg-[#fdeef0] text-[#be313b] border-[#f8d7da] hover:bg-[#fadbd8]'
          }`}
          title="Filtrar por reportes críticos"
        >
          <span
            className={`size-1.5 rounded-full ${
              selectedPriority === 'critico' ? 'bg-white' : 'bg-[#be313b]'
            }`}
          />
          <span className="text-[11px] font-semibold">
            {criticalCount} {criticalCount === 1 ? 'crítico' : 'críticos'}
          </span>
        </button>

        {/* En riesgo */}
        <button
          onClick={() =>
            onPriorityChange(selectedPriority === 'en_riesgo' ? 'all' : 'en_riesgo')
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
            selectedPriority === 'en_riesgo'
              ? 'bg-[#966409] text-white border-[#966409] shadow-sm font-bold scale-102'
              : 'bg-[#fff5da] text-[#966409] border-[#fde8b3] hover:bg-[#feefc3]'
          }`}
          title="Filtrar por reportes en riesgo de SLA"
        >
          <span
            className={`size-1.5 rounded-full ${
              selectedPriority === 'en_riesgo' ? 'bg-white' : 'bg-[#966409]'
            }`}
          />
          <span className="text-[11px] font-semibold">
            {atRiskCount} {atRiskCount === 1 ? 'en riesgo' : 'en riesgo'}
          </span>
        </button>

        {/* A tiempo */}
        <button
          onClick={() =>
            onPriorityChange(selectedPriority === 'a_tiempo' ? 'all' : 'a_tiempo')
          }
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
            selectedPriority === 'a_tiempo'
              ? 'bg-[#18734a] text-white border-[#18734a] shadow-sm font-bold scale-102'
              : 'bg-[#eaf6ef] text-[#18734a] border-[#c1e5cf] hover:bg-[#d4edda]'
          }`}
          title="Filtrar por reportes a tiempo"
        >
          <span
            className={`size-1.5 rounded-full ${
              selectedPriority === 'a_tiempo' ? 'bg-white' : 'bg-[#18734a]'
            }`}
          />
          <span className="text-[11px] font-semibold">{onTimeCount} a tiempo</span>
        </button>
      </div>
    </div>
  );
};
