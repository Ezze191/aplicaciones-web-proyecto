'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  MapPin,
  ThumbsUp,
  Plus,
  Map as MapIcon,
  ClipboardList,
  HelpCircle,
  CheckCircle2,
  PhoneCall,
  Clock,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-react';
import { AppLoader } from '../components/AppLoader';
import { CiudadanoHeader } from '../components/CiudadanoHeader';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import {
  apiFetch,
  ApiError,
  ApiReport,
  DepartmentItem,
} from '../lib/api';
import { useRequireAuth } from '../lib/auth';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

type CitizenTab = 'mapa' | 'mis-reportes' | 'ayuda';

const TORREON_CENTER = { lat: 25.5428, lng: -103.4068 };

function translateStatus(status: ApiReport['currentStatus']): string {
  switch (status) {
    case 'REGISTRADO':
    case 'VALIDADO':
      return 'Reportado';
    case 'ASIGNADO':
      return 'Asignado';
    case 'EN_PROCESO':
      return 'En proceso';
    case 'RESUELTO':
      return 'Resuelto';
    case 'RECHAZADO':
      return 'Rechazado';
  }
}

function getStatusBadgeClass(status: ApiReport['currentStatus']): string {
  switch (status) {
    case 'EN_PROCESO':
      return 'bg-[#edf5ff] text-[#155ead]';
    case 'ASIGNADO':
      return 'bg-[#fff5da] text-[#966409]';
    case 'RESUELTO':
      return 'bg-[#eaf6ef] text-[#18734a]';
    case 'RECHAZADO':
      return 'bg-[#fdeef0] text-[#be313b]';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function DashboardCiudadanoPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [activeTab, setActiveTab] = useState<CitizenTab>('mapa');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [myReports, setMyReports] = useState<ApiReport[]>([]);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>(
    TORREON_CENTER,
  );
  const [gpsActive, setGpsActive] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const loadData = useCallback(
    async (coords = userCoords) => {
      setIsLoadingData(true);
      try {
        const [depts, nearby, mine] = await Promise.all([
          apiFetch<DepartmentItem[]>('/catalogs/departments', {
            skipAuthRedirect: true,
          }),
          apiFetch<ApiReport[]>(
            `/reports?lat=${coords.lat}&lng=${coords.lng}&radiusMeters=25000&limit=80`,
            { skipAuthRedirect: true },
          ),
          apiFetch<ApiReport[]>('/reports/my', { skipAuthRedirect: true }).catch(
            () => [] as ApiReport[],
          ),
        ]);
        setDepartments(depts);
        setReports(nearby);
        setMyReports(mine);
        if (nearby.length > 0 && !selectedReportId) {
          setSelectedReportId(nearby[0].id);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'No se pudieron cargar las incidencias.';
        setAlertState({
          open: true,
          type: 'error',
          title: 'Error de conexión',
          message: msg,
        });
      } finally {
        setIsLoadingData(false);
      }
    },
    [selectedReportId, userCoords],
  );

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(next);
        setGpsActive(true);
        void loadData(next);
        showToast('Mapa centrado en tu ubicación GPS');
      },
      () => {
        setGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [loadData]);

  useEffect(() => {
    if (authLoading) return;
    void loadData(userCoords);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserCoords(next);
          setGpsActive(true);
          void loadData(next);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 5000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedDeptCode !== 'ALL' && r.departmentCode !== selectedDeptCode) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.folio.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.addressReference.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [reports, selectedDeptCode, searchQuery]);

  const selectedReport = useMemo(() => {
    return (
      filteredReports.find((r) => r.id === selectedReportId) ??
      filteredReports[0] ??
      null
    );
  }, [filteredReports, selectedReportId]);

  const resolvedThisWeekCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600000;
    return reports.filter(
      (r) =>
        r.currentStatus === 'RESUELTO' &&
        r.resolvedAt &&
        new Date(r.resolvedAt).getTime() >= sevenDaysAgo,
    ).length;
  }, [reports]);

  const handleConfirmVote = async (reportId: string) => {
    setUpvotingId(reportId);
    try {
      const res = await apiFetch<{ upvotesCount: number; message: string }>(
        `/reports/${reportId}/upvote`,
        {
          method: 'POST',
          body: JSON.stringify({ deviceId: user?.id }),
        },
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, upvotesCount: res.upvotesCount } : r,
        ),
      );
      showToast(res.message);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo registrar la confirmación.';
      setAlertState({
        open: true,
        type: 'info',
        title: 'Confirmación vecinal',
        message: msg,
      });
    } finally {
      setUpvotingId(null);
    }
  };

  if (authLoading) {
    return (
      <AppLoader
        title="Verificando sesión ciudadana"
        subtitle="Cargando mapa e incidencias de Torreón"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43] pb-20 md:pb-0">
      <CiudadanoHeader userOverride={user} />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#0e315a] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-7 flex flex-col gap-5">
        {/* Contexto Ciudadano + Búsqueda Global */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[#155ead]">
              <MapPin className="size-4 shrink-0" />
              <span className="font-semibold text-[12px] tracking-wide uppercase">
                TORREÓN · {gpsActive ? 'GPS ACTIVO' : 'ZONA CENTRO'}
              </span>
            </div>
            <h1 className="font-bold text-[24px] sm:text-[28px] text-[#172b43] leading-tight">
              Tu ciudad, en tus manos.
            </h1>
            <p className="text-[#5e7085] text-[13px] sm:text-[14px]">
              Reporta, suma tu voz y sigue las mejoras de tu colonia en tiempo
              real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="bg-white border border-[#dce4ed] rounded-[12px] h-12 px-3.5 flex items-center gap-2 sm:w-[280px] focus-within:border-[#155ead]">
              <Search className="size-4 text-[#5e7085] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar folio, calle o falla..."
                className="w-full bg-transparent text-[13px] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadData(userCoords)}
              className="hidden sm:flex items-center justify-center gap-1.5 bg-white border border-[#dce4ed] hover:bg-slate-50 text-[#155ead] font-semibold text-[13px] h-12 px-3.5 rounded-[12px] cursor-pointer"
              title="Actualizar reportes"
            >
              <RefreshCw
                className={`size-4 ${isLoadingData ? 'animate-spin' : ''}`}
              />
            </button>

            <Link
              href="/reportar"
              className="hidden md:flex items-center justify-center gap-2 bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[14px] h-12 px-5 rounded-[12px] shadow-sm transition-all shrink-0"
            >
              <Plus className="size-5" />
              <span>Reportar Falla</span>
            </Link>
          </div>
        </div>

        {/* TAB 1: MAPA DE REPORTES */}
        {activeTab === 'mapa' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 flex flex-col gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedDeptCode('ALL')}
                  className={`px-3.5 py-2 rounded-full text-[12px] font-semibold shadow-2xs transition-all cursor-pointer shrink-0 ${
                    selectedDeptCode === 'ALL'
                      ? 'bg-[#0e315a] text-white'
                      : 'bg-white text-[#172b43] border border-[#dce4ed] hover:bg-slate-50'
                  }`}
                >
                  Todas ({reports.length})
                </button>
                {departments.map((dept) => {
                  const active = selectedDeptCode === dept.code;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDeptCode(dept.code)}
                      className={`flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full text-[12px] font-semibold shadow-2xs transition-all cursor-pointer shrink-0 ${
                        active
                          ? 'bg-[#155ead] text-white'
                          : 'bg-white text-[#172b43] border border-[#dce4ed] hover:bg-slate-50'
                      }`}
                    >
                      <DepartmentLogo code={dept.code} size="xs" />
                      <span>{dept.code} · {dept.name.split('(')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Real Map Container */}
              <div className="relative">
                <InteractiveMap
                  center={
                    selectedReport
                      ? { lat: selectedReport.lat, lng: selectedReport.lng }
                      : userCoords
                  }
                  zoom={14}
                  heightClass="h-[430px] sm:h-[500px]"
                  userLocation={userCoords}
                  showLocateButton
                  onLocateClick={requestGps}
                  markers={filteredReports.map((r) => ({
                    id: r.id,
                    lat: r.lat,
                    lng: r.lng,
                    title: `${r.folio} · ${r.categoryName}`,
                    colorHex: r.departmentColor,
                    selected: selectedReport?.id === r.id,
                  }))}
                  onMarkerClick={(id) => setSelectedReportId(id)}
                />

                {/* Mobile Floating Selected Card Overlay */}
                {selectedReport && (
                  <div className="lg:hidden mt-3 bg-white rounded-[16px] p-4 shadow-md border border-[#dce4ed] flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: selectedReport.departmentColor }}
                      >
                        {selectedReport.departmentCode} · {selectedReport.folio}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${getStatusBadgeClass(
                          selectedReport.currentStatus,
                        )}`}
                      >
                        {translateStatus(selectedReport.currentStatus)}
                      </span>
                    </div>
                    <p className="font-bold text-[15px] text-[#172b43] leading-snug">
                      {selectedReport.categoryName}
                    </p>
                    <p className="text-[11px] text-[#5e7085] truncate">
                      {selectedReport.addressReference}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="font-bold text-[13px] text-[#172b43]">
                          {selectedReport.upvotesCount} confirmaciones
                        </p>
                        {selectedReport.distanceMeters !== null && (
                          <p className="text-[10px] text-[#5e7085]">
                            A {selectedReport.distanceMeters} m de ti
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedReport.currentStatus !== 'RESUELTO' &&
                          selectedReport.currentStatus !== 'RECHAZADO' && (
                            <button
                              type="button"
                              disabled={upvotingId === selectedReport.id}
                              onClick={() => handleConfirmVote(selectedReport.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[11px] font-semibold bg-[#edf5ff] text-[#155ead] hover:bg-[#dcebff] cursor-pointer disabled:opacity-60"
                            >
                              <ThumbsUp className="size-3.5" />
                              <span>Sigue ahí (+1)</span>
                            </button>
                          )}
                        <Link
                          href={`/mis-reportes/${encodeURIComponent(selectedReport.folio)}`}
                          className="px-3 py-2 rounded-[8px] text-[11px] font-semibold bg-[#0e315a] text-white"
                        >
                          Detalle
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen Local */}
              <div className="flex items-center justify-between px-1 text-[12px]">
                <span className="text-[#5e7085]">
                  {filteredReports.length} reportes en el mapa
                </span>
                <span className="font-semibold text-[#18734a]">
                  {resolvedThisWeekCount} resueltos esta semana
                </span>
              </div>

              {/* Mobile Floating CTA */}
              <Link
                href="/reportar"
                className="md:hidden w-full bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[14px] h-12 rounded-[12px] shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="size-5" />
                <span>Reportar Falla</span>
              </Link>
            </div>

            {/* Right Column on Desktop */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {selectedReport ? (
                <div className="hidden lg:flex bg-white rounded-[20px] p-5 shadow-[0px_8px_24px_rgba(14,49,90,0.08)] border border-[#dce4ed] flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: selectedReport.departmentColor }}
                    >
                      {selectedReport.departmentCode} · {selectedReport.folio}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${getStatusBadgeClass(
                        selectedReport.currentStatus,
                      )}`}
                    >
                      {translateStatus(selectedReport.currentStatus)}
                    </span>
                  </div>

                  <h2 className="font-bold text-[18px] text-[#172b43] leading-snug">
                    {selectedReport.categoryName}
                  </h2>

                  <p className="text-[12px] text-[#5e7085] leading-relaxed">
                    {selectedReport.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-[#5e7085] text-[12px]">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{selectedReport.addressReference}</span>
                  </div>

                  <div className="border-t border-[#dce4ed] pt-3 mt-1 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[14px] text-[#172b43]">
                        {selectedReport.upvotesCount} confirmaciones
                      </p>
                      {selectedReport.distanceMeters !== null && (
                        <p className="text-[11px] text-[#5e7085]">
                          A {selectedReport.distanceMeters} m de ti
                        </p>
                      )}
                    </div>
                    {selectedReport.currentStatus !== 'RESUELTO' &&
                      selectedReport.currentStatus !== 'RECHAZADO' && (
                        <button
                          type="button"
                          disabled={upvotingId === selectedReport.id}
                          onClick={() => handleConfirmVote(selectedReport.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[12px] font-semibold bg-[#edf5ff] text-[#155ead] hover:bg-[#dcebff] transition-all cursor-pointer disabled:opacity-60"
                        >
                          <ThumbsUp className="size-4" />
                          <span>Sigue ahí (+1)</span>
                        </button>
                      )}
                  </div>

                  <Link
                    href={`/mis-reportes/${encodeURIComponent(selectedReport.folio)}`}
                    className="text-[12px] font-semibold text-[#155ead] hover:underline pt-1"
                  >
                    Ver trazabilidad del reporte →
                  </Link>
                </div>
              ) : (
                <div className="hidden lg:flex bg-white rounded-[20px] p-6 border border-[#dce4ed] text-[13px] text-[#5e7085]">
                  {isLoadingData
                    ? 'Cargando reportes cercanos...'
                    : 'No hay incidencias registradas en esta zona todavía.'}
                </div>
              )}

              {/* Nearby Reports List */}
              <div className="bg-white rounded-[16px] p-4 border border-[#dce4ed] flex flex-col gap-3">
                <h3 className="font-bold text-[14px] text-[#0e315a]">
                  Incidencias cercanas ({filteredReports.length})
                </h3>
                <div className="flex flex-col gap-2 max-h-[290px] overflow-y-auto pr-1">
                  {filteredReports.length === 0 ? (
                    <p className="text-xs text-[#5e7085] py-4 text-center">
                      Sin incidencias para los filtros actuales.
                    </p>
                  ) : (
                    filteredReports.map((rep) => {
                      const isActive = selectedReport?.id === rep.id;
                      return (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => setSelectedReportId(rep.id)}
                          className={`w-full text-left p-3 rounded-[12px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-[#edf5ff] border-[#155ead]'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-[#155ead]">
                              {rep.folio} · {rep.departmentCode}
                            </p>
                            <p className="text-[13px] font-semibold text-[#172b43] truncate">
                              {rep.categoryName}
                            </p>
                            <p className="text-[11px] text-[#5e7085] truncate">
                              {rep.addressReference}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-slate-400 shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MIS REPORTES */}
        {activeTab === 'mis-reportes' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[20px] text-[#0e315a]">
                Mis reportes enviados ({myReports.length})
              </h2>
              <Link
                href="/mis-reportes"
                className="text-xs font-semibold text-[#155ead] hover:underline"
              >
                Abrir vista completa →
              </Link>
            </div>

            {myReports.length === 0 ? (
              <div className="bg-white border border-dashed border-[#dce4ed] rounded-[16px] p-8 text-center flex flex-col items-center gap-3">
                <p className="text-sm text-[#5e7085]">
                  Aún no has enviado reportes ciudadanos con esta cuenta.
                </p>
                <Link
                  href="/reportar"
                  className="px-4 py-2.5 rounded-[12px] bg-[#155ead] text-white text-xs font-semibold"
                >
                  Crear mi primer reporte
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white border border-[#dce4ed] rounded-[16px] p-5 flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[#155ead]">
                        {rep.folio}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold ${getStatusBadgeClass(
                          rep.currentStatus,
                        )}`}
                      >
                        {translateStatus(rep.currentStatus)}
                      </span>
                    </div>
                    <h3 className="font-bold text-[16px] text-[#172b43]">
                      {rep.categoryName}
                    </h3>
                    <p className="text-[12px] text-[#5e7085]">
                      {rep.addressReference}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#5e7085] pt-2 border-t border-slate-100">
                      <span>
                        {new Date(rep.createdAt).toLocaleDateString('es-MX')}
                      </span>
                      <Link
                        href={`/mis-reportes/${encodeURIComponent(rep.folio)}`}
                        className="font-semibold text-[#155ead] hover:underline"
                      >
                        Ver trazabilidad →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AYUDA */}
        {activeTab === 'ayuda' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <PhoneCall className="size-5 text-[#155ead]" />
                <h3 className="font-bold text-[17px]">
                  Líneas de Atención Ciudadana
                </h3>
              </div>
              <p className="text-[13px] text-[#5e7085]">
                Atención directa para emergencias urbanas en el municipio de
                Torreón:
              </p>
              <ul className="flex flex-col gap-2 text-[13px]">
                <li className="p-3 rounded-xl bg-[#f3f6fa] flex justify-between">
                  <span className="font-semibold">SIMAS (Agua y Drenaje)</span>
                  <span className="font-bold text-[#155ead]">871 690 9595</span>
                </li>
                <li className="p-3 rounded-xl bg-[#f3f6fa] flex justify-between">
                  <span className="font-semibold">Atención Ciudadana 073</span>
                  <span className="font-bold text-[#155ead]">
                    073 / 871 500 7000
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <Clock className="size-5 text-[#155ead]" />
                <h3 className="font-bold text-[17px]">
                  Tiempos de Respuesta (SLA)
                </h3>
              </div>
              <p className="text-[13px] text-[#5e7085]">
                Compromisos oficiales registrados por dependencia:
              </p>
              <ul className="flex flex-col gap-2 text-[12px] text-[#172b43]">
                {departments.map((d) => (
                  <li
                    key={d.id}
                    className="p-2.5 rounded-lg border border-slate-100 flex items-center justify-between"
                  >
                    <span>
                      <strong>{d.code}</strong> · {d.name}
                    </span>
                    <span className="font-bold text-[#155ead] shrink-0 ml-2">
                      {d.defaultSlaHours} h
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#dce4ed] px-6 py-3 flex items-center justify-between z-30 shadow-[0_-4px_16px_rgba(14,49,90,0.06)]">
        <button
          type="button"
          onClick={() => setActiveTab('mapa')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'mapa'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085]'
          }`}
        >
          <MapIcon className="size-5" />
          <span className="text-[11px]">Mapa</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mis-reportes')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'mis-reportes'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085]'
          }`}
        >
          <ClipboardList className="size-5" />
          <span className="text-[11px]">Mis reportes</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ayuda')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'ayuda'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085]'
          }`}
        >
          <HelpCircle className="size-5" />
          <span className="text-[11px]">Ayuda</span>
        </button>
      </nav>
    </div>
  );
}
