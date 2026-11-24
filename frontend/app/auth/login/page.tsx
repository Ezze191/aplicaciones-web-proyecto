'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Search,
  Check,
  X,
  ArrowRight,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { AppLoader } from '../../components/AppLoader';
import { DepartmentLogo } from '../../components/DepartmentLogo';
import { SiuLogo } from '../../components/SiuLogo';
import { AlertType, SweetAlert } from '../../components/SweetAlert';
import {
  apiFetch,
  ApiError,
  ApiReport,
  AuthUser,
  ReportHistoryItem,
} from '../../lib/api';
import { saveSession, useRedirectIfAuthenticated } from '../../lib/auth';

const InteractiveMap = dynamic(
  () => import('../../components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface FolioLookupResult {
  report: ApiReport;
  history: ReportHistoryItem[];
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkingSession } = useRedirectIfAuthenticated();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [folioInput, setFolioInput] = useState('');
  const [folioLoading, setFolioLoading] = useState(false);
  const [folioError, setFolioError] = useState<string | null>(null);
  const [folioResult, setFolioResult] = useState<FolioLookupResult | null>(null);

  const [previewReports, setPreviewReports] = useState<ApiReport[]>([]);

  // Password Recovery Modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [alertState, setAlertState] = useState<{
    open: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({
    open: false,
    type: 'info',
    message: '',
  });

  const openAlert = (type: AlertType, message: string, title?: string) => {
    setAlertState({ open: true, type, title, message });
  };

  useEffect(() => {
    if (searchParams.get('sessionExpired') === '1') {
      openAlert(
        'warning',
        'Tu sesión expiró o se inició sesión con esta cuenta institucional desde otro dispositivo.',
        'Sesión finalizada',
      );
    }

    // Cargar reportes reales activos para el mapa ilustrativo de portada
    apiFetch<ApiReport[]>('/reports?limit=15', { skipAuthRedirect: true })
      .then((rows) => {
        setPreviewReports(rows);
        if (rows.length > 0 && !folioInput) {
          setFolioInput(rows[0].folio);
          void lookupFolio(rows[0].folio);
        }
      })
      .catch(() => {
        // Servidor aún sin DB conectada: no mostrar datos mockeados
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupFolio = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setFolioLoading(true);
    setFolioError(null);
    try {
      const data = await apiFetch<FolioLookupResult>(
        `/reports/folio/${encodeURIComponent(code)}`,
        { skipAuthRedirect: true },
      );
      setFolioResult(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo consultar el folio en el servidor.';
      setFolioResult(null);
      setFolioError(message);
    } finally {
      setFolioLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !password.trim()) {
      openAlert(
        'warning',
        'Ingresa tu correo y contraseña para continuar.',
        'Campos requeridos',
      );
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await apiFetch<{
        message: string;
        accessToken: string;
        expiresAt?: string;
        redirectTo: string;
        user: AuthUser;
      }>('/auth/login', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({
          email: correo.trim(),
          password,
        }),
      });

      saveSession(res.accessToken, res.user, res.expiresAt);
      router.replace(res.redirectTo || '/dashboard-ciudadano');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar sesión. Verifica tus credenciales.';
      openAlert('error', msg, 'Acceso denegado');
      setIsLoggingIn(false);
    }
  };

  const handleBuscarFolio = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = folioInput.trim().toUpperCase();
    if (!codigo) {
      openAlert(
        'warning',
        'Ingresa un número de folio (ej. SIM-2026-0842).',
        'Folio requerido',
      );
      return;
    }
    await lookupFolio(codigo);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      if (forgotStep === 1) {
        const res = await apiFetch<{ message: string }>('/auth/forgot-password', {
          method: 'POST',
          skipAuthRedirect: true,
          body: JSON.stringify({ email: forgotEmail.trim() }),
        });
        openAlert('info', res.message, 'Código enviado');
        setForgotStep(2);
      } else {
        const res = await apiFetch<{ message: string }>('/auth/reset-password', {
          method: 'POST',
          skipAuthRedirect: true,
          body: JSON.stringify({
            email: forgotEmail.trim(),
            code: resetCode.trim(),
            newPassword,
          }),
        });
        setForgotOpen(false);
        setForgotStep(1);
        setResetCode('');
        setNewPassword('');
        openAlert('success', res.message, 'Contraseña actualizada');
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Error al procesar solicitud.';
      openAlert('error', msg, 'Recuperación de contraseña');
    } finally {
      setForgotLoading(false);
    }
  };

  const statusSteps = [
    { key: 'REGISTRADO', label: 'Recibido' },
    { key: 'ASIGNADO', label: 'Asignado' },
    { key: 'EN_PROCESO', label: 'En proceso' },
    { key: 'RESUELTO', label: 'Resuelto' },
  ];

  const resolveStepIndex = (status?: string) => {
    switch (status) {
      case 'REGISTRADO':
      case 'VALIDADO':
        return 0;
      case 'ASIGNADO':
        return 1;
      case 'EN_PROCESO':
        return 2;
      case 'RESUELTO':
        return 3;
      default:
        return 0;
    }
  };

  const pasoActual = resolveStepIndex(folioResult?.report.currentStatus);

  if (checkingSession) {
    return (
      <AppLoader
        title="Verificando sesión activa..."
        subtitle="Si ya iniciaste sesión te redirigiremos a tu panel"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      {isLoggingIn && (
        <AppLoader
          variant="overlay"
          title="Iniciando sesión..."
          subtitle="Validando credenciales y preparando tu panel"
        />
      )}
      {/* Header Institucional */}
      <header className="bg-white border-b border-[#dce4ed] h-[76px] px-4 sm:px-6 md:px-[40px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-[10px]">
          <SiuLogo variant="light" />
          <div className="flex flex-col gap-[2px] leading-normal">
            <span className="font-bold text-[#0e315a] text-[17px] tracking-tight">
              S.I.U
            </span>
            <span className="text-[10px] font-normal text-[#5e7085] uppercase">
              PLATAFORMA MUNICIPAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#rastreo"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#155ead] hover:underline"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Rastrear folio</span>
          </a>
          <div className="flex items-center gap-[6px] text-[12px] text-[#5e7085]">
            <MapPin className="w-4 h-4 text-[#155ead]" />
            <span>Torreón, Coahuila</span>
          </div>
        </div>
      </header>

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      {/* Portal de acceso unificado */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 lg:px-[80px] pt-[28px] sm:pt-[36px] pb-[32px] flex flex-col gap-[28px]">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[60px] items-start w-full">
          {/* Presentación municipal */}
          <section className="bg-[#0e315a] rounded-[20px] p-6 sm:p-[32px] flex flex-col gap-[18px] w-full lg:w-[610px] shrink-0">
            <p className="font-semibold text-[#afcef0] text-[12px] uppercase">
              PLATAFORMA MUNICIPAL DE REPORTES URBANOS
            </p>
            <h1 className="font-bold leading-[1.25] text-[26px] sm:text-[34px] text-white">
              Una ciudad que escucha. Un servicio que responde.
            </h1>
            <p className="font-normal leading-[1.5] text-[#d1dfef] text-[14px]">
              Conectamos a la ciudadanía con las dependencias para atender las
              fallas urbanas de Torreón en tiempo real.
            </p>

            {/* Mapa interactivo real de incidencias en Torreón */}
            <div className="w-full rounded-[12px] overflow-hidden">
              <InteractiveMap
                heightClass="h-[190px]"
                zoom={13}
                interactive={true}
                markers={previewReports.map((r) => ({
                  id: r.id,
                  lat: r.lat,
                  lng: r.lng,
                  title: `${r.folio} · ${r.categoryName}`,
                  colorHex: r.departmentColor,
                }))}
                onMarkerClick={(id) => {
                  const found = previewReports.find((r) => r.id === id);
                  if (found) {
                    setFolioInput(found.folio);
                    void lookupFolio(found.folio);
                  }
                }}
              />
            </div>

            {/* Dependencias participantes */}
            <div className="flex flex-wrap gap-3 items-center w-full">
              <div className="flex gap-2 items-center bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <DepartmentLogo code="SIM" size="sm" />
                <span className="font-semibold text-[12px] text-white pr-1">
                  SIMAS
                </span>
              </div>
              <div className="flex gap-2 items-center bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <DepartmentLogo code="OLA" size="sm" />
                <span className="font-semibold text-[12px] text-white pr-1">
                  La OLA
                </span>
              </div>
              <div className="flex gap-2 items-center bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 backdrop-blur-xs">
                <DepartmentLogo code="OBP" size="sm" />
                <span className="font-semibold text-[12px] text-white pr-1">
                  Obras Públicas
                </span>
              </div>
            </div>
          </section>

          {/* Formulario de acceso unificado */}
          <section className="flex-1 flex flex-col gap-[18px] py-[4px] w-full">
            <h2 className="font-bold leading-[1.25] text-[#172b43] text-[28px]">
              Inicio de sesión
            </h2>
            <p className="font-normal leading-[1.5] text-[#5e7085] text-[14px]">
              Ingresa con tu correo ciudadano o cuenta institucional (SIMAS, La
              Ola, Obras Públicas o Cuadrilla) para acceder a tu panel.
            </p>

            <form
              onSubmit={handleLoginSubmit}
              className="flex flex-col gap-[18px] w-full"
            >
              <div className="flex flex-col gap-[8px] w-full">
                <label
                  htmlFor="correo"
                  className="font-semibold text-[#172b43] text-[13px]"
                >
                  Correo electrónico
                </label>
                <div className="relative bg-white border border-[#dce4ed] rounded-[8px] min-h-[48px] flex items-center px-[12px] gap-[10px] focus-within:border-[#155ead] focus-within:ring-2 focus-within:ring-[#155ead]/20 transition-all">
                  <Mail className="w-[18px] h-[18px] text-[#5e7085] shrink-0" />
                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    autoComplete="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-transparent text-[13px] text-[#172b43] placeholder:text-[#5e7085] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[8px] w-full">
                <label
                  htmlFor="password"
                  className="font-semibold text-[#172b43] text-[13px]"
                >
                  Contraseña
                </label>
                <div className="relative bg-white border border-[#dce4ed] rounded-[8px] min-h-[48px] flex items-center px-[12px] gap-[10px] focus-within:border-[#155ead] focus-within:ring-2 focus-within:ring-[#155ead]/20 transition-all">
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={
                      verPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    className="text-[#5e7085] hover:text-[#172b43] shrink-0 cursor-pointer focus:outline-none"
                  >
                    {verPassword ? (
                      <Eye className="w-[18px] h-[18px]" />
                    ) : (
                      <EyeOff className="w-[18px] h-[18px]" />
                    )}
                  </button>
                  <input
                    id="password"
                    name="password"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full bg-transparent text-[13px] text-[#172b43] placeholder:text-[#5e7085] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end w-full">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(correo);
                    setForgotOpen(true);
                  }}
                  className="font-semibold text-[#155ead] text-[12px] hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="bg-[#155ead] hover:bg-[#124d8f] disabled:opacity-60 border border-[#155ead] flex gap-[8px] h-[48px] items-center justify-center px-[16px] rounded-[12px] w-full text-white text-[14px] font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                <span>
                  {isLoggingIn ? 'Verificando acceso...' : 'Iniciar sesión'}
                </span>
              </button>

              <p className="text-[#5e7085] text-[11px] text-center leading-[1.5]">
                El sistema identificará tu rol (Ciudadano, Supervisor o Cuadrilla)
                y aplicará sesión única en cuentas institucionales.
              </p>

              <p className="text-center text-[12px] text-[#5e7085]">
                ¿No tienes una cuenta ciudadana?{' '}
                <Link
                  href="/registro"
                  className="font-semibold text-[#155ead] hover:underline"
                >
                  Regístrate aquí
                </Link>
              </p>
            </form>
          </section>
        </div>

        {/* Rastreo público sin sesión */}
        <section
          id="rastreo"
          className="bg-white border border-[#dce4ed] rounded-[20px] p-6 sm:p-[28px] flex flex-col lg:flex-row gap-8 lg:gap-[48px] items-start w-full"
        >
          {/* Buscador público */}
          <div className="flex flex-col gap-[14px] w-full lg:w-[520px] shrink-0">
            <div className="flex gap-[8px] items-center">
              <Search className="w-5 h-5 text-[#155ead] shrink-0" />
              <h2 className="font-bold text-[#0e315a] text-[20px] sm:text-[22px]">
                Rastrear folio sin iniciar sesión
              </h2>
            </div>
            <p className="text-[#5e7085] text-[14px] leading-[1.5]">
              Consulta el avance de cualquier reporte con su folio oficial. No
              necesitas una cuenta.
            </p>

            <form
              onSubmit={handleBuscarFolio}
              className="flex gap-[10px] items-start w-full"
            >
              <label htmlFor="folio" className="sr-only">
                Folio del reporte
              </label>
              <input
                id="folio"
                name="folio"
                type="text"
                value={folioInput}
                onChange={(e) => setFolioInput(e.target.value)}
                placeholder="Ej. SIM-2026-0842"
                className="flex-1 bg-[#f3f6fa] border border-[#dce4ed] focus:border-[#155ead] focus:bg-white rounded-[8px] h-[48px] px-[14px] text-[14px] font-semibold text-[#172b43] outline-none transition-all uppercase"
              />
              <button
                type="submit"
                disabled={folioLoading}
                className="bg-[#155ead] hover:bg-[#124d8f] disabled:opacity-60 border border-[#155ead] flex gap-[8px] h-[48px] items-center justify-center px-[16px] rounded-[12px] shrink-0 text-[14px] font-semibold text-white transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span>{folioLoading ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </form>

            {folioError && (
              <div className="bg-[#fdeef0] border border-[#f5c6cb] rounded-[12px] p-3.5 flex items-start gap-2.5 text-[12px] text-[#be313b]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{folioError}</span>
              </div>
            )}

            {folioResult ? (
              <div className="bg-[#edf5ff] rounded-[12px] p-[16px] flex flex-col gap-[8px] w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-[#0e315a] text-[13px]">
                    {folioResult.report.folio} · {folioResult.report.departmentCode}
                  </span>
                  <span className="inline-flex items-center gap-[6px] px-[9px] py-[5px] rounded-[8px] text-[11px] font-semibold text-[#155ead] bg-white/80">
                    <span className="size-[6px] rounded-full bg-[#155ead]" />
                    {folioResult.report.currentStatus.replace('_', ' ')}
                  </span>
                </div>
                <p className="font-semibold text-[#172b43] text-[13px] leading-[1.5]">
                  {folioResult.report.categoryName} ·{' '}
                  {folioResult.report.addressReference}
                </p>
                <p className="text-[#5e7085] text-[11px] leading-[1.5]">
                  SLA {folioResult.report.slaHours} hrs ·{' '}
                  {folioResult.report.upvotesCount} confirmaciones
                </p>
                <Link
                  href={`/mis-reportes/${encodeURIComponent(folioResult.report.folio)}`}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#155ead] hover:underline pt-1"
                >
                  <span>Ver expediente completo y evidencias</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              !folioError && (
                <div className="bg-[#f3f6fa] border border-dashed border-[#dce4ed] rounded-[12px] p-4 text-[12px] text-[#5e7085]">
                  Ingresa un folio institucional (formato{' '}
                  <code className="font-mono text-[#0e315a]">SIM-2026-0842</code>)
                  para consultar su trazabilidad en tiempo real desde la base de
                  datos.
                </div>
              )
            )}
          </div>

          {/* Trazabilidad pública */}
          <div className="flex-1 flex flex-col gap-[14px] w-full">
            <h3 className="text-[#172b43] text-[14px] font-semibold">
              Seguimiento de atención
            </h3>

            {folioResult?.report.currentStatus === 'RECHAZADO' ? (
              <div className="bg-[#fdeef0] border border-[#f5c6cb] rounded-[14px] p-4 text-[13px] text-[#be313b]">
                <p className="font-bold">Reporte rechazado administrativamente</p>
                <p className="mt-1">
                  {folioResult.history[folioResult.history.length - 1]?.notes ||
                    'Consulta el expediente para más detalles.'}
                </p>
              </div>
            ) : (
              <ol className="flex flex-col w-full">
                {statusSteps.map((paso, index) => {
                  const hasData = Boolean(folioResult);
                  const completado =
                    hasData &&
                    (index < pasoActual ||
                      folioResult?.report.currentStatus === 'RESUELTO');
                  const actual =
                    hasData &&
                    index === pasoActual &&
                    folioResult?.report.currentStatus !== 'RESUELTO';
                  const pendiente = !hasData || index > pasoActual;
                  const esUltimo = index === statusSteps.length - 1;

                  const historyMatch = folioResult?.history.find(
                    (h) => h.newStatus === paso.key,
                  );

                  return (
                    <li
                      key={paso.key}
                      className="flex gap-[14px] items-start w-full"
                    >
                      <div className="flex flex-col items-center shrink-0 w-[28px]">
                        <div
                          className={`size-[28px] rounded-full flex items-center justify-center ${
                            completado
                              ? 'bg-[#155ead] border border-[#dce4ed]'
                              : actual
                                ? 'bg-white border-2 border-[#155ead]'
                                : 'bg-[#e8eef5] border border-[#dce4ed]'
                          }`}
                        >
                          {completado ? (
                            <Check className="w-[14px] h-[14px] text-white stroke-[2.5]" />
                          ) : actual ? (
                            <span className="size-[8px] rounded-full bg-[#155ead]" />
                          ) : (
                            <span className="size-[8px] rounded-full bg-[#9fb0c4]" />
                          )}
                        </div>
                        {!esUltimo && (
                          <div
                            className={`h-[40px] w-[2px] ${
                              completado ? 'bg-[#155ead]' : 'bg-[#dce4ed]'
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-[2px] pb-[16px]">
                        <div className="flex items-center justify-between w-full">
                          <p
                            className={`text-[14px] font-medium ${
                              pendiente ? 'text-[#5e7085]' : 'text-[#172b43]'
                            }`}
                          >
                            {paso.label}
                          </p>
                          {actual && (
                            <span className="bg-[#edf5ff] inline-flex items-center gap-[6px] px-[9px] py-[4px] rounded-[8px] text-[11px] font-semibold text-[#155ead]">
                              <span className="size-[6px] rounded-full bg-[#155ead]" />
                              Actual
                            </span>
                          )}
                        </div>
                        <p className="text-[#5e7085] text-[11px] font-normal">
                          {historyMatch
                            ? `${new Date(historyMatch.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}${historyMatch.notes ? ` · ${historyMatch.notes}` : ''}`
                            : hasData && completado
                              ? 'Completado'
                              : 'Pendiente'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Pie institucional */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[#5e7085] text-[11px] w-full">
          <span>S.I.U Torreón Alerta · Plataforma Municipal de Incidencias Urbanas</span>
          <span className="text-center">
            Aviso de privacidad · Datos abiertos ODbL · Accesibilidad WCAG 2.1 AA
          </span>
        </footer>
      </main>

      {/* Modal Recuperación de Contraseña */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-[430px] w-full p-6 shadow-2xl border border-[#dce4ed] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#155ead]" />
                <h2 className="font-bold text-[18px] text-[#0e315a]">
                  Recuperar contraseña
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#172b43]">
                  Correo electrónico registrado
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                />
              </div>

              {forgotStep === 2 && (
                <>
                  <div>
                    <label className="text-[12px] font-semibold text-[#172b43]">
                      Código de 6 dígitos enviado por correo (Resend)
                    </label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#172b43]">
                      Nueva contraseña (mín. 8 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full p-2.5 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="mt-2 h-11 rounded-[12px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[13px] cursor-pointer disabled:opacity-60"
              >
                {forgotLoading
                  ? 'Procesando...'
                  : forgotStep === 1
                    ? 'Enviar código de verificación'
                    : 'Restablecer contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AppLoader
          title="Cargando portal S.I.U..."
          subtitle="Preparando acceso ciudadano e institucional"
        />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
