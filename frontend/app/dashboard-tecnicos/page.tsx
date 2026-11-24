'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  Camera,
  CheckCircle2,
  ClipboardList,
  LocateFixed,
  LogOut,
  Navigation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AppLoader } from '../components/AppLoader';
import {
  DepartmentLogo,
  inferDepartmentCodeFromEmail,
} from '../components/DepartmentLogo';
import { NotificationBell } from '../components/NotificationBell';
import { SiuLogo } from '../components/SiuLogo';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import {
  apiFetch,
  ApiError,
  CrewView,
  uploadEvidenceFile,
  WorkOrderView,
} from '../lib/api';
import { logoutSession, useRequireAuth } from '../lib/auth';
import { dataUrlToWebpFile } from '../lib/imageUtils';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

type TechTab = 'asignados' | 'resueltos' | 'mi-cuadrilla';
type SortMode = 'cercania' | 'urgencia';
type CameraStep =
  | 'closed'
  | 'live'
  | 'denied'
  | 'review'
  | 'confirm'
  | 'resolved';

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function DashboardTecnicosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth([
    'ROLE_CREW',
    'ROLE_ADMIN',
  ]);

  const [activeTab, setActiveTab] = useState<TechTab>('asignados');
  const [sortMode, setSortMode] = useState<SortMode>('cercania');
  const [orders, setOrders] = useState<WorkOrderView[]>([]);
  const [crewInfo, setCrewInfo] = useState<CrewView | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 25.5428,
    lng: -103.4068,
  });
  const [gpsDetected, setGpsDetected] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<WorkOrderView | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Camera & Closure Flow (Figma 27:3828 -> 27:3852 -> 27:3894 -> 27:3951 / 27:4010)
  const [cameraStep, setCameraStep] = useState<CameraStep>('closed');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [fieldNotes, setFieldNotes] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const loadData = useCallback(
    async (coords = userCoords, sort = sortMode) => {
      setLoadingData(true);
      try {
        const [ordersData, crewData] = await Promise.all([
          apiFetch<WorkOrderView[]>(
            `/work-orders/my?lat=${coords.lat}&lng=${coords.lng}&sort=${sort}`,
          ),
          apiFetch<CrewView>('/crews/my').catch(() => null),
        ]);
        setOrders(ordersData);
        setCrewInfo(crewData);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'No se pudieron cargar las órdenes de trabajo.';
        setAlertState({
          open: true,
          type: 'error',
          title: 'Error de carga',
          message: msg,
        });
      } finally {
        setLoadingData(false);
      }
    },
    [sortMode, userCoords],
  );

  useEffect(() => {
    if (authLoading) return;
    void loadData(userCoords, sortMode);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserCoords(next);
          setGpsDetected(true);
          void loadData(next, sortMode);
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, sortMode]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.reportStatus !== 'RESUELTO'),
    [orders],
  );

  const resolvedOrders = useMemo(
    () => orders.filter((o) => o.reportStatus === 'RESUELTO'),
    [orders],
  );

  const criticalOrder = useMemo(
    () => pendingOrders.find((o) => o.slaStatus === 'critico') ?? null,
    [pendingOrders],
  );

  const handleStartAttention = async (order: WorkOrderView) => {
    setActionLoading(true);
    try {
      await apiFetch(`/work-orders/${order.id}/start`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showToast('Atención en campo iniciada (En proceso)');
      await loadData();
      setSelectedOrder((prev) =>
        prev && prev.id === order.id
          ? { ...prev, reportStatus: 'EN_PROCESO', workOrderStatus: 'EN_SITIO' }
          : prev,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'No se pudo iniciar atención.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Error operativo',
        message: msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openLiveCamera = async () => {
    setCapturedDataUrl(null);
    setCameraStep('live');
    stopCameraStream();

    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraStep('denied');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 100);
    } catch {
      setCameraStep('denied');
    }
  };

  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedDataUrl(dataUrl);
    stopCameraStream();
    setCameraStep('review');
  };

  const handleConfirmResolution = async () => {
    if (!selectedOrder || !capturedDataUrl) return;
    setActionLoading(true);
    try {
      // Refresh latest GPS before sending
      const latestCoords = await new Promise<{ lat: number; lng: number }>(
        (resolve) => {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              () => resolve(userCoords),
              { enableHighAccuracy: true, timeout: 6000 },
            );
          } else {
            resolve(userCoords);
          }
        },
      );
      setUserCoords(latestCoords);

      const webpFile = await dataUrlToWebpFile(
        capturedDataUrl,
        `cierre-${selectedOrder.folio}.webp`,
      );
      const uploaded = await uploadEvidenceFile(webpFile);

      await apiFetch(`/work-orders/${selectedOrder.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: uploaded.url,
          lat: latestCoords.lat,
          lng: latestCoords.lng,
          captureSource: 'CAMERA',
          fieldNotes: fieldNotes.trim() || undefined,
        }),
      });

      setCameraStep('resolved');
      await loadData(latestCoords, sortMode);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo completar el cierre técnico.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Validación de cierre en campo',
        message: msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityBadge = (slaStatus: WorkOrderView['slaStatus']) => {
    switch (slaStatus) {
      case 'critico':
        return {
          label: 'Crítico',
          bg: 'bg-[#fdeef0]',
          text: 'text-[#be313b]',
          dot: 'bg-[#be313b]',
        };
      case 'en_riesgo':
        return {
          label: 'En riesgo',
          bg: 'bg-[#fff5da]',
          text: 'text-[#966409]',
          dot: 'bg-[#966409]',
        };
      default:
        return {
          label: 'A tiempo',
          bg: 'bg-[#eaf6ef]',
          text: 'text-[#18734a]',
          dot: 'bg-[#18734a]',
        };
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/auth/login');
  };

  if (authLoading) {
    return (
      <AppLoader
        title="Cargando portal de cuadrilla"
        subtitle="Sincronizando órdenes de trabajo asignadas"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43] pb-20 md:pb-0">
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#0e315a] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold">
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

      {/* Header Flotilla */}
      <header className="bg-[#0e315a] text-white w-full shrink-0 shadow-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {user?.departmentCode ||
            crewInfo?.departmentCode ||
            inferDepartmentCodeFromEmail(user?.email) ? (
              <DepartmentLogo
                code={
                  user?.departmentCode ??
                  crewInfo?.departmentCode ??
                  inferDepartmentCodeFromEmail(user?.email)
                }
                size="md"
                className="border-white/25"
              />
            ) : (
              <SiuLogo variant="dark" />
            )}
            <div className="flex flex-col">
              <span className="font-bold text-[15px] sm:text-[17px] leading-tight tracking-tight">
                {user?.departmentName ?? crewInfo?.departmentName ?? 'S.I.U'}
              </span>
              <span className="text-[#ccdbed] text-[9px] tracking-wider uppercase">
                PORTAL OPERATIVO DE CUADRILLA · S.I.U
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('asignados')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'asignados'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ClipboardList className="size-4" />
              <span>Asignados ({pendingOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resueltos')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'resueltos'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>Resueltos ({resolvedOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mi-cuadrilla')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'mi-cuadrilla'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="size-4" />
              <span>Mi cuadrilla</span>
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <div className="hidden sm:block text-right pl-2 border-l border-white/15">
              <p className="text-[12px] font-semibold leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-[#ccdbed] leading-tight">
                Jefe de Cuadrilla
              </p>
            </div>
            <div className="size-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
              <User className="size-4 text-white" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {/* Sub-barra de Cuadrilla */}
        <div className="border-t border-white/10 bg-black/15">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span className="font-semibold text-[14px] text-white">
                {crewInfo?.name ?? user?.crewName ?? 'Flotilla Operativa'}
              </span>
              <span className="hidden sm:inline text-white/40">•</span>
              <span className="text-[#c5d9ed] text-[12px]">
                {crewInfo?.departmentName ?? user?.departmentName ?? 'Dependencia'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadData(userCoords, sortMode)}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#c5d9ed] hover:text-white cursor-pointer w-fit"
            >
              <RefreshCw
                className={`size-3.5 ${loadingData ? 'animate-spin' : ''}`}
              />
              <span>Sincronizar órdenes</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-7 flex flex-col gap-5">
        {activeTab === 'asignados' && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-[#5e7085] text-[12px]">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <h1 className="font-bold text-[24px] sm:text-[28px] text-[#172b43] leading-tight">
                Reportes asignados
              </h1>
              <p className="text-[#5e7085] text-[13px] sm:text-[14px]">
                {pendingOrders.length}{' '}
                {pendingOrders.length === 1
                  ? 'pendiente en tu cuadrilla'
                  : 'pendientes en tu cuadrilla'}
                . Revisa la urgencia SLA antes de iniciar tu recorrido.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Izquierda: Urgencia + Mapa */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {criticalOrder && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(criticalOrder)}
                    className="text-left bg-[#fdeef0] border border-[#f5c6cb] rounded-[12px] p-4 flex flex-col gap-2 cursor-pointer hover:bg-[#fbdce0] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[#be313b]">
                      <AlertTriangle className="size-4.5 shrink-0" />
                      <span className="font-bold text-[13px]">
                        Atender primero · SLA crítico
                      </span>
                    </div>
                    <p className="text-[#be313b] text-[12px] leading-relaxed">
                      {criticalOrder.folio} · A {criticalOrder.distanceKm} km ·{' '}
                      {criticalOrder.elapsedHours} h transcurridas (SLA{' '}
                      {criticalOrder.slaHours} h).
                    </p>
                    <span className="font-bold text-[#be313b] text-[12px]">
                      Ver reporte crítico →
                    </span>
                  </button>
                )}

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-[#155ead]">
                    <LocateFixed className="size-4 shrink-0" />
                    <span className="font-semibold text-[12px]">
                      {gpsDetected
                        ? 'Desde tu ubicación GPS actual'
                        : 'Ubicación de referencia · Torreón Centro'}
                    </span>
                  </div>

                  <InteractiveMap
                    center={userCoords}
                    zoom={13}
                    heightClass="h-[260px] sm:h-[300px]"
                    userLocation={userCoords}
                    showLocateButton
                    onLocateClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const next = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                          };
                          setUserCoords(next);
                          setGpsDetected(true);
                          void loadData(next, sortMode);
                        });
                      }
                    }}
                    markers={pendingOrders.map((o) => ({
                      id: o.id,
                      lat: o.lat,
                      lng: o.lng,
                      badgeText: o.folio.split('-').pop(),
                      title: `${o.folio} · ${o.categoryName}`,
                      colorHex:
                        o.slaStatus === 'critico' ? '#be313b' : '#966409',
                      selected: selectedOrder?.id === o.id,
                    }))}
                    onMarkerClick={(id) => {
                      const found = pendingOrders.find((o) => o.id === id);
                      if (found) setSelectedOrder(found);
                    }}
                  />
                </div>
              </div>

              {/* Derecha: Lista de órdenes */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                <div className="flex items-center justify-between w-full">
                  <h2 className="font-bold text-[#0e315a] text-[15px]">
                    Asignados ({pendingOrders.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setSortMode((prev) =>
                        prev === 'cercania' ? 'urgencia' : 'cercania',
                      )
                    }
                    className="flex items-center gap-1.5 text-[#155ead] hover:text-[#0f4a8a] text-[12px] font-semibold cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#dce4ed] shadow-2xs"
                  >
                    <ArrowDownWideNarrow className="size-4" />
                    <span>
                      {sortMode === 'cercania'
                        ? 'Por cercanía'
                        : 'Por urgencia SLA'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col gap-3.5">
                  {loadingData ? (
                    <div className="h-36 rounded-[12px] bg-white border border-[#dce4ed] animate-pulse" />
                  ) : pendingOrders.length > 0 ? (
                    pendingOrders.map((rep) => {
                      const pStyle = getPriorityBadge(rep.slaStatus);
                      return (
                        <div
                          key={rep.id}
                          className={`bg-white rounded-[12px] p-4 flex flex-col gap-2.5 shadow-2xs border transition-all hover:shadow-md ${
                            rep.slaStatus === 'critico'
                              ? 'border-[#e8b9bf]'
                              : 'border-[#dce4ed]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-bold text-[#155ead]">
                              {rep.folio} · {rep.orderFolio}
                            </span>
                            <span className="font-semibold text-[#0e315a]">
                              {rep.distanceKm} km · {rep.etaMinutes} min
                            </span>
                          </div>

                          <h3 className="font-semibold text-[17px] text-[#172b43] leading-snug">
                            {rep.categoryName}
                          </h3>
                          <p className="text-[13px] text-[#5e7085]">
                            {rep.addressReference}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${
                                rep.reportStatus === 'EN_PROCESO'
                                  ? 'bg-[#eaf6ef] text-[#18734a]'
                                  : 'bg-[#edf5ff] text-[#155ead]'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  rep.reportStatus === 'EN_PROCESO'
                                    ? 'bg-[#18734a]'
                                    : 'bg-[#155ead]'
                                }`}
                              />
                              <span>
                                {rep.reportStatus === 'EN_PROCESO'
                                  ? 'En proceso'
                                  : 'Asignado'}
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${pStyle.bg} ${pStyle.text}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${pStyle.dot}`}
                              />
                              <span>{pStyle.label}</span>
                            </div>
                          </div>

                          <p className={`text-[12px] ${pStyle.text}`}>
                            {rep.elapsedHours} h transcurridas · SLA {rep.slaHours}{' '}
                            h
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[12px] text-[#5e7085]">
                              {rep.upvotesCount} confirmaciones
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraStep('closed');
                                setSelectedOrder(rep);
                              }}
                              className="font-semibold text-[13px] text-[#155ead] hover:underline cursor-pointer"
                            >
                              Ver detalle →
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white border border-dashed border-[#c5d3e0] rounded-[12px] p-8 text-center text-[#5e7085] text-[13px]">
                      ¡Excelente trabajo! No tienes órdenes pendientes en tu
                      cuadrilla.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'resueltos' && (
          <div className="flex flex-col gap-4">
            <h1 className="font-bold text-[22px] sm:text-[26px] text-[#172b43]">
              Reportes resueltos ({resolvedOrders.length})
            </h1>
            {resolvedOrders.length === 0 ? (
              <div className="bg-white border border-dashed border-[#dce4ed] rounded-[16px] p-8 text-center text-sm text-[#5e7085]">
                Aún no has cerrado órdenes de trabajo en esta cuadrilla.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resolvedOrders.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white border border-[#dce4ed] rounded-[12px] p-4 flex flex-col gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[12px] text-[#155ead]">
                        {rep.folio}
                      </span>
                      <span className="bg-[#eaf6ef] text-[#18734a] px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold">
                        Resuelto
                      </span>
                    </div>
                    <h3 className="font-semibold text-[16px] text-[#172b43]">
                      {rep.categoryName}
                    </h3>
                    <p className="text-[12px] text-[#5e7085]">
                      {rep.addressReference}
                    </p>
                    <p className="text-[11px] text-[#18734a] font-medium">
                      Resuelto en {rep.elapsedHours} h · SLA {rep.slaHours} h
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraStep('closed');
                        setSelectedOrder(rep);
                      }}
                      className="text-[12px] font-semibold text-[#155ead] hover:underline text-left pt-2 border-t border-slate-100 cursor-pointer"
                    >
                      Ver evidencia de cierre →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mi-cuadrilla' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-[#edf5ff] text-[#155ead] flex items-center justify-center">
                  <Truck className="size-6" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#0e315a]">
                    {crewInfo?.name ?? 'Cuadrilla Operativa'}
                  </h2>
                  <p className="text-[12px] text-[#5e7085]">
                    {crewInfo?.departmentName ?? user?.departmentName}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[13px] pt-2 border-t border-slate-100">
                <p>
                  <strong>Responsable:</strong>{' '}
                  {crewInfo
                    ? `${crewInfo.leader.firstName} ${crewInfo.leader.lastName}`
                    : `${user?.firstName} ${user?.lastName}`}
                </p>
                <p>
                  <strong>Correo operativo:</strong>{' '}
                  {crewInfo?.leader.email ?? user?.email}
                </p>
                <p>
                  <strong>Estado de flotilla:</strong>{' '}
                  {crewInfo?.isActive ? 'Activa en turno' : 'Inactiva'}
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <Users className="size-5 text-[#155ead]" />
                <h2 className="font-bold text-[17px]">Desempeño operativo</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#eaf6ef] text-[#18734a]">
                  <p className="text-[11px] font-medium">
                    Resueltos esta semana
                  </p>
                  <p className="text-[22px] font-bold">
                    {crewInfo?.completedThisWeek ?? resolvedOrders.length}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#edf5ff] text-[#155ead]">
                  <p className="text-[11px] font-medium">Promedio de cierre</p>
                  <p className="text-[22px] font-bold">
                    {crewInfo?.avgResolutionHours
                      ? `${crewInfo.avgResolutionHours} h`
                      : '—'}
                  </p>
                </div>
              </div>
              {crewInfo && crewInfo.coverageCoordinates.length >= 3 && (
                <InteractiveMap
                  center={crewInfo.center ?? userCoords}
                  zoom={12}
                  heightClass="h-[190px]"
                  polygons={[
                    {
                      id: crewInfo.id,
                      name: crewInfo.name,
                      coordinates: crewInfo.coverageCoordinates,
                      colorHex: '#155ead',
                    },
                  ]}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#dce4ed] px-6 py-3 flex items-center justify-between z-30 shadow-[0_-4px_16px_rgba(14,49,90,0.06)]">
        <button
          type="button"
          onClick={() => setActiveTab('asignados')}
          className={`flex flex-col items-center gap-1 w-24 cursor-pointer ${
            activeTab === 'asignados'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085] font-medium'
          }`}
        >
          <ClipboardList className="size-5" />
          <span className="text-[11px]">Asignados</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resueltos')}
          className={`flex flex-col items-center gap-1 w-24 cursor-pointer ${
            activeTab === 'resueltos'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085] font-medium'
          }`}
        >
          <CheckCircle2 className="size-5" />
          <span className="text-[11px]">Resueltos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mi-cuadrilla')}
          className={`flex flex-col items-center gap-1 w-24 cursor-pointer ${
            activeTab === 'mi-cuadrilla'
              ? 'text-[#155ead] font-bold'
              : 'text-[#5e7085] font-medium'
          }`}
        >
          <Users className="size-5" />
          <span className="text-[11px]">Mi cuadrilla</span>
        </button>
      </nav>

      {/* Modal: Detalle de Orden + Flujo de Cámara en Vivo y Cierre Auditado */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] w-full max-w-[580px] max-h-[93vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-[12px] text-[#155ead]">
                  {selectedOrder.folio} · {selectedOrder.distanceKm} km (
                  {selectedOrder.etaMinutes} min)
                </span>
                <h2 className="font-bold text-[20px] text-[#0e315a]">
                  {selectedOrder.categoryName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraStep('closed');
                  setSelectedOrder(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {cameraStep === 'closed' && (
              <>
                {selectedOrder.beforeImageUrl && (
                  <div className="relative h-48 w-full rounded-[12px] overflow-hidden bg-slate-100 border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedOrder.beforeImageUrl}
                      alt="Evidencia ciudadana"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                      Foto ciudadana · Antes de la reparación
                    </span>
                  </div>
                )}

                {selectedOrder.afterImageUrl && (
                  <div className="relative h-48 w-full rounded-[12px] overflow-hidden bg-slate-100 border border-emerald-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedOrder.afterImageUrl}
                      alt="Evidencia de cierre"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-emerald-700/85 text-white text-[10px] px-2 py-0.5 rounded">
                      Evidencia de cierre · Después
                    </span>
                  </div>
                )}

                <div className="bg-[#f3f6fa] p-3.5 rounded-[12px] flex flex-col gap-1.5 text-[12px]">
                  <p className="font-semibold text-[#172b43]">
                    Dirección: {selectedOrder.addressReference}
                  </p>
                  <p className="text-[#5e7085]">{selectedOrder.description}</p>
                  {selectedOrder.fieldNotes && (
                    <p className="text-[#0e315a] font-medium pt-1">
                      Instrucciones: {selectedOrder.fieldNotes}
                    </p>
                  )}
                  <p className="text-[#be313b] font-medium pt-1">
                    {selectedOrder.elapsedHours} h transcurridas · SLA{' '}
                    {selectedOrder.slaHours} h
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.lat},${selectedOrder.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-[12px] border border-[#dce4ed] bg-white hover:bg-slate-50 text-[#155ead] font-semibold text-[13px] flex items-center justify-center gap-2"
                >
                  <Navigation className="size-4" />
                  <span>Cómo llegar (Google Maps)</span>
                </a>

                {selectedOrder.reportStatus !== 'RESUELTO' ? (
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
                    {selectedOrder.reportStatus === 'ASIGNADO' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleStartAttention(selectedOrder)}
                        className="flex-1 py-3 px-4 rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <Wrench className="size-4" />
                        <span>Iniciar atención</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void openLiveCamera()}
                      className="flex-1 py-3 px-4 rounded-[12px] bg-[#18734a] hover:bg-[#135c3b] text-white font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Camera className="size-4" />
                      <span>Finalizar con evidencia</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-[#172b43] font-semibold text-[13px] cursor-pointer"
                  >
                    Cerrar
                  </button>
                )}
              </>
            )}

            {/* Estado: Cámara en vivo (bloquea galería local) */}
            {cameraStep === 'live' && (
              <div className="flex flex-col gap-3">
                <div className="bg-[#0e315a] text-white rounded-xl p-3 text-xs flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                  <span>
                    Captura obligatoria en tiempo real (galería local bloqueada).
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      setCameraStep('closed');
                    }}
                    className="px-4 py-3 rounded-xl border border-[#dce4ed] text-xs font-semibold text-[#5e7085] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={capturePhotoFromVideo}
                    className="flex-1 py-3 rounded-xl bg-[#155ead] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="size-4" />
                    <span>Tomar fotografía</span>
                  </button>
                </div>
              </div>
            )}

            {/* Estado: Permiso de cámara denegado (Figma 27:4010) */}
            {cameraStep === 'denied' && (
              <div className="bg-[#fdeef0] border border-[#f5c6cb] rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                <ShieldAlert className="size-10 text-[#be313b]" />
                <h3 className="font-bold text-base text-[#172b43]">
                  Permiso de cámara requerido
                </h3>
                <p className="text-xs text-[#5e7085] leading-relaxed">
                  Por auditoría técnica, la plataforma bloquea la carga desde
                  galería local. Habilita el permiso de cámara en tu navegador y
                  vuelve a intentarlo.
                </p>
                <div className="flex gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => setCameraStep('closed')}
                    className="flex-1 py-2.5 rounded-xl border border-[#dce4ed] bg-white text-xs font-semibold cursor-pointer"
                  >
                    Volver al detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => void openLiveCamera()}
                    className="flex-1 py-2.5 rounded-xl bg-[#155ead] text-white text-xs font-semibold cursor-pointer"
                  >
                    Reintentar cámara
                  </button>
                </div>
              </div>
            )}

            {/* Estado: Revisión de captura (Figma 27:3852) */}
            {cameraStep === 'review' && capturedDataUrl && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase text-[#155ead]">
                  Revisión de captura
                </p>
                <div className="rounded-2xl overflow-hidden border border-[#dce4ed] aspect-[4/3] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedDataUrl}
                    alt="Captura de reparación"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void openLiveCamera()}
                    className="flex-1 py-3 rounded-xl border border-[#dce4ed] text-xs font-semibold text-[#155ead] cursor-pointer"
                  >
                    Volver a tomar foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraStep('confirm')}
                    className="flex-1 py-3 rounded-xl bg-[#155ead] text-white text-xs font-semibold cursor-pointer"
                  >
                    Aceptar fotografía
                  </button>
                </div>
              </div>
            )}

            {/* Estado: Cierre con evidencia (Figma 27:3894) */}
            {cameraStep === 'confirm' && capturedDataUrl && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase text-[#155ead]">
                  Cierre · Revisión final
                </p>
                <div className="rounded-2xl overflow-hidden border border-[#dce4ed] h-40 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedDataUrl}
                    alt="Evidencia final"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="bg-[#f3f6fa] rounded-xl p-3 text-xs space-y-1">
                  <p className="font-semibold text-[#0e315a]">
                    Distancia GPS al punto reportado:{' '}
                    {haversineMeters(
                      userCoords.lat,
                      userCoords.lng,
                      selectedOrder.lat,
                      selectedOrder.lng,
                    )}{' '}
                    m
                  </p>
                  <p className="text-[#5e7085]">
                    Al enviar, el servidor verificará el perímetro GPS en
                    PostGIS y notificará al ciudadano por correo (Resend).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#172b43]">
                    Observaciones técnicas de cierre (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={fieldNotes}
                    onChange={(e) => setFieldNotes(e.target.value)}
                    placeholder="Ej. Se sustituyó tramo de tubería y se compactó banqueta..."
                    className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-xs outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraStep('review')}
                    className="px-4 py-3 rounded-xl border border-[#dce4ed] text-xs font-semibold text-[#5e7085] cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleConfirmResolution()}
                    className="flex-1 py-3 rounded-xl bg-[#18734a] hover:bg-[#135c3b] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading
                      ? 'Validando y enviando...'
                      : 'Enviar como resuelto'}
                  </button>
                </div>
              </div>
            )}

            {/* Estado: Reporte resuelto (Figma 27:3951) */}
            {cameraStep === 'resolved' && (
              <div className="py-4 flex flex-col items-center text-center gap-3">
                <div className="size-16 rounded-full bg-[#e9f7ef] flex items-center justify-center text-[#18734a]">
                  <CheckCircle2 className="size-9" />
                </div>
                <h3 className="text-xl font-bold text-[#0e315a]">
                  ¡Reporte resuelto con éxito!
                </h3>
                <p className="text-xs text-[#5e7085] max-w-sm">
                  La evidencia fotográfica quedó auditada y se notificó al
                  ciudadano sobre la conclusión de la reparación.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraStep('closed');
                    setSelectedOrder(null);
                  }}
                  className="mt-2 w-full py-3 rounded-xl bg-[#155ead] text-white text-sm font-semibold cursor-pointer"
                >
                  Volver a mis asignados
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
