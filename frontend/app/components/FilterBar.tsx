'use client';

import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { CrewView } from '../lib/api';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  colonias: string[];
  selectedColonia: string;
  onColoniaChange: (value: string) => void;
  crews: CrewView[];
  selectedCrewId: string;
  onCrewChange: (value: string) => void;
  selectedRisk: string;
  onRiskChange: (value: string) => void;
  minUpvotes: number;
  onMinUpvotesChange: (value: number) => void;
  datePreset: string;
  onDatePresetChange: (value: string) => void;
  selectedSla: 'all' | 'critico' | 'en_riesgo' | 'a_tiempo';
  onSlaChange: (sla: 'all' | 'critico' | 'en_riesgo' | 'a_tiempo') => void;
  criticalCount: number;
  atRiskCount: number;
  onTimeCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  colonias,
  selectedColonia,
  onColoniaChange,
  crews,
  selectedCrewId,
  onCrewChange,
  selectedRisk,
  onRiskChange,
  minUpvotes,
  onMinUpvotesChange,
  datePreset,
  onDatePresetChange,
  selectedSla,
  onSlaChange,
  criticalCount,
  atRiskCount,
  onTimeCount,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full">
        {/* Search & Primary Dropdowns */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
          <div className="bg-white border border-[#dce4ed] flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] w-full sm:w-[270px] shadow-2xs focus-within:border-[#155ead]">
            <Search className="size-4 text-[#5e7085] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar folio, calle o falla..."
              className="w-full text-[13px] text-[#172b43] placeholder-[#5e7085] bg-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* Colonias */}
            <div className="relative">
              <select
                value={selectedColonia}
                onChange={(e) => onColoniaChange(e.target.value)}
                aria-label="Filtrar por colonia"
                className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 pl-3 pr-7 rounded-[12px] shadow-2xs outline-none appearance-none cursor-pointer"
              >
                <option value="Todas las colonias">Todas las colonias</option>
                {colonias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
            </div>

            {/* Cuadrillas */}
            <div className="relative">
              <select
                value={selectedCrewId}
                onChange={(e) => onCrewChange(e.target.value)}
                aria-label="Filtrar por cuadrilla"
                className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 pl-3 pr-7 rounded-[12px] shadow-2xs outline-none appearance-none cursor-pointer"
              >
                <option value="all">Todas las cuadrillas</option>
                <option value="unassigned">Sin asignar</option>
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
            </div>

            {/* Riesgo */}
            <div className="relative">
              <select
                value={selectedRisk}
                onChange={(e) => onRiskChange(e.target.value)}
                aria-label="Filtrar por nivel de riesgo"
                className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 pl-3 pr-7 rounded-[12px] shadow-2xs outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Todo riesgo</option>
                <option value="CRITICO">Riesgo Crítico</option>
                <option value="ALTO">Riesgo Alto</option>
                <option value="MEDIO">Riesgo Medio</option>
                <option value="BAJO">Riesgo Bajo</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
            </div>

            {/* Upvotes */}
            <div className="relative">
              <select
                value={String(minUpvotes)}
                onChange={(e) => onMinUpvotesChange(Number(e.target.value))}
                aria-label="Filtrar por respaldo vecinal"
                className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 pl-3 pr-7 rounded-[12px] shadow-2xs outline-none appearance-none cursor-pointer"
              >
                <option value="0">Cualquier voto</option>
                <option value="5">&gt;= 5 votos</option>
                <option value="10">&gt;= 10 votos</option>
                <option value="25">&gt;= 25 votos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
            </div>

            {/* Fechas */}
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => onDatePresetChange(e.target.value)}
                aria-label="Filtrar por rango temporal"
                className="w-full bg-white border border-[#dce4ed] text-[#172b43] text-[12px] font-medium py-2.5 pl-3 pr-7 rounded-[12px] shadow-2xs outline-none appearance-none cursor-pointer"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Última semana</option>
                <option value="month">Este mes</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#5e7085] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* SLA Semaphore Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto pb-1 xl:pb-0">
          {selectedSla !== 'all' && (
            <button
              type="button"
              onClick={() => onSlaChange('all')}
              className="text-[11px] text-[#5e7085] underline hover:text-[#0e315a] pr-1 whitespace-nowrap cursor-pointer"
            >
              Ver todos
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onSlaChange(selectedSla === 'critico' ? 'all' : 'critico')
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSla === 'critico'
                ? 'bg-[#be313b] text-white border-[#be313b] font-bold'
                : 'bg-[#fdeef0] text-[#be313b] border-[#f8d7da]'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                selectedSla === 'critico' ? 'bg-white' : 'bg-[#be313b]'
              }`}
            />
            <span className="text-[11px] font-semibold">
              {criticalCount} {criticalCount === 1 ? 'crítico' : 'críticos'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onSlaChange(selectedSla === 'en_riesgo' ? 'all' : 'en_riesgo')
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSla === 'en_riesgo'
                ? 'bg-[#966409] text-white border-[#966409] font-bold'
                : 'bg-[#fff5da] text-[#966409] border-[#fde8b3]'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                selectedSla === 'en_riesgo' ? 'bg-white' : 'bg-[#966409]'
              }`}
            />
            <span className="text-[11px] font-semibold">
              {atRiskCount} en riesgo
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onSlaChange(selectedSla === 'a_tiempo' ? 'all' : 'a_tiempo')
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSla === 'a_tiempo'
                ? 'bg-[#18734a] text-white border-[#18734a] font-bold'
                : 'bg-[#eaf6ef] text-[#18734a] border-[#c1e5cf]'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                selectedSla === 'a_tiempo' ? 'bg-white' : 'bg-[#18734a]'
              }`}
            />
            <span className="text-[11px] font-semibold">
              {onTimeCount} a tiempo
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
