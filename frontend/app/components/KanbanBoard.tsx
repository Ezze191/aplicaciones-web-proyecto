'use client';

import React, { useState } from 'react';
import { CheckCircle2, Inbox, UserCheck, Wrench } from 'lucide-react';
import { ApiReport } from '../lib/api';
import { ReportCard } from './ReportCard';

export type KanbanColumnKey =
  | 'nuevos'
  | 'asignados'
  | 'en_reparacion'
  | 'resueltos';

interface KanbanBoardProps {
  reports: ApiReport[];
  onDispatch: (report: ApiReport) => void;
  onViewDetail: (report: ApiReport) => void;
  onDropTransition: (report: ApiReport, targetColumn: KanbanColumnKey) => void;
}

interface ColumnConfig {
  status: KanbanColumnKey;
  title: string;
  icon: React.ReactNode;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  reports,
  onDispatch,
  onViewDetail,
  onDropTransition,
}) => {
  const [mobileActiveColumn, setMobileActiveColumn] = useState<
    KanbanColumnKey | 'all'
  >('all');
  const [dragOverColumn, setDragOverColumn] =
    useState<KanbanColumnKey | null>(null);

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

  const getReportsByStatus = (status: KanbanColumnKey) =>
    reports.filter((r) => r.kanbanStatus === status);

  const visibleColumns =
    mobileActiveColumn === 'all'
      ? columns
      : columns.filter((c) => c.status === mobileActiveColumn);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    report: ApiReport,
  ) => {
    e.dataTransfer.setData('text/plain', report.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetCol: KanbanColumnKey,
  ) => {
    e.preventDefault();
    setDragOverColumn(null);
    const reportId = e.dataTransfer.getData('text/plain');
    const report = reports.find((r) => r.id === reportId);
    if (report && report.kanbanStatus !== targetCol) {
      onDropTransition(report, targetCol);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mobile Column Quick Switcher */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1 w-full">
        <button
          type="button"
          onClick={() => setMobileActiveColumn('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
            mobileActiveColumn === 'all'
              ? 'bg-[#0e315a] text-white'
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
              type="button"
              key={col.status}
              onClick={() => setMobileActiveColumn(col.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#0e315a] text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <span>{col.title}</span>
              <span
                className={`text-[10px] px-1.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid */}
      <div
        className={`w-full ${
          mobileActiveColumn === 'all'
            ? 'flex overflow-x-auto pb-3 gap-3.5 snap-x snap-mandatory sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible sm:pb-0'
            : 'grid grid-cols-1 w-full'
        }`}
      >
        {visibleColumns.map((col) => {
          const columnReports = getReportsByStatus(col.status);
          const isDragOver = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-[20px] p-3 flex flex-col gap-3 min-h-[440px] transition-colors ${
                isDragOver
                  ? 'bg-[#dceaff] ring-2 ring-[#155ead]'
                  : 'bg-[#e9eff5]'
              } ${
                mobileActiveColumn === 'all'
                  ? 'min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink flex-1'
                  : 'w-full'
              }`}
            >
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

              <div className="flex flex-col gap-3 w-full">
                {columnReports.length > 0 ? (
                  columnReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onDispatch={onDispatch}
                      onViewDetail={onViewDetail}
                      onDragStart={handleDragStart}
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
