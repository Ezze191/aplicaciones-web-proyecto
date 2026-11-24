'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Users,
} from 'lucide-react';
import { AnalyticsDashboard } from '../lib/api';

const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface AnalyticsBiViewProps {
  analytics: AnalyticsDashboard | null;
  loading: boolean;
}

export const AnalyticsBiView: React.FC<AnalyticsBiViewProps> = ({
  analytics,
  loading,
}) => {
  if (loading && !analytics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-[16px] bg-white border border-[#dce4ed] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white border border-[#dce4ed] rounded-[16px] p-8 text-center text-sm text-[#5e7085]">
        No hay datos analíticos disponibles aún.
      </div>
    );
  }

  const { kpis, byDepartment, byStatus, byRiskLevel, heatmapPoints } = analytics;
  const maxDeptTotal = Math.max(1, ...byDepartment.map((d) => d.total));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] sm:text-[26px] font-bold text-[#0e315a]">
          Dashboard de Inteligencia Urbana (BI)
        </h2>
        <p className="text-[13px] text-[#5e7085]">
          Indicadores consolidados de cumplimiento SLA, desduplicación vecinal y
          mapa de calor geoespacial.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#dce4ed] rounded-[16px] p-5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#5e7085] text-xs font-semibold">
            <span>Total Incidencias</span>
            <Layers className="size-4 text-[#155ead]" />
          </div>
          <p className="text-3xl font-extrabold text-[#0e315a]">
            {kpis.totalReports}
          </p>
          <p className="text-[11px] text-[#5e7085]">
            {kpis.pendingReports} activas · {kpis.resolvedReports} resueltas
          </p>
        </div>

        <div className="bg-white border border-[#dce4ed] rounded-[16px] p-5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#5e7085] text-xs font-semibold">
            <span>Cumplimiento SLA</span>
            <CheckCircle2 className="size-4 text-[#18734a]" />
          </div>
          <p className="text-3xl font-extrabold text-[#18734a]">
            {kpis.slaCompliancePct}%
          </p>
          <p className="text-[11px] text-[#5e7085]">
            Cierres dentro de ventana normativa
          </p>
        </div>

        <div className="bg-white border border-[#dce4ed] rounded-[16px] p-5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#5e7085] text-xs font-semibold">
            <span>Tiempo Medio de Solución</span>
            <Clock className="size-4 text-[#d97706]" />
          </div>
          <p className="text-3xl font-extrabold text-[#0e315a]">
            {kpis.avgResolutionHours} hrs
          </p>
          <p className="text-[11px] text-[#5e7085]">
            {kpis.activeCrewsCount} cuadrillas activas en turno
          </p>
        </div>

        <div className="bg-white border border-[#dce4ed] rounded-[16px] p-5 shadow-2xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#5e7085] text-xs font-semibold">
            <span>Confirmaciones Agrupadas</span>
            <Users className="size-4 text-[#0284c7]" />
          </div>
          <p className="text-3xl font-extrabold text-[#155ead]">
            {kpis.groupedConfirmations}
          </p>
          <p className="text-[11px] text-[#5e7085]">
            Folios duplicados evitados por geo-desduplicación
          </p>
        </div>
      </div>

      {/* Heatmap + Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 bg-white border border-[#dce4ed] rounded-[18px] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[15px] text-[#0e315a] flex items-center gap-2">
              <Flame className="size-4 text-[#ea580c]" />
              <span>Mapa de Calor de Incidencias (Hotspots Torreón)</span>
            </h3>
            <span className="text-[11px] text-[#5e7085]">
              {heatmapPoints.length} puntos analizados
            </span>
          </div>
          <InteractiveMap
            zoom={12}
            heightClass="h-[340px]"
            heatmapPoints={heatmapPoints.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              weight: p.weight,
            }))}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-[#dce4ed] rounded-[18px] p-5 flex flex-col gap-3.5">
            <h3 className="font-bold text-[15px] text-[#0e315a] flex items-center gap-2">
              <Activity className="size-4 text-[#155ead]" />
              <span>Distribución por Dependencia</span>
            </h3>
            <div className="flex flex-col gap-3">
              {byDepartment.map((dept) => {
                const pct = Math.round((dept.total / maxDeptTotal) * 100);
                return (
                  <div key={dept.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#172b43]">
                        {dept.code} · {dept.name}
                      </span>
                      <span className="font-bold text-[#0e315a]">
                        {dept.total}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#f3f6fa] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: dept.colorHex,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#5e7085]">
                      <span>{dept.resolved} resueltos</span>
                      <span>{dept.pending} pendientes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#dce4ed] rounded-[18px] p-5 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-[#5e7085] mb-2">
                Por Estatus
              </h4>
              <ul className="space-y-1.5 text-xs">
                {byStatus.map((s) => (
                  <li key={s.status} className="flex justify-between">
                    <span className="text-[#172b43]">
                      {s.status.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-[#0e315a]">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-[#5e7085] mb-2">
                Por Riesgo
              </h4>
              <ul className="space-y-1.5 text-xs">
                {byRiskLevel.map((r) => (
                  <li key={r.riskLevel} className="flex justify-between">
                    <span className="text-[#172b43]">{r.riskLevel}</span>
                    <span className="font-bold text-[#0e315a]">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
