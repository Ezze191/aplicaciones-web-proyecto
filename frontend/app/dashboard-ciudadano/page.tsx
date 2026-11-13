'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPinHouse,
  Bell,
  User,
  MapPin,
  Droplets,
  Zap,
  Construction,
  LocateFixed,
  ThumbsUp,
  Plus,
  Map as MapIcon,
  ClipboardList,
  HelpCircle,
  CheckCircle2,
  X,
  PhoneCall,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  CitizenDependency,
  CitizenReport,
  INITIAL_CITIZEN_REPORTS,
} from '../data/ciudadanoData';

type CitizenTab = 'mapa' | 'mis-reportes' | 'ayuda';

export default function DashboardCiudadanoPage() {
  const [activeTab, setActiveTab] = useState<CitizenTab>('mapa');
  const [reports, setReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);
  const [selectedFilter, setSelectedFilter] = useState<CitizenDependency | 'Todas'>('Todas');
  const [selectedReportId, setSelectedReportId] = useState<string>(INITIAL_CITIZEN_REPORTS[0].id);

  // Modals & Toast
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [traceabilityReport, setTraceabilityReport] = useState<CitizenReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Report Form State
  const [newDep, setNewDep] = useState<CitizenDependency>('SIMAS');
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const filteredReports = useMemo(() => {
    if (selectedFilter === 'Todas') return reports;
    return reports.filter((r) => r.dependency === selectedFilter);
  }, [reports, selectedFilter]);

  const selectedReport = useMemo(() => {
    return (
      filteredReports.find((r) => r.id === selectedReportId) ??
      filteredReports[0] ??
      reports[0]
    );
  }, [filteredReports, selectedReportId, reports]);

  const resolvedCount = useMemo(
    () => reports.filter((r) => r.status === 'Resuelto').length + 5,
    [reports]
  );

  const handleConfirmVote = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          const already = r.hasConfirmed;
          return {
            ...r,
            confirmations: already ? r.confirmations - 1 : r.confirmations + 1,
            hasConfirmed: !already,
          };
        }
        return r;
      })
    );
    showToast('Confirmación ciudadana registrada (+1)');
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAddress.trim()) return;

    const prefix =
      newDep === 'SIMAS' ? 'SIM' : newDep === 'La Ola' ? 'OLA' : 'OBP';
    const randomNum = Math.floor(850 + Math.random() * 140);
    const created: CitizenReport = {
      id: `cit-${Date.now()}`,
      folio: `${prefix}-2026-0${randomNum}`,
      dependency: newDep,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Reporte ciudadano enviado desde el mapa.',
      address: `${newAddress.trim()} · Centro`,
      status: 'Reportado',
      confirmations: 1,
      distanceMeters: 15,
      reportedAt: 'Justo ahora',
      hasConfirmed: true,
      mapPosClass: 'top-[48%] left-[44%]',
      timeline: [
        { label: 'Reporte recibido en plataforma', time: 'Ahora', completed: true },
        { label: 'En espera de asignación', time: 'Pendiente', completed: false },
      ],
    };

    setReports((prev) => [created, ...prev]);
    setSelectedFilter('Todas');
    setSelectedReportId(created.id);
    setNewTitle('');
    setNewAddress('');
    setNewDesc('');
    setIsNewReportOpen(false);
    setActiveTab('mapa');
    showToast(`Reporte ${created.folio} enviado con éxito`);
  };

  const getPinStyle = (dep: CitizenDependency) => {
    switch (dep) {
      case 'SIMAS':
        return {
          bg: 'bg-[#0284c7]',
          text: 'text-[#0284c7]',
          icon: <Droplets className="size-4 text-white" />,
        };
      case 'La Ola':
        return {
          bg: 'bg-[#d97706]',
          text: 'text-[#d97706]',
          icon: <Zap className="size-4 text-white" />,
        };
      case 'Obras Públicas':
        return {
          bg: 'bg-[#ea580c]',
          text: 'text-[#ea580c]',
          icon: <Construction className="size-4 text-white" />,
        };
    }
  };

  const getStatusBadge = (status: CitizenReport['status']) => {
    switch (status) {
      case 'En proceso':
        return 'bg-[#edf5ff] text-[#155ead] dot-[#155ead]';
      case 'Asignado':
        return 'bg-[#fff5da] text-[#966409] dot-[#966409]';
      case 'Resuelto':
        return 'bg-[#eaf6ef] text-[#18734a] dot-[#18734a]';
      default:
        return 'bg-slate-100 text-slate-700 dot-slate-500';
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

      {/* Cabecera Municipal (Matching Figma) */}
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
              <span className="text-[#ccdbed] text-[9px] sm:text-[10px] tracking-wider uppercase">
                PLATAFORMA MUNICIPAL
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('mapa')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'mapa'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <MapIcon className="size-4" />
              <span>Mapa</span>
            </button>
            <button
              onClick={() => setActiveTab('mis-reportes')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'mis-reportes'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ClipboardList className="size-4" />
              <span>Mis reportes ({reports.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ayuda')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                activeTab === 'ayuda'
                  ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <HelpCircle className="size-4" />
              <span>Ayuda</span>
            </button>
          </nav>

          {/* Right: Bell & Account */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast('Sin notificaciones nuevas en tu colonia')}
              className="p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
              title="Avisos ciudadanos"
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#38bdf8]" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="hidden sm:block text-right">
                <p className="text-[12px] font-medium leading-tight">Ciudadano</p>
                <p className="text-[10px] text-[#ccdbed] leading-tight">Zona Centro</p>
              </div>
              <div className="size-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                <User className="size-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-7 flex flex-col gap-5">
        {/* Contexto Ciudadano (Hero) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[#155ead]">
              <MapPin className="size-4 shrink-0" />
              <span className="font-semibold text-[12px] tracking-wide uppercase">
                TORREÓN · ZONA CENTRO
              </span>
            </div>
            <h1 className="font-bold text-[24px] sm:text-[28px] text-[#172b43] leading-tight">
              Tu ciudad, en tus manos.
            </h1>
            <p className="text-[#5e7085] text-[13px] sm:text-[14px]">
              Reporta, suma tu voz y sigue las mejoras de tu colonia.
            </p>
          </div>

          <button
            onClick={() => setIsNewReportOpen(true)}
            className="hidden md:flex items-center justify-center gap-2 bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[14px] h-12 px-5 rounded-[12px] shadow-sm transition-all cursor-pointer active:scale-98 shrink-0"
          >
            <Plus className="size-5" />
            <span>Reportar Falla</span>
          </button>
        </div>

        {/* TAB 1: MAPA DE REPORTES */}
        {activeTab === 'mapa' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Map Section (8 cols on desktop) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="relative bg-[#e9eef0] h-[470px] sm:h-[520px] w-full rounded-[16px] overflow-hidden border border-[#dce4ed] shadow-xs">
                {/* Stylized Torreón Urban Blocks */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* City blocks */}
                  <div className="absolute top-[10%] left-[8%] w-[18%] h-[16%] bg-[#dce5ea] rounded-sm" />
                  <div className="absolute top-[10%] left-[32%] w-[20%] h-[16%] bg-[#dce5ea] rounded-sm" />
                  <div className="absolute top-[34%] left-[8%] w-[22%] h-[22%] bg-[#dce5ea] rounded-sm" />
                  <div className="absolute top-[34%] left-[36%] w-[24%] h-[22%] bg-[#dce5ea] rounded-sm" />
                  <div className="absolute top-[64%] left-[12%] w-[28%] h-[20%] bg-[#dce5ea] rounded-sm" />
                  <div className="absolute top-[64%] left-[48%] w-[30%] h-[20%] bg-[#dce5ea] rounded-sm" />

                  {/* Alameda Zaragoza */}
                  <div className="absolute top-[10%] right-[12%] w-[22%] h-[18%] bg-[#d0e4d8] border border-[#b6d4c2] rounded-md flex items-center justify-center p-2 text-center">
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#497c5d] leading-tight">
                      Alameda Zaragoza
                    </span>
                  </div>

                  {/* Main Streets */}
                  <div className="absolute top-[29%] inset-x-0 h-3.5 bg-white/85" />
                  <div className="absolute top-[59%] inset-x-0 h-4 bg-white/90" />
                  <div className="absolute inset-y-0 left-[30%] w-3.5 bg-white/85" />
                  <div className="absolute inset-y-0 left-[62%] w-3 bg-white/80" />

                  {/* Street Labels */}
                  <span className="absolute top-[25%] left-4 text-[9px] font-semibold text-[#697c89] tracking-wider">
                    AV. JUÁREZ
                  </span>
                  <span className="absolute top-[36%] left-[42%] text-[9px] font-semibold text-[#697c89] tracking-wider">
                    AV. MORELOS
                  </span>
                  <span className="absolute top-[55%] left-5 text-[9px] font-semibold text-[#697c89] tracking-wider">
                    BLVD. INDEPENDENCIA
                  </span>
                  <span className="absolute top-[14%] left-[25%] -rotate-90 text-[8px] font-semibold text-[#697c89] tracking-wider">
                    CALZ. COLÓN
                  </span>
                  <span className="absolute bottom-10 left-8 text-[13px] font-bold text-[#8c9da9] tracking-widest">
                    CENTRO
                  </span>
                </div>

                {/* Filter Pills overlaid at top */}
                <div className="relative z-10 flex items-center gap-2 p-3.5 overflow-x-auto">
                  <button
                    onClick={() => setSelectedFilter('Todas')}
                    className={`px-3 py-2 rounded-full text-[11px] font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'Todas'
                        ? 'bg-[#0e315a] text-white'
                        : 'bg-white text-[#172b43] hover:bg-slate-50'
                    }`}
                  >
                    Todas ({reports.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('SIMAS')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'SIMAS'
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-white text-[#172b43] hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        selectedFilter === 'SIMAS' ? 'bg-white' : 'bg-[#0284c7]'
                      }`}
                    />
                    <span>SIMAS</span>
                  </button>
                  <button
                    onClick={() => setSelectedFilter('La Ola')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'La Ola'
                        ? 'bg-[#d97706] text-white'
                        : 'bg-white text-[#172b43] hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        selectedFilter === 'La Ola' ? 'bg-white' : 'bg-[#d97706]'
                      }`}
                    />
                    <span>La Ola</span>
                  </button>
                  <button
                    onClick={() => setSelectedFilter('Obras Públicas')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'Obras Públicas'
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-white text-[#172b43] hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        selectedFilter === 'Obras Públicas'
                          ? 'bg-white'
                          : 'bg-[#ea580c]'
                      }`}
                    />
                    <span>Obras Públicas</span>
                  </button>
                </div>

                {/* Geolocated Report Pins */}
                {filteredReports.map((rep) => {
                  const pin = getPinStyle(rep.dependency);
                  const isSelected = selectedReport?.id === rep.id;
                  return (
                    <button
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 size-9 sm:size-10 rounded-full border-[3px] border-white flex items-center justify-center shadow-md transition-transform cursor-pointer ${
                        rep.mapPosClass
                      } ${
                        pin.bg
                      } ${isSelected ? 'scale-125 ring-4 ring-[#155ead]/35 z-20' : 'hover:scale-110'}`}
                      title={`${rep.folio} · ${rep.title}`}
                    >
                      {pin.icon}
                    </button>
                  );
                })}

                {/* Locate Button */}
                <button
                  onClick={() => showToast('Mapa centrado en Zona Centro · Torreón')}
                  className="absolute bottom-8 right-3 z-10 bg-white size-9.5 rounded-[8px] shadow-md flex items-center justify-center text-[#172b43] hover:text-[#155ead] cursor-pointer"
                  title="Mi ubicación"
                >
                  <LocateFixed className="size-5" />
                </button>

                {/* Map Scale Footer */}
                <p className="absolute bottom-2 left-3 z-10 text-[#5e7085] text-[9px] font-medium">
                  Torreón, Coah. · Mapa ilustrativo · 100 m ━━━
                </p>

                {/* Mobile Floating Selected Card Overlay (inside map bottom on mobile) */}
                {selectedReport && (
                  <div className="lg:hidden absolute bottom-8 left-3 right-14 z-20 bg-white rounded-[16px] p-3.5 shadow-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          getPinStyle(selectedReport.dependency).text
                        }`}
                      >
                        {selectedReport.dependency} · {selectedReport.folio}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${getStatusBadge(
                          selectedReport.status
                        )}`}
                      >
                        {selectedReport.status}
                      </span>
                    </div>
                    <p className="font-bold text-[15px] text-[#172b43] leading-snug">
                      {selectedReport.title}
                    </p>
                    <p className="text-[11px] text-[#5e7085] truncate">
                      {selectedReport.address}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="font-bold text-[13px] text-[#172b43]">
                          {selectedReport.confirmations} confirmaciones
                        </p>
                        <p className="text-[10px] text-[#5e7085]">
                          A {selectedReport.distanceMeters} m de ti
                        </p>
                      </div>
                      <button
                        onClick={() => handleConfirmVote(selectedReport.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedReport.hasConfirmed
                            ? 'bg-[#155ead] text-white'
                            : 'bg-[#edf5ff] text-[#155ead]'
                        }`}
                      >
                        <ThumbsUp className="size-3.5" />
                        <span>Sigue ahí (+1)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen Local */}
              <div className="flex items-center justify-between px-1 text-[12px]">
                <span className="text-[#5e7085]">
                  {filteredReports.length} reportes cerca de ti
                </span>
                <span className="font-semibold text-[#18734a]">
                  {resolvedCount} resueltos esta semana
                </span>
              </div>

              {/* Mobile Floating Reportar Falla CTA */}
              <button
                onClick={() => setIsNewReportOpen(true)}
                className="md:hidden w-full bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[14px] h-12 rounded-[12px] shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="size-5" />
                <span>Reportar Falla</span>
              </button>
            </div>

            {/* Right Column on Desktop: Selected Report Card + Nearby List */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Desktop Selected Report Card */}
              {selectedReport && (
                <div className="hidden lg:flex bg-white rounded-[20px] p-5 shadow-[0px_8px_24px_rgba(14,49,90,0.08)] border border-[#dce4ed] flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[12px] font-bold ${
                        getPinStyle(selectedReport.dependency).text
                      }`}
                    >
                      {selectedReport.dependency} · {selectedReport.folio}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${getStatusBadge(
                        selectedReport.status
                      )}`}
                    >
                      {selectedReport.status}
                    </span>
                  </div>

                  <h2 className="font-bold text-[18px] text-[#172b43] leading-snug">
                    {selectedReport.title}
                  </h2>

                  <p className="text-[12px] text-[#5e7085] leading-relaxed">
                    {selectedReport.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-[#5e7085] text-[12px]">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{selectedReport.address}</span>
                  </div>

                  <div className="border-t border-[#dce4ed] pt-3 mt-1 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[14px] text-[#172b43]">
                        {selectedReport.confirmations} confirmaciones
                      </p>
                      <p className="text-[11px] text-[#5e7085]">
                        A {selectedReport.distanceMeters} m de ti
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmVote(selectedReport.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[12px] font-semibold transition-all cursor-pointer ${
                        selectedReport.hasConfirmed
                          ? 'bg-[#155ead] text-white shadow-xs'
                          : 'bg-[#edf5ff] text-[#155ead] hover:bg-[#dcebff]'
                      }`}
                    >
                      <ThumbsUp className="size-4" />
                      <span>
                        {selectedReport.hasConfirmed ? 'Confirmado' : 'Sigue ahí (+1)'}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => setTraceabilityReport(selectedReport)}
                    className="text-[12px] font-semibold text-[#155ead] hover:underline text-left pt-1 cursor-pointer"
                  >
                    Ver trazabilidad del reporte →
                  </button>
                </div>
              )}

              {/* Nearby Reports List */}
              <div className="bg-white rounded-[16px] p-4 border border-[#dce4ed] flex flex-col gap-3">
                <h3 className="font-bold text-[14px] text-[#0e315a]">
                  Incidencias cercanas ({filteredReports.length})
                </h3>
                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {filteredReports.map((rep) => {
                    const isActive = selectedReport?.id === rep.id;
                    return (
                      <button
                        key={rep.id}
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`w-full text-left p-3 rounded-[12px] border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-[#edf5ff] border-[#155ead]'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#155ead]">
                            {rep.folio} · {rep.dependency}
                          </p>
                          <p className="text-[13px] font-semibold text-[#172b43] truncate">
                            {rep.title}
                          </p>
                          <p className="text-[11px] text-[#5e7085] truncate">
                            {rep.address}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MIS REPORTES */}
        {activeTab === 'mis-reportes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white border border-[#dce4ed] rounded-[16px] p-5 flex flex-col gap-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#155ead]">
                    {rep.folio}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold ${getStatusBadge(
                      rep.status
                    )}`}
                  >
                    {rep.status}
                  </span>
                </div>
                <h3 className="font-bold text-[16px] text-[#172b43]">{rep.title}</h3>
                <p className="text-[12px] text-[#5e7085]">{rep.address}</p>
                <div className="flex items-center justify-between text-[11px] text-[#5e7085] pt-2 border-t border-slate-100">
                  <span>{rep.reportedAt}</span>
                  <button
                    onClick={() => setTraceabilityReport(rep)}
                    className="font-semibold text-[#155ead] hover:underline cursor-pointer"
                  >
                    Ver trazabilidad →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: AYUDA */}
        {activeTab === 'ayuda' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <PhoneCall className="size-5 text-[#155ead]" />
                <h3 className="font-bold text-[17px]">Líneas de Atención Ciudadana</h3>
              </div>
              <p className="text-[13px] text-[#5e7085]">
                Atención directa para emergencias urbanas en el municipio de Torreón:
              </p>
              <ul className="flex flex-col gap-2 text-[13px]">
                <li className="p-3 rounded-xl bg-[#f3f6fa] flex justify-between">
                  <span className="font-semibold">SIMAS (Agua y Drenaje)</span>
                  <span className="font-bold text-[#155ead]">871 690 9595</span>
                </li>
                <li className="p-3 rounded-xl bg-[#f3f6fa] flex justify-between">
                  <span className="font-semibold">Atención Ciudadana 073</span>
                  <span className="font-bold text-[#155ead]">073 / 871 500 7000</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-[#dce4ed] rounded-[16px] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#0e315a]">
                <Clock className="size-5 text-[#155ead]" />
                <h3 className="font-bold text-[17px]">Tiempos de Respuesta (SLA)</h3>
              </div>
              <p className="text-[13px] text-[#5e7085]">
                Cada dependencia cuenta con compromisos máximos de atención según la urgencia:
              </p>
              <ul className="flex flex-col gap-2 text-[12px] text-[#172b43]">
                <li className="p-2.5 rounded-lg border border-slate-100">
                  <strong>La Ola (Limpieza):</strong> 12 horas de referencia
                </li>
                <li className="p-2.5 rounded-lg border border-slate-100">
                  <strong>SIMAS (Fugas y Drenaje):</strong> 24 horas de referencia
                </li>
                <li className="p-2.5 rounded-lg border border-slate-100">
                  <strong>Obras Públicas (Bacheo y Vialidad):</strong> 36 horas de referencia
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation (Matching Figma) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#dce4ed] px-6 py-3 flex items-center justify-between z-30 shadow-[0_-4px_16px_rgba(14,49,90,0.06)]">
        <button
          onClick={() => setActiveTab('mapa')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'mapa' ? 'text-[#155ead] font-bold' : 'text-[#5e7085]'
          }`}
        >
          <MapIcon className="size-5" />
          <span className="text-[11px]">Mapa</span>
        </button>
        <button
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
          onClick={() => setActiveTab('ayuda')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === 'ayuda' ? 'text-[#155ead] font-bold' : 'text-[#5e7085]'
          }`}
        >
          <HelpCircle className="size-5" />
          <span className="text-[11px]">Ayuda</span>
        </button>
      </nav>

      {/* Modal: Reportar Falla */}
      {isNewReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] w-full max-w-[480px] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-[18px] text-[#0e315a]">
                Reportar nueva falla
              </h2>
              <button
                onClick={() => setIsNewReportOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReport} className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#172b43]">
                  Dependencia
                </label>
                <select
                  value={newDep}
                  onChange={(e) => setNewDep(e.target.value as CitizenDependency)}
                  className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                >
                  <option value="SIMAS">SIMAS (Agua y Drenaje)</option>
                  <option value="La Ola">La Ola (Limpieza Urbana)</option>
                  <option value="Obras Públicas">Obras Públicas (Bacheo y Vialidad)</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#172b43]">
                  Título de la incidencia
                </label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Fuga de agua en banqueta"
                  className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#172b43]">
                  Dirección / Cruce
                </label>
                <input
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Ej. Av. Morelos 415"
                  className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#172b43]">
                  Descripción breve
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe brevemente el problema..."
                  className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewReportOpen(false)}
                  className="px-4 py-2 rounded-[10px] border border-[#dce4ed] text-[13px] font-semibold text-[#5e7085] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[10px] bg-[#155ead] text-white text-[13px] font-semibold hover:bg-[#0f4a8a] cursor-pointer"
                >
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Trazabilidad del reporte */}
      {traceabilityReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] w-full max-w-[460px] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-[#155ead]">
                  {traceabilityReport.folio} · {traceabilityReport.dependency}
                </span>
                <h2 className="font-bold text-[18px] text-[#0e315a]">
                  {traceabilityReport.title}
                </h2>
              </div>
              <button
                onClick={() => setTraceabilityReport(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {traceabilityReport.timeline.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={`mt-1 size-3 rounded-full shrink-0 ${
                      step.completed ? 'bg-[#18734a]' : 'bg-slate-300'
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-[13px] font-semibold ${
                        step.completed ? 'text-[#172b43]' : 'text-[#5e7085]'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-[#5e7085]">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTraceabilityReport(null)}
              className="w-full py-2.5 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-[#172b43] text-[13px] font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
