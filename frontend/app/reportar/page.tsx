'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Camera,
  Upload,
  CircleCheck,
  LocateFixed,
  MapPin,
  Send,
  ThumbsUp,
  Check,
  Clock,
  GitBranch,
  AlertTriangle,
} from 'lucide-react';
import { AppLoader } from '../components/AppLoader';
import { CiudadanoHeader } from '../components/CiudadanoHeader';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { AlertType, SweetAlert } from '../components/SweetAlert';
import {
  apiFetch,
  ApiError,
  ApiReport,
  CategoryItem,
  uploadEvidenceFile,
} from '../lib/api';
import { useRequireAuth } from '../lib/auth';
import { compressImageToWebP } from '../lib/imageUtils';
import { enqueueOfflineReport } from '../lib/offlineQueue';
import {
  DURATION_OPTIONS,
  evaluateReportTriage,
  IMPACT_LEVEL_OPTIONS,
  LOCATION_CONTEXT_BY_AREA,
  PROBLEM_AREAS,
  ProblemAreaKey,
  QUESTION_2_BY_AREA,
  REFERENCE_SELECT_OPTIONS,
  RiskLevel,
  TRIAGE_ISSUES_BY_AREA,
} from '../lib/reportTriage';

const InteractiveMap = dynamic(
  () => import('../components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface DuplicateMatch {
  reportId: string;
  folio: string;
  currentStatus: string;
  upvotesCount: number;
  addressReference: string;
  description: string;
  categoryName: string;
  departmentName: string;
  departmentCode: string;
  beforeImageUrl: string | null;
  distanceMeters: number;
}

export default function ReportarFallaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Cuestionario guiado paso a paso (1 pregunta a la vez — cero texto libre)
  const [quizStep, setQuizStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [areaKey, setAreaKey] = useState<ProblemAreaKey>('AGUA_DRENAJE');
  const [issueId, setIssueId] = useState<string>(
    TRIAGE_ISSUES_BY_AREA.AGUA_DRENAJE[0].id,
  );
  const [locationContext, setLocationContext] = useState<string>(
    LOCATION_CONTEXT_BY_AREA.AGUA_DRENAJE.options[0],
  );
  const [impactLevel, setImpactLevel] = useState<RiskLevel>('MEDIO');
  const [duration, setDuration] = useState<string>(DURATION_OPTIONS[0]);

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoNombre, setFotoNombre] = useState<string | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 25.5428,
    lng: -103.4068,
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState<string>(
    REFERENCE_SELECT_OPTIONS[0],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeduplicacion, setShowDeduplicacion] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(
    null,
  );
  const [createdReport, setCreatedReport] = useState<ApiReport | null>(null);

  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({ open: false, type: 'info', message: '' });

  const resolveAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'es' } },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        address?: {
          road?: string;
          house_number?: string;
          neighbourhood?: string;
          suburb?: string;
        };
        display_name?: string;
      };
      const road = data.address?.road;
      const num = data.address?.house_number;
      const col = data.address?.neighbourhood || data.address?.suburb;
      const formatted = road
        ? `${road}${num ? ` #${num}` : ''}${col ? `, ${col}` : ''}, Torreón, Coah.`
        : data.display_name?.split(',').slice(0, 3).join(', ');
      if (formatted) {
        setDireccion(formatted);
      }
    } catch {
      // ignore reverse geocode errors
    }
  };

  useEffect(() => {
    apiFetch<CategoryItem[]>('/catalogs/categories', { skipAuthRedirect: true })
      .then((list) => {
        setCategories(list);
      })
      .catch(() => undefined);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCoords(next);
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          void resolveAddressFromCoords(next.lat, next.lng);
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, []);

  const triage = useMemo(
    () =>
      evaluateReportTriage({
        areaKey,
        issueId,
        locationContext,
        impactLevel,
        duration,
        categories,
      }),
    [areaKey, issueId, locationContext, impactLevel, duration, categories],
  );

  const selectedCategory = triage.matchedCategory;
  const selectedCategoryId = selectedCategory?.id ?? '';
  const riskLevel = triage.computedRiskLevel;
  const descripcion = triage.generatedDescription;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      const compressed = await compressImageToWebP(rawFile);
      setFotoFile(compressed.file);
      setFotoPreview(compressed.previewUrl);
      setFotoNombre(`${compressed.file.name} · ${compressed.sizeLabel}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al procesar imagen.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Fotografía inválida',
        message: msg,
      });
    }
  };

  const handleCenterGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setAlertState({
        open: true,
        type: 'warning',
        title: 'GPS no disponible',
        message: 'Mueve el pin manualmente sobre el mapa para indicar el punto exacto.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        void resolveAddressFromCoords(
          pos.coords.latitude,
          pos.coords.longitude,
        );
      },
      () => {
        setAlertState({
          open: true,
          type: 'warning',
          title: 'Permiso GPS requerido',
          message: 'Activa tu ubicación o arrastra el pin directamente en el mapa.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const submitFinalReport = async () => {
    if (!fotoFile || !selectedCategoryId) return;

    const effectiveAddress =
      direccion.trim() ||
      `Ubicación GPS (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}), Torreón, Coah.`;
    const fullAddress =
      referencia && referencia !== REFERENCE_SELECT_OPTIONS[0]
        ? `${effectiveAddress} (${referencia})`
        : effectiveAddress;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueOfflineReport({
        categoryId: selectedCategoryId,
        departmentId: selectedCategory?.departmentId,
        riskLevel,
        lat: coords.lat,
        lng: coords.lng,
        addressReference: fullAddress,
        description: descripcion.trim(),
        imageBlob: fotoFile,
        imageName: fotoFile.name,
      });
      window.dispatchEvent(new Event('siu-offline-updated'));
      setAlertState({
        open: true,
        type: 'info',
        title: 'Guardado sin conexión (PWA)',
        message:
          'No hay internet en este momento. Tu reporte quedó guardado en IndexedDB y se enviará automáticamente al recuperar conexión.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaded = await uploadEvidenceFile(fotoFile);
      const report = await apiFetch<ApiReport>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          departmentId: selectedCategory?.departmentId,
          riskLevel,
          lat: coords.lat,
          lng: coords.lng,
          addressReference: fullAddress,
          description: descripcion.trim(),
          imageUrl: uploaded.url,
        }),
      });
      setCreatedReport(report);
      setPaso(3);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el reporte. Intenta nuevamente.';
      setAlertState({
        open: true,
        type: 'error',
        title: 'Error al registrar reporte',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccion.trim()) {
      setDireccion(
        `Ubicación GPS (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}), Torreón, Coah.`,
      );
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await submitFinalReport();
      return;
    }

    setIsSubmitting(true);
    try {
      const dedup = await apiFetch<{
        hasDuplicates: boolean;
        matches: DuplicateMatch[];
      }>('/reports/check-duplicates', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          categoryId: selectedCategoryId,
          radiusMeters: 50,
        }),
      });

      if (dedup.hasDuplicates && dedup.matches.length > 0) {
        setDuplicateMatch(dedup.matches[0]);
        setShowDeduplicacion(true);
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Si falla check-duplicates, continuar con creación normal
    }

    setIsSubmitting(false);
    await submitFinalReport();
  };

  const handleSumarVoto = async () => {
    if (!duplicateMatch) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ upvotesCount: number; message: string }>(
        `/reports/${duplicateMatch.reportId}/upvote`,
        {
          method: 'POST',
          body: JSON.stringify({ deviceId: user?.id }),
        },
      );
      setShowDeduplicacion(false);
      setAlertState({
        open: true,
        type: 'success',
        title: '¡Confirmación registrada!',
        message: `Se sumó tu voto al folio ${duplicateMatch.folio} (${res.upvotesCount} confirmaciones).`,
      });
      setTimeout(() => {
        router.push(
          `/mis-reportes/${encodeURIComponent(duplicateMatch.folio)}`,
        );
      }, 1200);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo registrar tu voto.';
      setShowDeduplicacion(false);
      setAlertState({
        open: true,
        type: 'info',
        title: 'Confirmación vecinal',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportarDiferente = async () => {
    setShowDeduplicacion(false);
    await submitFinalReport();
  };

  if (authLoading) {
    return (
      <AppLoader
        title="Cargando asistente de reporte"
        subtitle="Preparando formulario y ubicación geoespacial"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader userOverride={user} />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col gap-6">
        {/* Barra de progreso */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (paso === 1) router.push('/dashboard-ciudadano');
                else if (paso === 2) setPaso(1);
                else router.push('/dashboard-ciudadano');
              }}
              className="inline-flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-lg text-[#172b43] hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-semibold">
                Regresar
              </span>
            </button>

            <span className="text-[12px] font-bold tracking-wider uppercase text-[#155ead]">
              PASO {paso} DE 3
            </span>

            <Link
              href="/dashboard-ciudadano"
              className="inline-flex items-center gap-1.5 p-1.5 -mr-1.5 rounded-lg text-[#5e7085] hover:bg-slate-200/70 transition-colors"
            >
              <span className="hidden sm:inline text-sm font-medium">
                Cancelar
              </span>
              <X className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((stepIndex) => (
              <div
                key={stepIndex}
                className={`h-[4px] rounded-full transition-colors ${
                  stepIndex <= paso ? 'bg-[#155ead]' : 'bg-[#dce4ed]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* PASO 1: Foto, categoría, riesgo y descripción */}
        {paso === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-6 flex flex-col gap-5">
              <div className="space-y-2">
                <h1 className="text-[26px] sm:text-[32px] font-bold leading-tight text-[#172b43]">
                  ¿Qué está pasando?
                </h1>
                <p className="text-[14px] text-[#5e7085] leading-relaxed">
                  Captura una fotografía de la falla urbana y selecciona el tipo
                  de problema para canalizarlo automáticamente.
                </p>
              </div>

              <section className="flex flex-col gap-3 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#172b43]">
                    Fotografía del problema <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[12px] text-[#5e7085]">
                    Compresión automática WebP
                  </span>
                </div>

                {fotoPreview ? (
                  <div className="relative rounded-[16px] overflow-hidden border border-[#dce4ed] bg-slate-200 aspect-[16/10] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoPreview}
                      alt="Evidencia del problema"
                      className="w-full h-full object-cover"
                    />
                    {fotoNombre && (
                      <div className="absolute left-3 bottom-3 bg-white/95 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                        <CircleCheck className="w-3.5 h-3.5 text-[#18734a]" />
                        <span className="text-[12px] font-semibold text-[#172b43]">
                          {fotoNombre}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[16px] border-2 border-dashed border-[#c5d3e0] bg-white aspect-[16/10] w-full flex flex-col items-center justify-center p-6 text-center gap-2">
                    <Camera className="w-8 h-8 text-[#155ead]" />
                    <p className="text-sm font-semibold text-[#172b43]">
                      Aún no has capturado la fotografía
                    </p>
                    <p className="text-xs text-[#5e7085]">
                      Es obligatoria para que la cuadrilla identifique la falla.
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white hover:bg-slate-50 border border-dashed border-[#9bbce0] rounded-[14px] px-4 py-3.5 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-left">
                    <Camera className="w-5 h-5 text-[#155ead] shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-[#155ead]">
                        {fotoPreview ? 'Cambiar fotografía' : 'Tomar foto o subir archivo'}
                      </p>
                      <p className="text-[11px] text-[#5e7085]">
                        JPG, PNG o WebP · Máximo 10 MB
                      </p>
                    </div>
                  </div>
                  <Upload className="w-4 h-4 text-[#155ead] shrink-0" />
                </button>
              </section>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-5 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
              {/* Barra de progreso del cuestionario paso a paso */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-[#155ead]">
                    {quizStep <= 5
                      ? `Pregunta ${quizStep} de 5`
                      : 'Diagnóstico completado'}
                  </span>
                  <span className="text-[#5e7085] font-medium">
                    {quizStep <= 5 ? `${quizStep * 20}%` : '100%'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#eaf0f7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#155ead] rounded-full transition-all duration-300"
                    style={{
                      width: `${quizStep <= 5 ? quizStep * 20 : 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* PREGUNTA 1: Tipo general de situación */}
              {quizStep === 1 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0e315a] leading-snug">
                      ¿Qué tipo de situación estás observando?
                    </h2>
                    <p className="text-xs text-[#5e7085] mt-1">
                      Elige la opción más cercana; el sistema identificará
                      automáticamente la dependencia correcta.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {PROBLEM_AREAS.map((area) => {
                      const active = areaKey === area.key;
                      return (
                        <button
                          key={area.key}
                          type="button"
                          onClick={() => {
                            setAreaKey(area.key);
                            setIssueId(TRIAGE_ISSUES_BY_AREA[area.key][0].id);
                            setLocationContext(
                              LOCATION_CONTEXT_BY_AREA[area.key].options[0],
                            );
                          }}
                          className={`w-full text-left p-3.5 rounded-[14px] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? 'border-[#155ead] bg-[#edf5ff] shadow-2xs'
                              : 'border-[#e3eaf2] bg-white hover:border-[#b7cce4] hover:bg-slate-50/70'
                          }`}
                        >
                          <span className="text-[13px] font-semibold text-[#172b43]">
                            {area.label}
                          </span>
                          <span
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 border ${
                              active
                                ? 'bg-[#155ead] border-[#155ead] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {active && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PREGUNTA 2: Detalle específico según el área elegida */}
              {quizStep === 2 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0e315a] leading-snug">
                      {QUESTION_2_BY_AREA[areaKey]}
                    </h2>
                    <p className="text-xs text-[#5e7085] mt-1">
                      Selecciona la opción que mejor describa lo que ves en el
                      lugar.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {TRIAGE_ISSUES_BY_AREA[areaKey].map((item) => {
                      const active = issueId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIssueId(item.id)}
                          className={`w-full text-left p-3.5 rounded-[14px] border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            active
                              ? 'border-[#155ead] bg-[#edf5ff] shadow-2xs'
                              : 'border-[#e3eaf2] bg-white hover:border-[#b7cce4] hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#172b43] leading-snug">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-[#5e7085] mt-0.5">
                              {item.helper}
                            </p>
                          </div>
                          <span
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                              active
                                ? 'bg-[#155ead] border-[#155ead] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {active && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PREGUNTA 3: Ubicación contextual según el área */}
              {quizStep === 3 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0e315a] leading-snug">
                      {LOCATION_CONTEXT_BY_AREA[areaKey].question}
                    </h2>
                    <p className="text-xs text-[#5e7085] mt-1">
                      Esto ayuda a la cuadrilla a llevar el equipo adecuado.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {LOCATION_CONTEXT_BY_AREA[areaKey].options.map((opt) => {
                      const active = locationContext === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setLocationContext(opt)}
                          className={`w-full text-left p-3.5 rounded-[14px] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? 'border-[#155ead] bg-[#edf5ff] shadow-2xs'
                              : 'border-[#e3eaf2] bg-white hover:border-[#b7cce4] hover:bg-slate-50/70'
                          }`}
                        >
                          <span className="text-[13px] font-semibold text-[#172b43]">
                            {opt}
                          </span>
                          <span
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 border ${
                              active
                                ? 'bg-[#155ead] border-[#155ead] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {active && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PREGUNTA 4: Nivel de afectación o peligro */}
              {quizStep === 4 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0e315a] leading-snug">
                      ¿Qué nivel de afectación o peligro representa?
                    </h2>
                    <p className="text-xs text-[#5e7085] mt-1">
                      Nos permite priorizar emergencias urbanas de inmediato.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {IMPACT_LEVEL_OPTIONS.map((opt) => {
                      const active = impactLevel === opt.value;
                      const dotColor =
                        opt.value === 'CRITICO'
                          ? 'bg-rose-500'
                          : opt.value === 'ALTO'
                            ? 'bg-orange-500'
                            : opt.value === 'MEDIO'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500';
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setImpactLevel(opt.value)}
                          className={`w-full text-left p-3.5 rounded-[14px] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? 'border-[#155ead] bg-[#edf5ff] shadow-2xs'
                              : 'border-[#e3eaf2] bg-white hover:border-[#b7cce4] hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`size-2.5 rounded-full shrink-0 ${dotColor}`}
                            />
                            <span className="text-[13px] font-semibold text-[#172b43]">
                              {opt.label}
                            </span>
                          </div>
                          <span
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 border ${
                              active
                                ? 'bg-[#155ead] border-[#155ead] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {active && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PREGUNTA 5: Antigüedad del problema */}
              {quizStep === 5 && (
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#0e315a] leading-snug">
                      ¿Desde cuándo se presenta esta situación?
                    </h2>
                    <p className="text-xs text-[#5e7085] mt-1">
                      Última pregunta para asignar tu reporte automáticamente.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {DURATION_OPTIONS.map((opt) => {
                      const active = duration === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setDuration(opt)}
                          className={`w-full text-left p-3.5 rounded-[14px] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? 'border-[#155ead] bg-[#edf5ff] shadow-2xs'
                              : 'border-[#e3eaf2] bg-white hover:border-[#b7cce4] hover:bg-slate-50/70'
                          }`}
                        >
                          <span className="text-[13px] font-semibold text-[#172b43]">
                            {opt}
                          </span>
                          <span
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 border ${
                              active
                                ? 'bg-[#155ead] border-[#155ead] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {active && <Check className="size-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RESUMEN FINAL (Step 6): Dependencia asignada automáticamente */}
              {quizStep === 6 && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#edf5ff] border-2 border-[#bfdbfe] rounded-[16px] p-4 flex items-center gap-3.5">
                    <DepartmentLogo code={triage.departmentCode} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#155ead]">
                        Dependencia asignada automáticamente
                      </p>
                      <p className="text-[15px] font-bold text-[#0e315a] leading-snug mt-0.5">
                        {selectedCategory?.department?.name ??
                          (triage.departmentCode === 'SIM'
                            ? 'Sistema Municipal de Aguas y Saneamiento (SIMAS)'
                            : triage.departmentCode === 'OLA'
                              ? 'Dirección de Limpieza Urbana y Espacios Públicos (La OLA)'
                              : 'Dirección General de Obras Públicas y Bacheo')}
                      </p>
                      <p className="text-[11px] text-[#5e7085] mt-1">
                        Prioridad: <strong>{riskLevel}</strong> · SLA estimado:{' '}
                        {selectedCategory?.department?.defaultSlaHours ?? 24}{' '}
                        horas
                      </p>
                    </div>
                    <CircleCheck className="w-6 h-6 text-[#155ead] shrink-0" />
                  </div>

                  <div className="bg-[#f8fafd] border border-[#e3eaf2] rounded-xl p-3.5 text-xs text-[#3c5068] space-y-1.5">
                    <p className="text-[11px] font-bold uppercase text-[#5e7085]">
                      Resumen automático de tu reporte
                    </p>
                    <p>
                      <strong>Problema:</strong> {triage.issue.label}
                    </p>
                    <p>
                      <strong>Ubicación en sitio:</strong> {locationContext}
                    </p>
                    <p>
                      <strong>Antigüedad:</strong> {duration}
                    </p>
                  </div>
                </div>
              )}

              {/* Botones de navegación del cuestionario */}
              <div className="flex items-center gap-2.5 pt-1">
                {quizStep > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuizStep((prev) =>
                        prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5 | 6) : 1,
                      )
                    }
                    className="h-[48px] px-4 rounded-[14px] border border-[#dce4ed] bg-white hover:bg-slate-50 text-[#172b43] font-semibold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{quizStep === 6 ? 'Editar' : 'Anterior'}</span>
                  </button>
                )}

                {quizStep <= 5 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQuizStep((prev) =>
                        prev < 6 ? ((prev + 1) as 1 | 2 | 3 | 4 | 5 | 6) : 6,
                      )
                    }
                    className="flex-1 h-[48px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>
                      {quizStep === 5 ? 'Ver dependencia asignada' : 'Continuar'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fotoFile) {
                        setAlertState({
                          open: true,
                          type: 'warning',
                          title: 'Fotografía obligatoria',
                          message:
                            'Captura o adjunta una fotografía de la incidencia antes de continuar.',
                        });
                        return;
                      }
                      if (!selectedCategoryId) {
                        setAlertState({
                          open: true,
                          type: 'warning',
                          title: 'Catálogo aún cargando',
                          message:
                            'Espera un segundo mientras se sincronizan las categorías con el servidor.',
                        });
                        return;
                      }
                      setPaso(2);
                    }}
                    className="flex-1 h-[48px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Siguiente: ubicación GPS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Ubicación GPS */}
        {paso === 2 && (
          <form
            onSubmit={handleConfirmarUbicacion}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
          >
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="lg:hidden space-y-1.5 mb-1">
                <h1 className="text-[26px] font-bold leading-tight text-[#172b43]">
                  Ubica la falla
                </h1>
                <p className="text-[14px] text-[#5e7085]">
                  Toca el mapa o arrastra el pin al punto exacto del incidente.
                </p>
              </div>

              <InteractiveMap
                center={coords}
                zoom={16}
                heightClass="h-[300px] sm:h-[360px] lg:h-[440px]"
                selectablePin={coords}
                pinRadiusMeters={50}
                showSearchBar
                searchPlaceholder="Buscar calle o colonia donde está la falla..."
                showLocateButton
                onLocateClick={handleCenterGps}
                onPinChange={(lat, lng, resolvedAddress) => {
                  setCoords({ lat, lng });
                  if (resolvedAddress) {
                    setDireccion(resolvedAddress);
                  } else {
                    void resolveAddressFromCoords(lat, lng);
                  }
                }}
              />

              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-[#18734a] font-semibold">
                  <LocateFixed className="w-4 h-4 shrink-0" />
                  <span>
                    Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    {gpsAccuracy ? ` (±${gpsAccuracy} m)` : ''}
                  </span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-5 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
              <div className="hidden lg:block space-y-1.5">
                <h1 className="text-[28px] font-bold leading-tight text-[#172b43]">
                  Ubica la falla
                </h1>
                <p className="text-[14px] text-[#5e7085]">
                  Toca o arrastra el marcador en el mapa para ajustar la ubicación
                  exacta.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#172b43]">
                  Ubicación detectada en el mapa
                </label>
                <div className="bg-[#f8fafd] border border-[#dce4ed] rounded-[12px] min-h-[48px] px-3.5 py-2.5 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#155ead] shrink-0" />
                  <span className="text-[13px] text-[#172b43] leading-snug">
                    {direccion ||
                      `Ubicación GPS (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}), Torreón, Coah.`}
                  </span>
                </div>
                <p className="text-[11px] text-[#5e7085]">
                  Usa el buscador del mapa o toca el punto exacto para actualizar
                  esta dirección automáticamente.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="referenciaSelect"
                  className="text-[13px] font-bold text-[#172b43]"
                >
                  Referencia visual cercana
                </label>
                <select
                  id="referenciaSelect"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full bg-white border border-[#dce4ed] rounded-[12px] h-[48px] px-3.5 text-[13px] font-medium text-[#172b43] focus:border-[#155ead] outline-none"
                >
                  {REFERENCE_SELECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#f3f6fa] rounded-xl p-3 text-[12px] text-[#5e7085] flex items-start gap-2">
                <AlertTriangle className="size-4 text-[#d97706] shrink-0 mt-0.5" />
                <span>
                  Verificaremos mediante PostGIS (radio de 50 m) si otro vecino ya
                  reportó esta falla para consolidar prioridades.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[50px] bg-[#155ead] hover:bg-[#124d8f] disabled:opacity-60 text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Verificando y enviando...'
                    : 'Confirmar ubicación y enviar'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* PASO 3: Reporte recibido */}
        {paso === 3 && createdReport && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-8 lg:shadow-xs">
            <div className="md:col-span-6 flex flex-col gap-5 text-center md:text-left">
              <div className="space-y-1.5">
                <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172b43]">
                  ¡Gracias por reportar!
                </h1>
                <p className="text-[14px] text-[#5e7085]">
                  Tu participación ayuda a mejorar Torreón.
                </p>
              </div>

              <div className="flex justify-center md:justify-start py-1">
                <div className="w-20 h-20 rounded-full bg-[#e9f7ef] flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full border-2 border-[#18734a] flex items-center justify-center text-[#18734a]">
                    <Check className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              <p className="text-[12px] text-[#5e7085] leading-relaxed">
                Guarda tu folio. Podrás consultar los avances sin iniciar sesión
                y recibirás notificaciones cuando se asigne y resuelva.
              </p>

              <div className="hidden md:flex flex-col gap-3 pt-1">
                <Link
                  href={`/mis-reportes/${encodeURIComponent(createdReport.folio)}`}
                  className="w-full h-[50px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Ver trazabilidad del reporte</span>
                </Link>

                <Link
                  href="/dashboard-ciudadano"
                  className="w-full h-[48px] bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[14px] flex items-center justify-center transition-colors"
                >
                  Volver al mapa
                </Link>
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col gap-4">
              <div className="bg-white md:bg-[#f8fafd] border border-[#dce4ed] rounded-[18px] p-6 text-center space-y-3 shadow-xs">
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f7ef] px-3 py-1 text-[12px] font-semibold text-[#18734a]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18734a]" />
                    Reporte recibido
                  </span>
                </div>

                <p className="text-[11px] font-semibold tracking-wider uppercase text-[#5e7085]">
                  TU FOLIO DE SEGUIMIENTO
                </p>

                <p className="text-[28px] sm:text-[32px] font-extrabold text-[#0e315a] tracking-tight">
                  {createdReport.folio}
                </p>

                <p className="text-[14px] font-bold text-[#172b43]">
                  {createdReport.categoryName}
                </p>

                <p className="text-[12px] text-[#5e7085]">
                  {createdReport.addressReference}
                </p>

                <div className="mt-2 bg-[#edf5ff] rounded-[14px] p-4 flex items-center gap-3 text-left">
                  <Clock className="w-6 h-6 text-[#155ead] shrink-0" />
                  <div>
                    <p className="text-[16px] font-bold text-[#0e315a]">
                      SLA {createdReport.slaHours} hrs
                    </p>
                    <p className="text-[11px] text-[#5e7085]">
                      Plazo estimado de atención · {createdReport.departmentName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex md:hidden flex-col gap-3">
                <Link
                  href={`/mis-reportes/${encodeURIComponent(createdReport.folio)}`}
                  className="w-full h-[50px] bg-[#155ead] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Ver trazabilidad del reporte</span>
                </Link>
                <Link
                  href="/dashboard-ciudadano"
                  className="w-full h-[48px] bg-white border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[14px] flex items-center justify-center"
                >
                  Volver al mapa
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE DEDUPLICACIÓN GEOGRÁFICA REAL (PostGIS ST_DWithin) */}
      {showDeduplicacion && duplicateMatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0e315a]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[24px] max-w-[440px] w-full p-6 shadow-xl flex flex-col gap-4 relative">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-[12px] bg-[#fef7e6] flex items-center justify-center text-[#b45309]">
                <MapPin className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowDeduplicacion(false)}
                className="p-1 rounded-lg text-[#5e7085] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider uppercase text-[#b45309]">
                DEDUPLICACIÓN GEOGRÁFICA
              </p>
              <h2 className="text-[22px] font-bold leading-tight text-[#172b43]">
                Alguien ya reportó una falla cerca
              </h2>
              <p className="text-[13px] text-[#5e7085] leading-relaxed">
                Detectamos un reporte similar a{' '}
                <strong>{duplicateMatch.distanceMeters} m</strong> de tu
                ubicación (radio de 50 m).
              </p>
            </div>

            <div className="bg-[#f3f6fa] border border-[#dce4ed] rounded-[16px] p-3.5 space-y-2.5">
              {duplicateMatch.beforeImageUrl && (
                <div className="rounded-[10px] overflow-hidden h-[120px] w-full bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={duplicateMatch.beforeImageUrl}
                    alt="Evidencia existente"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-[#155ead]">
                  {duplicateMatch.folio} · {duplicateMatch.departmentCode}
                </p>
                <p className="text-[14px] font-bold text-[#172b43]">
                  {duplicateMatch.categoryName}
                </p>
                <p className="text-[12px] text-[#5e7085]">
                  {duplicateMatch.addressReference} ·{' '}
                  {duplicateMatch.upvotesCount} votos
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSumarVoto}
                className="w-full h-[48px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Sí, sigue ahí (+1 voto)</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReportarDiferente}
                className="w-full h-[48px] bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[12px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60"
              >
                No, es un problema totalmente diferente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
