'use client';

import React, { useState } from 'react';
import { Inbox, UserCheck, Wrench, CheckCircle2 } from 'lucide-react';
import { DependencyConfig, Report, ReportStatus } from '../types/dashboard';
import { ReportCard } from './ReportCard';

interface KanbanBoardProps {
  reports: Report[];
  dependency: DependencyConfig;
  onDispatch: (report: Report) => void;
  onViewDetail: (report: Report) => void;
  onStatusChange?: (reportId: string, newStatus: ReportStatus) => void;
}

interface ColumnConfig {
  status: ReportStatus;
  title: string;
  icon: React.ReactNode;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  reports,
  dependency,
  onDispatch,
  onViewDetail,
  onStatusChange,
}) => {
  const [mobileActiveColumn, setMobileActiveColumn] = useState<ReportStatus | 'all'>('all');

  const columns: ColumnConfig[] = [
    {
      status: 'nuevos',
      title: 'Nuevos',
      icon: <Inbox className="size-4.5 text-[#0e315a]" />,
    },
    {
      status: 'asignados',
      title: 'Asignados',
      icon: <UserCheck className="size-4.5 text-[#0e315a]" />,
    },
    {
      status: 'en_reparacion',
      title: 'En Reparación',
      icon: <Wrench className="size-4.5 text-[#0e315a]" />,
    },
    {
      status: 'resueltos',
      title: 'Resueltos',
      icon: <CheckCircle2 className="size-4.5 text-[#0e315a]" />,
    },
  ];

  const getReportsByStatus = (status: ReportStatus) => {
    return reports.filter((r) => r.status === status);
  };

  const visibleColumns =
    mobileActiveColumn === 'all'
      ? columns
      : columns.filter((c) => c.status === mobileActiveColumn);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mobile Column Quick Switcher Tabs (Only visible on small mobile screens) */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1 w-full scrollbar-none">
        <button
          onClick={() => setMobileActiveColumn('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            mobileActiveColumn === 'all'
              ? 'bg-[#0e315a] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Ver todas ({reports.length})
        </button>
        {columns.map((col) => {
          const count = getReportsByStatus(col.status).length;
          const isSelected = mobileActiveColumn === col.status;
          return (
            <button
              key={col.status}
              onClick={() => setMobileActiveColumn(col.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#0e315a] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <span>{col.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Grid (Responsive: horizontal swipe / stacked on phone, 2 cols on tablet, 4 cols on desktop) */}
      <div
        className={`w-full ${
          mobileActiveColumn === 'all'
            ? 'flex overflow-x-auto pb-3 gap-3.5 snap-x snap-mandatory sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible sm:pb-0'
            : 'grid grid-cols-1 w-full'
        }`}
      >
        {visibleColumns.map((col) => {
          const columnReports = getReportsByStatus(col.status);

          return (
            <div
              key={col.status}
              className={`bg-[#e9eff5] rounded-[20px] p-3 flex flex-col gap-3 min-h-[460px] ${
                mobileActiveColumn === 'all'
                  ? 'min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink flex-1'
                  : 'w-full'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 w-full">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="font-bold text-[#0e315a] text-[14px]">
                    {col.title}
                  </h3>
                </div>
                <div className="bg-white rounded-[8px] px-2.5 py-0.5 text-[#5e7085] text-[12px] font-medium shadow-2xs">
                  {columnReports.length}
                </div>
              </div>

              {/* Column Cards */}
              <div className="flex flex-col gap-3 w-full">
                {columnReports.length > 0 ? (
                  columnReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      dependency={dependency}
                      onDispatch={onDispatch}
                      onViewDetail={onViewDetail}
                      onStatusChange={onStatusChange}
                    />
                  ))
                ) : (
                  <div className="border border-dashed border-[#c5d3e0] rounded-[12px] p-8 text-center text-[#5e7085] text-[12px] bg-white/40">
                    Sin reportes en este estado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
