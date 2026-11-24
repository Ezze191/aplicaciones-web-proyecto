'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { AnalyticsBiView } from '../components/AnalyticsBiView';
import { AppLoader } from '../components/AppLoader';
import { CrewsManagementView } from '../components/CrewsManagementView';
import { DetailModal } from '../components/DetailModal';
import { DispatchModal } from '../components/DispatchModal';
import { FilterBar } from '../components/FilterBar';
import { AdminSectionTab, Header } from '../components/Header';
import { KanbanBoard, KanbanColumnKey } from '../components/KanbanBoard';
import { MesaHeader } from '../components/MesaHeader';
import { ServiceFooter } from '../components/ServiceFooter';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import {
  AnalyticsDashboard,
  apiFetch,
  ApiError,
  ApiReport,
  CrewView,
  DepartmentItem,
} from '../lib/api';
import { logoutSession, useRequireAuth } from '../lib/auth';

export default function DashboardAdminsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth([
    'ROLE_ADMIN',
    'ROLE_SUPERVISOR',
  ]);

  const [activeSection, setActiveSection] = useState<AdminSectionTab>('kanban');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [colonias, setColonias] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<string>('ALL');

  const [reports, setReports] = useState<ApiReport[]>([]);
  const [crews, setCrews] = useState<CrewView[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multicriteria filters (README 13.2)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColonia, setSelectedColonia] = useState('Todas las colonias');
  const [selectedCrewId, setSelectedCrewId] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [minUpvotes, setMinUpvotes] = useState(0);
  const [datePreset, setDatePreset] = useState('all');
  const [selectedSla, setSelectedSla] = useState<
    'all' | 'critico' | 'en_riesgo' | 'a_tiempo'
  >('all');
  const [showRejected, setShowRejected] = useState(false);

  const [dispatchReport, setDispatchReport] = useState<ApiReport | null>(null);
  const [detailReport, setDetailReport] = useState<ApiReport | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const userId = user?.id;
  const userRole = user?.role;
  const userDepartmentId = user?.departmentId ?? null;

  useEffect(() => {
    if (userRole === 'ROLE_SUPERVISOR' && userDepartmentId) {
      setSelectedDepartmentId(userDepartmentId);
    }
  }, [userRole, userDepartmentId]);

  const loadStaticCatalogs = useCallback(async () => {
    try {
      const [depts, cols] = await Promise.all([
        apiFetch<DepartmentItem[]>('/catalogs/departments', {
          skipAuthRedirect: true,
        }),
        apiFetch<string[]>('/catalogs/colonias', { skipAuthRedirect: true }),
      ]);
      setDepartments(depts);
      setColonias(cols);
    } catch {
      // ignore
    }
  }, []);

  const loadOperationalData = useCallback(async () => {
    if (!userId) return;
    const effectiveDeptId =
      userRole === 'ROLE_SUPERVISOR' && userDepartmentId
        ? userDepartmentId
        : selectedDepartmentId;
    setIsRefreshing(true);
    try {
      const deptParam =
        effectiveDeptId !== 'ALL'
          ? `&departmentId=${encodeURIComponent(effectiveDeptId)}`
          : '';

      const [reportsList, crewsList, analyticsData] = await Promise.all([
        apiFetch<ApiReport[]>(`/reports?limit=200${deptParam}`),
        apiFetch<CrewView[]>(
          `/crews${
            effectiveDeptId !== 'ALL'
              ? `?departmentId=${encodeURIComponent(effectiveDeptId)}`
              : ''
          }`,
        ),
        apiFetch<AnalyticsDashboard>(
          `/analytics/dashboard${
            effectiveDeptId !== 'ALL'
              ? `?departmentId=${encodeURIComponent(effectiveDeptId)}`
              : ''
          }`,
        ),
      ]);

      setReports(reportsList);
      setCrews(crewsList);
      setAnalytics(analyticsData);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudieron sincronizar los datos del Backoffice.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Error de sincronización',
        message: msg,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDepartmentId, userId, userRole, userDepartmentId]);

  useEffect(() => {
    if (authLoading || !userId) return;
    void loadStaticCatalogs();
  }, [authLoading, userId, loadStaticCatalogs]);

  useEffect(() => {
    if (authLoading || !userId) return;
    void loadOperationalData();
  }, [authLoading, userId, loadOperationalData]);

  const filteredReports = useMemo(() => {
    const now = Date.now();
    return reports.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hit =
          r.folio.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.addressReference.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        if (!hit) return false;
      }

      if (
        selectedColonia !== 'Todas las colonias' &&
        !r.addressReference.toLowerCase().includes(selectedColonia.toLowerCase())
      ) {
        return false;
      }

      if (selectedCrewId !== 'all') {
        if (selectedCrewId === 'unassigned') {
          if (r.assignedCrewId) return false;
        } else if (r.assignedCrewId !== selectedCrewId) {
          return false;
        }
      }

      if (selectedRisk !== 'ALL' && r.riskLevel !== selectedRisk) {
        return false;
      }

      if (minUpvotes > 0 && r.upvotesCount < minUpvotes) {
        return false;
      }

      if (datePreset !== 'all') {
        const createdMs = new Date(r.createdAt).getTime();
        const days =
          datePreset === 'today' ? 1 : datePreset === 'week' ? 7 : 30;
        if (now - createdMs > days * 24 * 3600000) return false;
      }

      if (selectedSla !== 'all' && r.slaStatus !== selectedSla) {
        return false;
      }

      return true;
    });
  }, [
    reports,
    searchQuery,
    selectedColonia,
    selectedCrewId,
    selectedRisk,
    minUpvotes,
    datePreset,
    selectedSla,
  ]);

  const kanbanReports = useMemo(
    () => filteredReports.filter((r) => r.currentStatus !== 'RECHAZADO'),
    [filteredReports],
  );

  const rejectedReports = useMemo(
    () => filteredReports.filter((r) => r.currentStatus === 'RECHAZADO'),
    [filteredReports],
  );

  const criticalCount = useMemo(
    () => kanbanReports.filter((r) => r.slaStatus === 'critico').length,
    [kanbanReports],
  );
  const atRiskCount = useMemo(
    () => kanbanReports.filter((r) => r.slaStatus === 'en_riesgo').length,
    [kanbanReports],
  );
  const onTimeCount = useMemo(
    () => kanbanReports.filter((r) => r.slaStatus === 'a_tiempo').length,
    [kanbanReports],
  );

  const handleDropTransition = async (
    report: ApiReport,
    targetColumn: KanbanColumnKey,
  ) => {
    if (targetColumn === 'asignados' && !report.assignedCrewId) {
      setDispatchReport(report);
      return;
    }

    const targetMap: Record<
      KanbanColumnKey,
      'REGISTRADO' | 'ASIGNADO' | 'EN_PROCESO' | 'RESUELTO'
    > = {
      nuevos: 'REGISTRADO',
      asignados: 'ASIGNADO',
      en_reparacion: 'EN_PROCESO',
      resueltos: 'RESUELTO',
    };

    try {
      await apiFetch(`/reports/${report.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetMap[targetColumn] }),
      });
      showToast(`Folio ${report.folio} movido a ${targetColumn.replace('_', ' ')}`);
      await loadOperationalData();
    } catch (err) {
      setAlertState({
        open: true,
        type: 'error',
        title: 'Error al mover tarjeta',
        message:
          err instanceof ApiError ? err.message : 'No se pudo cambiar estatus.',
      });
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Folio',
      'Dependencia',
      'Categoría',
      'Riesgo',
      'Dirección',
      'Estado',
      'Semáforo_SLA',
      'Horas_Transcurridas',
      'SLA_Horas',
      'Confirmaciones',
      'Cuadrilla_Asignada',
    ];
    const rows = filteredReports.map((r) => [
      r.folio,
      `"${r.departmentName}"`,
      `"${r.categoryName}"`,
      r.riskLevel,
      `"${r.addressReference}"`,
      r.currentStatus,
      r.slaStatus,
      r.elapsedHours,
      r.slaHours,
      r.upvotesCount,
      `"${r.assignedCrewName ?? 'Sin asignar'}"`,
    ]);
    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `siu_reportes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reportes exportados a CSV');
  };

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/auth/login');
  };

  if (authLoading || !user) {
    return (
      <AppLoader
        title="Cargando panel operativo Backoffice"
        subtitle="Obteniendo incidencias, cuadrillas e indicadores de tu dependencia"
      />
    );
  }

  const activeDept = departments.find((d) => d.id === selectedDepartmentId);

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43] antialiased">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e315a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      <Header
        currentUser={user}
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        onSelectDepartment={setSelectedDepartmentId}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onLogout={() => void handleLogout()}
      />

      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3.5 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 flex flex-col gap-5">
        {activeSection === 'kanban' && (
          <>
            <MesaHeader
              departmentName={activeDept?.name ?? 'Todas las dependencias'}
              departmentCode={activeDept?.code ?? user.departmentCode}
              totalVisible={kanbanReports.length}
              onRefresh={() => void loadOperationalData()}
              onExport={handleExportCsv}
              isRefreshing={isRefreshing}
            />

            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              colonias={colonias}
              selectedColonia={selectedColonia}
              onColoniaChange={setSelectedColonia}
              crews={crews}
              selectedCrewId={selectedCrewId}
              onCrewChange={setSelectedCrewId}
              selectedRisk={selectedRisk}
              onRiskChange={setSelectedRisk}
              minUpvotes={minUpvotes}
              onMinUpvotesChange={setMinUpvotes}
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              selectedSla={selectedSla}
              onSlaChange={setSelectedSla}
              criticalCount={criticalCount}
              atRiskCount={atRiskCount}
              onTimeCount={onTimeCount}
            />

            <KanbanBoard
              reports={kanbanReports}
              onDispatch={(r) => setDispatchReport(r)}
              onViewDetail={(r) => setDetailReport(r)}
              onDropTransition={(r, col) => void handleDropTransition(r, col)}
            />

            {rejectedReports.length > 0 && (
              <div className="bg-white border border-[#dce4ed] rounded-[16px] p-4">
                <button
                  type="button"
                  onClick={() => setShowRejected((v) => !v)}
                  className="text-xs font-bold text-[#be313b] hover:underline cursor-pointer"
                >
                  {showRejected
                    ? `Ocultar reportes rechazados (${rejectedReports.length})`
                    : `Ver reportes rechazados (${rejectedReports.length})`}
                </button>
                {showRejected && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    {rejectedReports.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setDetailReport(r)}
                        className="p-3 rounded-xl border border-[#f5c6cb] bg-[#fdeef0]/40 cursor-pointer"
                      >
                        <p className="text-xs font-bold text-[#be313b]">
                          {r.folio} · RECHAZADO
                        </p>
                        <p className="text-sm font-semibold text-[#172b43]">
                          {r.categoryName}
                        </p>
                        <p className="text-xs text-[#5e7085]">
                          {r.addressReference}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ServiceFooter
              slaHours={activeDept?.defaultSlaHours ?? 24}
              departmentName={activeDept?.code ?? 'S.I.U'}
            />
          </>
        )}

        {activeSection === 'flotillas' && (
          <CrewsManagementView
            crews={crews}
            departments={departments}
            currentUser={user}
            onRefresh={loadOperationalData}
            onNotify={(type, msg) => {
              if (type === 'success') showToast(msg);
              else
                setAlertState({
                  open: true,
                  type: 'error',
                  title: 'Flotillas',
                  message: msg,
                });
            }}
          />
        )}

        {activeSection === 'analitica' && (
          <AnalyticsBiView analytics={analytics} loading={isRefreshing} />
        )}
      </main>

      <DispatchModal
        report={dispatchReport}
        isOpen={Boolean(dispatchReport)}
        onClose={() => setDispatchReport(null)}
        onSuccess={(_updated, msg) => {
          showToast(msg);
          void loadOperationalData();
        }}
        onError={(msg) =>
          setAlertState({
            open: true,
            type: 'error',
            title: 'Error de despacho',
            message: msg,
          })
        }
      />

      <DetailModal
        report={detailReport}
        isOpen={Boolean(detailReport)}
        onClose={() => setDetailReport(null)}
        onUpdated={(_updated, msg) => {
          showToast(msg);
          void loadOperationalData();
        }}
        onError={(msg) =>
          setAlertState({
            open: true,
            type: 'error',
            title: 'Error operativo',
            message: msg,
          })
        }
        onOpenDispatch={(r) => setDispatchReport(r)}
      />
    </div>
  );
}
