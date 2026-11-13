'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  MapPinHouse,
  Bell,
  User,
  AlertTriangle,
  LocateFixed,
  ArrowDownWideNarrow,
  ClipboardList,
  CheckCircle2,
  Users,
  X,
  Wrench,
  Camera,
  Truck,
  Clock,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import {
  CREW_INFO,
  INITIAL_TECH_REPORTS,
  TechReport,
  TechReportStatus,
} from '../data/tecnicosData';

type TechTab = 'asignados' | 'resueltos' | 'mi-cuadrilla';
type SortMode = 'cercania' | 'urgencia';

export default function DashboardTecnicosPage() {
  const [activeTab, setActiveTab] = useState<TechTab>('asignados');
  const [reports, setReports] = useState<TechReport[]>(INITIAL_TECH_REPORTS);
  const [sortMode, setSortMode] = useState<SortMode>('cercania');
  const [selectedReport, setSelectedReport] = useState<TechReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const pendingReports = useMemo(() => {
    const list = reports.filter((r) => r.status !== 'Resuelto');
    return [...list].sort((a, b) => {
      if (sortMode === 'cercania') {
        return a.distanceKm - b.distanceKm;
      }
      return b.elapsedMinutesTotal - a.elapsedMinutesTotal;
    });
  }, [reports, sortMode]);

  const resolvedReports = useMemo(
    () => reports.filter((r) => r.status === 'Resuelto'),
    [reports]
  );

  const criticalReport = useMemo(
    () => pendingReports.find((r) => r.priority === 'Crítico') ?? null,
    [pendingReports]
  );

  const handleUpdateStatus = (reportId: string, newStatus: TechReportStatus) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            status: newStatus,
            resolvedAt: newStatus === 'Resuelto' ? 'Hoy · 11:50' : r.resolvedAt,
            elapsedText:
              newStatus === 'Resuelto'
                ? `Resuelto · SLA ${r.slaHours} h`
                : r.elapsedText,
          };
        }
        return r;
      })
    );
    setSelectedReport((prev) =>
      prev && prev.id === reportId ? { ...prev, status: newStatus } : prev
    );

    if (newStatus === 'En proceso') {
      showToast('Atención en campo iniciada');
    } else if (newStatus === 'Resuelto') {
      showToast('Reporte cerrado con evidencia fotográfica');
      setSelectedReport(null);
    }
  };

  const getPriorityBadge = (priority: TechReport['priority']) => {
    switch (priority) {
      case 'Crítico':
        return {
          bg: 'bg-[#fdeef0]',
          text: 'text-[#be313b]',
          dot: 'bg-[#be313b]',
        };
      case 'En riesgo':
        return {
          bg: 'bg-[#fff5da]',
          text: 'text-[#966409]',
          dot: 'bg-[#966409]',
        };
      default:
        return {
          bg: 'bg-[#eaf6ef]',
          text: 'text-[#18734a]',
          dot: 'bg-[#18734a]',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43] pb-20 md:pb-0">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#0e315a] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera de Flotilla (Matching Figma) */}
      <header className="bg-[#0e315a] text-white w-full shrink-0 shadow-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[76px] flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-white/10 size-10 rounded-[12px] flex items-center justify-center shrink-0">
              <MapPinHouse className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[17px] leading-tight tracking-tight">
                S.I.U
              </span>
              <span className="text-[#ccdbed] text-[9px] tracking-wider uppercase">
                PLATAFORMA MUNICIPAL
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('asignados')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'asignados'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ClipboardList className="size-4" />
              <span>Asignados ({pendingReports.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('resueltos')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'resueltos'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>Resueltos ({resolvedReports.length})</span>
            </button>
            <button
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

          {/* Right: Bell & User */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast('Alerta SLA: 1 reporte crítico asignado')}
              className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
            >
              <Bell className="size-5" />
              {criticalReport && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#be313b]" />
              )}
            </button>
            <div className="size-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
              <User className="size-4 text-white" />
            </div>
          </div>
        </div>

        {/* Cuenta Activa Sub-bar */}
        <div className="border-t border-white/10 bg-black/15">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span className="font-semibold text-[14px] text-white">
                {CREW_INFO.crewName}
              </span>
              <span className="hidden sm:inline text-white/40">•</span>
              <span className="text-[#c5d9ed] text-[12px]">
                {CREW_INFO.dependency}
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] text-[#c5d9ed]">
              {CREW_INFO.unit}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-7 flex flex-col gap-5">
        {/* TAB 1: ASIGNADOS */}
        {activeTab === 'asignados' && (
          <>
            {/* Inicio de Turno */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[#5e7085] text-[12px]">
                Domingo 25 oct 2026 · 11:45
              </p>
              <h1 className="font-bold text-[24px] sm:text-[28px] text-[#172b43] leading-tight">
                Reportes asignados
              </h1>
              <p className="text-[#5e7085] text-[13px] sm:text-[14px]">
                {pendingReports.length}{' '}
                {pendingReports.length === 1
                  ? 'pendiente en tu cuadrilla'
                  : 'pendientes en tu cuadrilla'}
                . Revisa la urgencia antes de iniciar tu recorrido.
              </p>
            </div>

            {/* Responsive 2-column grid on Desktop, stacked on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (5 cols): Urgencia + Mapa */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* Urgencia destacada */}
                {criticalReport && (
                  <div
                    onClick={() => setSelectedReport(criticalReport)}
                    className="bg-[#fdeef0] border border-[#f5c6cb] rounded-[12px] p-4 flex flex-col gap-2 cursor-pointer hover:bg-[#fbdce0] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[#be313b]">
                      <AlertTriangle className="size-4.5 shrink-0" />
                      <span className="font-bold text-[13px]">
                        Atender primero · SLA vencido
                      </span>
                    </div>
                    <p className="text-[#be313b] text-[12px] leading-relaxed">
                      {criticalReport.folio} · A {criticalReport.distanceKm} km. Lleva 3 h
                      04 min fuera de SLA, aunque hay otro reporte más cerca.
                    </p>
                    <span className="font-bold text-[#be313b] text-[12px]">
                      Ver reporte crítico →
                    </span>
                  </div>
                )}

                {/* Ubicación actual y Mapa */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-[#155ead]">
                    <LocateFixed className="size-4 shrink-0" />
                    <span className="font-semibold text-[12px]">
                      Desde tu ubicación actual · Centro
                    </span>
                  </div>

                  <div className="relative bg-[#e9eef0] h-[220px] sm:h-[260px] w-full rounded-[12px] overflow-hidden border border-[#dce4ed] shadow-2xs">
                    {/* Stylized Blocks */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-[12%] left-[10%] w-[24%] h-[22%] bg-[#dce5ea] rounded-xs" />
                      <div className="absolute top-[48%] left-[10%] w-[28%] h-[26%] bg-[#dce5ea] rounded-xs" />
                      <div className="absolute top-[20%] right-[8%] w-[22%] h-[28%] bg-[#d0e4d8] border border-[#b6d4c2] rounded-sm flex items-center justify-center p-1 text-center">
                        <span className="text-[9px] font-medium text-[#497c5d] leading-tight">
                          Alameda Zaragoza
                        </span>
                      </div>
                      {/* Streets */}
                      <div className="absolute top-[42%] inset-x-0 h-3 bg-white/85" />
                      <div className="absolute inset-y-0 left-[44%] w-3 bg-white/85" />

                      <span className="absolute top-[52%] left-3 text-[8px] font-semibold text-[#5e7085]">
                        AV. JUÁREZ
                      </span>
                      <span className="absolute top-[12%] left-[48%] text-[8px] font-semibold text-[#5e7085]">
                        C. FALCÓN
                      </span>
                    </div>

                    {/* Report Markers on Map */}
                    {pendingReports.map((rep) => (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedReport(rep)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 h-8 px-2.5 rounded-[8px] border-2 border-white text-white font-bold text-[11px] shadow-md cursor-pointer transition-transform hover:scale-110 ${
                          rep.mapPosClass
                        } ${
                          rep.priority === 'Crítico'
                            ? 'bg-[#be313b]'
                            : 'bg-[#966409]'
                        }`}
                        title={`${rep.folio} · ${rep.title}`}
                      >
                        {rep.shortCode}
                      </button>
                    ))}

                    {/* Current Technician Location Pin */}
                    <div className="absolute left-[38%] top-[68%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                      <span className="relative flex size-4.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#155ead] opacity-60"></span>
                        <span className="relative inline-flex rounded-full size-4.5 bg-[#155ead] border-2 border-white shadow"></span>
                      </span>
                      <span className="bg-white px-1.5 py-0.5 rounded-[6px] shadow-xs text-[10px] font-semibold text-[#155ead] whitespace-nowrap">
                        Estás aquí
                      </span>
                    </div>

                    {/* Scale */}
                    <p className="absolute bottom-2 left-2.5 text-[#5e7085] text-[8px]">
                      Torreón, Coah. · Mapa ilustrativo · 100 m ━━━
                    </p>
                  </div>

                  <p className="text-[#5e7085] text-[11px] leading-relaxed">
                    Distancias y traslados estimados de ejemplo. El mapa no representa
                    navegación en tiempo real.
                  </p>
                </div>
              </div>

              {/* Right Column (7 cols): Orden y Lista de Reportes */}
              <div className="lg:col-span-7 flex flex-col gap-3.5">
                {/* Orden de reportes header */}
                <div className="flex items-center justify-between w-full">
                  <h2 className="font-bold text-[#0e315a] text-[15px]">
                    Asignados ({pendingReports.length})
                  </h2>
                  <button
                    onClick={() =>
                      setSortMode((prev) =>
                        prev === 'cercania' ? 'urgencia' : 'cercania'
                      )
                    }
                    className="flex items-center gap-1.5 text-[#155ead] hover:text-[#0f4a8a] text-[12px] font-semibold cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#dce4ed] shadow-2xs"
                  >
                    <ArrowDownWideNarrow className="size-4" />
                    <span>
                      {sortMode === 'cercania' ? 'Por cercanía' : 'Por urgencia SLA'}
                    </span>
                  </button>
                </div>

                {/* Assigned Cards */}
                <div className="flex flex-col gap-3.5">
                  {pendingReports.length > 0 ? (
                    pendingReports.map((rep) => {
                      const pStyle = getPriorityBadge(rep.priority);
                      const isCritical = rep.priority === 'Crítico';
                      return (
                        <div
                          key={rep.id}
                          className={`bg-white rounded-[12px] p-4 flex flex-col gap-2.5 shadow-2xs border transition-all hover:shadow-md ${
                            isCritical ? 'border-[#e8b9bf]' : 'border-[#dce4ed]'
                          }`}
                        >
                          {/* Folio & Distance */}
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-bold text-[#155ead]">
                              {rep.folio}
                            </span>
                            <span className="font-semibold text-[#0e315a]">
                              {rep.distanceKm} km · {rep.etaMinutes} min
                            </span>
                          </div>

                          {/* Title & Address */}
                          <h3 className="font-semibold text-[17px] text-[#172b43] leading-snug">
                            {rep.title}
                          </h3>
                          <p className="text-[13px] text-[#5e7085]">{rep.address}</p>

                          {/* Status & Priority Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${
                                rep.status === 'En proceso'
                                  ? 'bg-[#eaf6ef] text-[#18734a]'
                                  : 'bg-[#edf5ff] text-[#155ead]'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  rep.status === 'En proceso'
                                    ? 'bg-[#18734a]'
                                    : 'bg-[#155ead]'
                                }`}
                              />
                              <span>{rep.status}</span>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${pStyle.bg} ${pStyle.text}`}
                            >
                              <span className={`size-1.5 rounded-full ${pStyle.dot}`} />
                              <span>{rep.priority}</span>
                            </div>
                          </div>

                          {/* Elapsed SLA Text */}
                          <p className={`text-[12px] ${pStyle.text}`}>
                            {rep.elapsedText}
                          </p>

                          {/* Footer: Confirmations & Ver detalle */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[12px] text-[#5e7085]">
                              {rep.confirmations} confirmaciones
                            </span>
                            <button
                              onClick={() => setSelectedReport(rep)}
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
                      ¡Excelente trabajo! No tienes reportes pendientes en tu cuadrilla.
                    </div>
                  )}
                </div>

                <p className="text-[#5e7085] text-[11px] pt-1">
                  Actualizado a las 11:45 · Solo reportes asignados a Cuadrilla 02 ·
                  Sector Norte.
                </p>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: RESUELTOS */}
        {activeTab === 'resueltos' && (
          <div className="flex flex-col gap-4">
            <h1 className="font-bold text-[22px] sm:text-[26px] text-[#172b43]">
              Reportes resueltos ({resolvedReports.length})
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedReports.map((rep) => (
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
                    {rep.title}
                  </h3>
                  <p className="text-[12px] text-[#5e7085]">{rep.address}</p>
                  <p className="text-[11px] text-[#18734a] font-medium">
                    {rep.elapsedText}
                  </p>
                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="text-[12px] font-semibold text-[#155ead] hover:underline text-left pt-2 border-t border-slate-100 cursor-pointer"
                  >
                    Ver evidencia de cierre →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MI CUADRILLA */}
        {activeTab === 'mi-cuadrilla' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-[#edf5ff] text-[#155ead] flex items-center justify-center">
                  <Truck className="size-6" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#0e315a]">
                    {CREW_INFO.crewName}
                  </h2>
                  <p className="text-[12px] text-[#5e7085]">{CREW_INFO.dependency}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[13px] pt-2 border-t border-slate-100">
                <p>
                  <strong>Unidad asignada:</strong> {CREW_INFO.unit}
                </p>
                <p>
                  <strong>Responsable:</strong> {CREW_INFO.leader}
                </p>
                <p>
                  <strong>Horario:</strong> {CREW_INFO.shift}
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <Users className="size-5 text-[#155ead]" />
                <h2 className="font-bold text-[17px]">Integrantes y Desempeño</h2>
              </div>
              <ul className="flex flex-col gap-2 text-[13px]">
                {CREW_INFO.members.map((m, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-[#f3f6fa] text-[#172b43]">
                    {m}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#eaf6ef] text-[#18734a]">
                  <p className="text-[11px] font-medium">Atendidos esta semana</p>
                  <p className="text-[20px] font-bold">{CREW_INFO.completedThisWeek}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#edf5ff] text-[#155ead]">
                  <p className="text-[11px] font-medium">Promedio de cierre</p>
                  <p className="text-[20px] font-bold">{CREW_INFO.avgResolutionHours}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation (Matching Figma) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#dce4ed] px-6 py-3 flex items-center justify-between z-30 shadow-[0_-4px_16px_rgba(14,49,90,0.06)]">
        <button
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

      {/* Work Order Detail Modal for Technician */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] w-full max-w-[540px] max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-[12px] text-[#155ead]">
                  {selectedReport.folio} · {selectedReport.distanceKm} km (
                  {selectedReport.etaMinutes} min)
                </span>
                <h2 className="font-bold text-[20px] text-[#0e315a]">
                  {selectedReport.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative h-44 w-full rounded-[12px] overflow-hidden bg-slate-100 border border-slate-200">
              <Image
                src={selectedReport.evidenceImage}
                alt="Evidencia del incidente"
                fill
                className="object-cover"
              />
              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                Evidencia ciudadana
              </span>
            </div>

            <div className="bg-[#f3f6fa] p-3.5 rounded-[12px] flex flex-col gap-1.5 text-[12px]">
              <p className="font-semibold text-[#172b43]">
                Dirección: {selectedReport.address}
              </p>
              <p className="text-[#5e7085]">{selectedReport.description}</p>
              <p className="text-[#be313b] font-medium pt-1">
                {selectedReport.elapsedText}
              </p>
            </div>

            {selectedReport.status !== 'Resuelto' ? (
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
                {selectedReport.status === 'Asignado' && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedReport.id, 'En proceso')
                    }
                    className="flex-1 py-3 px-4 rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wrench className="size-4" />
                    <span>Iniciar atención en campo</span>
                  </button>
                )}
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'Resuelto')}
                  className="flex-1 py-3 px-4 rounded-[12px] bg-[#18734a] hover:bg-[#135c3b] text-white font-semibold text-[13px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="size-4" />
                  <span>Finalizar y adjuntar evidencia</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-[#172b43] font-semibold text-[13px] cursor-pointer"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
