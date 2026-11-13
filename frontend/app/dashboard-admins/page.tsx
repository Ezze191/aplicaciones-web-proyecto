'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { MesaHeader } from '../components/MesaHeader';
import { FilterBar } from '../components/FilterBar';
import { KanbanBoard } from '../components/KanbanBoard';
import { DispatchModal } from '../components/DispatchModal';
import { DetailModal } from '../components/DetailModal';
import { ServiceFooter } from '../components/ServiceFooter';
import { DEPENDENCIES, INITIAL_REPORTS } from '../data/dashboardData';
import {
  DependencyKey,
  PriorityLevel,
  Report,
  ReportStatus,
} from '../types/dashboard';
import { CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  // Current active dependency
  const [activeDependencyKey, setActiveDependencyKey] =
    useState<DependencyKey>('simas');

  // Reports state per dependency (allows in-memory dispatching, updating, etc.)
  const [reportsData, setReportsData] =
    useState<Record<string, Report[]>>(INITIAL_REPORTS);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColonia, setSelectedColonia] = useState('Todas las colonias');
  const [selectedCrew, setSelectedCrew] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'all'>('all');

  // Modals state
  const [dispatchReport, setDispatchReport] = useState<Report | null>(null);
  const [detailReport, setDetailReport] = useState<Report | null>(null);

  // Refresh & Toast feedback state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentDependency = DEPENDENCIES[activeDependencyKey];
  const allCurrentReports = reportsData[activeDependencyKey] ?? [];

  // Show toast utility
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Change active dependency
  const handleSelectDependency = (key: DependencyKey) => {
    setActiveDependencyKey(key);
    // Reset dependency-specific dropdown filters
    setSelectedColonia('Todas las colonias');
    setSelectedCrew('all');
    setSelectedPriority('all');
    setSearchQuery('');
  };

  // Filter reports dynamically
  const filteredReports = useMemo(() => {
    return allCurrentReports.filter((report) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesFolio = report.folio.toLowerCase().includes(query);
        const matchesTitle = report.title.toLowerCase().includes(query);
        const matchesAddress = report.address.toLowerCase().includes(query);
        const matchesColonia = report.colonia.toLowerCase().includes(query);

        if (!matchesFolio && !matchesTitle && !matchesAddress && !matchesColonia) {
          return false;
        }
      }

      // Colonia filter
      if (
        selectedColonia !== 'Todas las colonias' &&
        report.colonia.toLowerCase() !== selectedColonia.toLowerCase()
      ) {
        return false;
      }

      // Crew filter
      if (selectedCrew !== 'all') {
        if (!report.assignedCrew || report.assignedCrew !== selectedCrew) {
          return false;
        }
      }

      // Priority filter
      if (selectedPriority !== 'all' && report.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [allCurrentReports, searchQuery, selectedColonia, selectedCrew, selectedPriority]);

  // Counts for alert badges
  const criticalCount = useMemo(
    () => allCurrentReports.filter((r) => r.priority === 'critico').length,
    [allCurrentReports]
  );
  const atRiskCount = useMemo(
    () => allCurrentReports.filter((r) => r.priority === 'en_riesgo').length,
    [allCurrentReports]
  );
  const onTimeCount = useMemo(
    () => allCurrentReports.filter((r) => r.priority === 'a_tiempo').length,
    [allCurrentReports]
  );

  // Dispatch Action: Moves report from 'nuevos' to 'asignados'
  const handleConfirmDispatch = (
    reportId: string,
    assignedCrew: string,
    notes?: string
  ) => {
    setReportsData((prev) => {
      const depReports = prev[activeDependencyKey] ?? [];
      const updated = depReports.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: 'asignados' as ReportStatus,
            assignedCrew: assignedCrew,
            description: notes
              ? `${r.description ?? ''} [Instrucción: ${notes}]`
              : r.description,
          };
        }
        return r;
      });
      return {
        ...prev,
        [activeDependencyKey]: updated,
      };
    });

    showToast(`Folio ${dispatchReport?.folio} despachado exitosamente a ${assignedCrew}`);
  };

  // Advance Report Status Action (for testing lifecycle)
  const handleAdvanceStatus = (reportId: string, nextStatus: ReportStatus) => {
    setReportsData((prev) => {
      const depReports = prev[activeDependencyKey] ?? [];
      const updated = depReports.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: nextStatus,
          };
        }
        return r;
      });
      return {
        ...prev,
        [activeDependencyKey]: updated,
      };
    });

    const statusNames: Record<ReportStatus, string> = {
      nuevos: 'Nuevos',
      asignados: 'Asignados',
      en_reparacion: 'En Reparación',
      resueltos: 'Resueltos',
    };
    showToast(`Estado actualizado a: ${statusNames[nextStatus]}`);
  };

  // Refresh Board handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Tablero de operaciones sincronizado');
    }, 600);
  };

  // Export to CSV handler
  const handleExport = () => {
    const headers = [
      'Folio',
      'Dependencia',
      'Título',
      'Dirección',
      'Colonia',
      'Estado',
      'Prioridad',
      'Horas_Transcurridas',
      'SLA_Horas',
      'Confirmaciones',
      'Cuadrilla_Asignada',
    ];

    const rows = filteredReports.map((r) => [
      r.folio,
      currentDependency.fullName,
      `"${r.title}"`,
      `"${r.address}"`,
      `"${r.colonia}"`,
      r.status,
      r.priority,
      r.elapsedHours,
      r.slaHours,
      r.confirmations,
      `"${r.assignedCrew ?? 'Sin asignar'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `reportes_${currentDependency.key}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Reportes exportados a CSV');
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43] antialiased">
      {/* Toast feedback notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e315a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        currentDependency={currentDependency}
        allDependencies={DEPENDENCIES}
        onSelectDependency={handleSelectDependency}
        unreadCount={criticalCount}
      />

      {/* Main Board Container */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3.5 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 flex flex-col gap-4 sm:gap-6">
        {/* Mesa de operación title & actions */}
        <MesaHeader
          dependency={currentDependency}
          totalVisible={filteredReports.length}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isRefreshing={isRefreshing}
        />

        {/* Search, Filter dropdowns & Priority Badges */}
        <FilterBar
          dependency={currentDependency}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedColonia={selectedColonia}
          onColoniaChange={setSelectedColonia}
          selectedCrew={selectedCrew}
          onCrewChange={setSelectedCrew}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          criticalCount={criticalCount}
          atRiskCount={atRiskCount}
          onTimeCount={onTimeCount}
        />

        {/* 4-Column Kanban Board */}
        <KanbanBoard
          reports={filteredReports}
          dependency={currentDependency}
          onDispatch={(report) => setDispatchReport(report)}
          onViewDetail={(report) => setDetailReport(report)}
          onStatusChange={handleAdvanceStatus}
        />

        {/* Service & SLA Footer */}
        <ServiceFooter dependency={currentDependency} />
      </main>

      {/* Dispatch Modal (Figma Frame 3:17365) */}
      <DispatchModal
        report={dispatchReport}
        dependency={currentDependency}
        isOpen={Boolean(dispatchReport)}
        onClose={() => setDispatchReport(null)}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* Detail & Evidence Modal */}
      <DetailModal
        report={detailReport}
        dependency={currentDependency}
        isOpen={Boolean(detailReport)}
        onClose={() => setDetailReport(null)}
        onAdvanceStatus={handleAdvanceStatus}
      />
    </div>
  );
}

