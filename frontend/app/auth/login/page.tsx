'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  Search,
  Droplets,
  Zap,
  Construction,
  LocateFixed,
  Check,
} from 'lucide-react';
import { SiuLogo } from '../../components/SiuLogo';
import { AlertType, SweetAlert } from '../../components/SweetAlert';
import { getBackendUrl } from '../../lib/api';
import { getDashboardPath, getSession, saveSession } from '../../lib/session';

interface FolioResult {
  folio: string;
  titulo: string;
  ubicacion: string;
  estatus: 'Recibido' | 'Asignado' | 'En proceso' | 'Resuelto';
  sla: string;
  actualizado: string;
}

const FOLIOS_DEMO: Record<string, FolioResult> = {
  'SIM-2026-0842': {
    folio: 'SIM-2026-0842',
    titulo: 'Fuga de agua',
    ubicacion: 'Av. Juárez y Calz. Colón',
    estatus: 'En proceso',
    sla: 'SLA 24 hrs',
    actualizado: 'Actualizado el 25 oct, 11:20',
  },
  'OLA-2026-0194': {
    folio: 'OLA-2026-0194',
    titulo: 'Luminaria apagada',
    ubicacion: 'Blvd. Independencia #420',
    estatus: 'Asignado',
    sla: 'SLA 48 hrs',
    actualizado: 'Actualizado el 25 oct, 10:15',
  },
  'OBR-2026-0511': {
    folio: 'OBR-2026-0511',
    titulo: 'Bache profundo',
    ubicacion: 'Calz. Cuauhtémoc y Av. Morelos',
    estatus: 'Resuelto',
    sla: 'SLA 72 hrs',
    actualizado: 'Actualizado el 24 oct, 17:40',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const [folioInput, setFolioInput] = useState('SIM-2026-0842');
  const [folioActivo, setFolioActivo] = useState<FolioResult>(
    FOLIOS_DEMO['SIM-2026-0842'],
  );

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

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(getDashboardPath(session.user.role));
    }
  }, [router]);

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

    setIsLoading(true);
    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim(), password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const backendMessage = Array.isArray(data?.message)
          ? data.message.join(' ')
          : data?.message;
        openAlert(
          'error',
          backendMessage || 'No se pudo iniciar sesión. Verifica tus datos.',
          'Error al iniciar sesión',
        );
        return;
      }

      saveSession({
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        redirectTo: data.redirectTo,
        user: data.user,
      });
      router.replace(getDashboardPath(data.user.role));
    } catch {
      openAlert(
        'error',
        `No se pudo conectar con el servidor (${backendUrl}). Verifica que el backend esté encendido.`,
        'Error de conexión',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuscarFolio = (e: React.FormEvent) => {
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

    const encontrado = FOLIOS_DEMO[codigo];
    if (encontrado) {
      setFolioActivo(encontrado);
    } else {
      setFolioActivo({
        folio: codigo,
        titulo: 'Reporte ciudadano',
        ubicacion: 'Torreón, Coahuila',
        estatus: 'Recibido',
        sla: 'SLA 24 hrs',
        actualizado: 'Consulta de vista previa',
      });
    }
  };

  const pasoActual =
    folioActivo.estatus === 'Recibido'
      ? 0
      : folioActivo.estatus === 'Asignado'
        ? 1
        : folioActivo.estatus === 'En proceso'
          ? 2
          : 3;

  const pasos = [
    { label: 'Recibido', fecha: '25 oct · 09:41' },
    { label: 'Asignado', fecha: '25 oct · 10:05' },
    { label: 'En proceso', fecha: '25 oct · 11:20' },
    {
      label: 'Resuelto',
      fecha: pasoActual === 3 ? '25 oct · 16:30' : 'Pendiente',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      {/* Navegación de vistas */}
      <header className="bg-white border-b border-[#dce4ed] h-[76px] px-6 md:px-[40px] flex items-center justify-between shrink-0">
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

        <div className="flex items-center gap-[6px] text-[12px] text-[#5e7085]">
          <MapPin className="w-4 h-4 text-[#155ead]" />
          <span>Torreón, Coahuila</span>
        </div>
      </header>

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      {/* Portal de acceso */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 lg:px-[80px] pt-[36px] pb-[32px] flex flex-col gap-[28px]">
        {/* Acceso y presentación */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[60px] items-start w-full">
          {/* Presentación municipal */}
          <section className="bg-[#0e315a] rounded-[20px] p-6 sm:p-[32px] flex flex-col gap-[18px] w-full lg:w-[610px] shrink-0">
            <p className="font-semibold text-[#afcef0] text-[12px] uppercase">
              PLATAFORMA MUNICIPAL DE REPORTES URBANOS
            </p>
            <h1 className="font-bold leading-[1.25] text-[28px] sm:text-[34px] text-white">
              Una ciudad que escucha. Un servicio que responde.
            </h1>
            <p className="font-normal leading-[1.5] text-[#d1dfef] text-[14px]">
              Conectamos a la ciudadanía con las dependencias para atender las
              fallas urbanas de Torreón.
            </p>

            {/* Mapa urbano de Torreón · ilustrativo */}
            <div className="relative bg-[#e9eef0] h-[176px] w-full rounded-[12px] overflow-hidden select-none">
              <img
                alt=""
                src="/images/figma-login/manzanas-y-parque.svg"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bg-[#d0e4d8] h-[50px] left-[40%] rounded-[4px] top-[45px] w-[64px]" />
              <img
                alt=""
                src="/images/figma-login/calles.svg"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <img
                alt=""
                src="/images/figma-login/boulevard-principal.svg"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <img
                alt=""
                src="/images/figma-login/eje-vial.svg"
                className="absolute inset-0 w-full h-full object-cover"
              />

              <p className="absolute left-[20px] top-[90px] text-[#697c89] text-[9px] font-normal whitespace-nowrap">
                AV. JUÁREZ
              </p>
              <div className="absolute flex h-[54px] items-center justify-center left-[24%] top-[45px] w-[10px]">
                <p className="rotate-90 text-[#697c89] text-[8px] font-normal whitespace-nowrap">
                  CALZ. COLÓN
                </p>
              </div>
              <p className="absolute left-[calc(40%+32px)] -translate-x-1/2 top-[57px] text-[#497c5d] text-[9px] leading-[1.4] text-center w-[55px]">
                Alameda Zaragoza
              </p>

              {/* Reporte geolocalizado */}
              <div className="absolute bg-[#ea580c] border-3 border-white flex items-center justify-center left-[49px] top-[52px] rounded-full size-[36px] shadow-sm">
                <Construction className="w-[18px] h-[18px] text-white" />
              </div>

              {/* Control de ubicación */}
              <button
                type="button"
                aria-label="Centrar mapa ilustrativo"
                className="absolute bg-white bottom-[32px] right-[12px] flex items-center justify-center rounded-[8px] size-[38px] shadow-xs hover:bg-slate-50 cursor-pointer"
              >
                <LocateFixed className="w-5 h-5 text-[#155ead]" />
              </button>

              <p className="absolute bottom-[6px] left-[10px] text-[#5e7085] text-[8px] font-normal whitespace-nowrap">
                Torreón, Coah. · Mapa ilustrativo · 100 m ━━━
              </p>
            </div>

            {/* Dependencias participantes */}
            <div className="flex flex-wrap gap-[20px] items-center w-full">
              <div className="flex gap-[8px] items-center">
                <Droplets className="w-[18px] h-[18px] text-[#38bdf8]" />
                <span className="font-semibold text-[12px] text-white">
                  SIMAS
                </span>
              </div>
              <div className="flex gap-[8px] items-center">
                <Zap className="w-[18px] h-[18px] text-[#f59e0b]" />
                <span className="font-semibold text-[12px] text-white">
                  La Ola
                </span>
              </div>
              <div className="flex gap-[8px] items-center">
                <Construction className="w-[18px] h-[18px] text-[#fb923c]" />
                <span className="font-semibold text-[12px] text-white">
                  Obras Públicas
                </span>
              </div>
            </div>
          </section>

          {/* Formulario de acceso */}
          <section className="flex-1 flex flex-col gap-[18px] py-[4px] w-full">
            <h2 className="font-bold leading-[1.25] text-[#172b43] text-[28px]">
              Inicio de sesión
            </h2>
            <p className="font-normal leading-[1.5] text-[#5e7085] text-[14px]">
              Ingresa con tu correo y contraseña para acceder al panel
              correspondiente.
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
                  Correo
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
                  onClick={() =>
                    openAlert(
                      'info',
                      'La recuperación de contraseña se habilitará al conectar con el servidor.',
                      'Recuperar contraseña',
                    )
                  }
                  className="font-semibold text-[#155ead] text-[12px] hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#155ead] hover:bg-[#124d8f] disabled:opacity-60 disabled:cursor-not-allowed border border-[#155ead] flex gap-[8px] h-[48px] items-center justify-center px-[16px] rounded-[12px] w-full text-white text-[14px] font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                <span>{isLoading ? 'Ingresando...' : 'Iniciar sesión'}</span>
              </button>

              <p className="text-[#5e7085] text-[11px] text-center leading-[1.5]">
                El sistema identificará tu cuenta y te redirigirá al panel
                correspondiente.
              </p>

              <p className="text-center text-[12px] text-[#5e7085]">
                ¿No tienes una cuenta?{' '}
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
        <section className="bg-white border border-[#dce4ed] rounded-[20px] p-6 sm:p-[28px] flex flex-col lg:flex-row gap-8 lg:gap-[48px] items-start w-full">
          {/* Buscador público */}
          <div className="flex flex-col gap-[14px] w-full lg:w-[520px] shrink-0">
            <div className="flex gap-[8px] items-center">
              <Search className="w-5 h-5 text-[#155ead] shrink-0" />
              <h2 className="font-bold text-[#0e315a] text-[20px] sm:text-[22px]">
                Rastrear folio sin iniciar sesión
              </h2>
            </div>
            <p className="text-[#5e7085] text-[14px] leading-[1.5]">
              Consulta el avance de cualquier reporte con su folio. No necesitas
              una cuenta.
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
                placeholder="SIM-2026-0842"
                className="flex-1 bg-[#f3f6fa] border border-[#dce4ed] focus:border-[#155ead] focus:bg-white rounded-[8px] h-[48px] px-[14px] text-[14px] font-semibold text-[#172b43] outline-none transition-all"
              />
              <button
                type="submit"
                className="bg-[#155ead] hover:bg-[#124d8f] border border-[#155ead] flex gap-[8px] h-[48px] items-center justify-center px-[16px] rounded-[12px] shrink-0 text-[14px] font-semibold text-white transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span>Buscar</span>
              </button>
            </form>

            {/* Resultado público */}
            <div className="bg-[#edf5ff] rounded-[12px] p-[16px] flex flex-col gap-[8px] w-full">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-[#0e315a] text-[13px]">
                  {folioActivo.folio}
                </span>
                <span className="inline-flex items-center gap-[6px] px-[9px] py-[5px] rounded-[8px] text-[11px] font-semibold text-[#155ead] bg-white/60">
                  <span className="size-[6px] rounded-full bg-[#155ead]" />
                  {folioActivo.estatus}
                </span>
              </div>
              <p className="font-semibold text-[#172b43] text-[13px] leading-[1.5]">
                {folioActivo.titulo} · {folioActivo.ubicacion}
              </p>
              <p className="text-[#5e7085] text-[11px] leading-[1.5]">
                {folioActivo.sla} · {folioActivo.actualizado}
              </p>
            </div>
          </div>

          {/* Trazabilidad pública */}
          <div className="flex-1 flex flex-col gap-[14px] w-full">
            <h3 className="text-[#172b43] text-[14px] font-normal">
              Seguimiento de atención
            </h3>

            <ol className="flex flex-col w-full">
              {pasos.map((paso, index) => {
                const completado = index < pasoActual;
                const actual = index === pasoActual;
                const pendiente = index > pasoActual;
                const esUltimo = index === pasos.length - 1;

                return (
                  <li
                    key={paso.label}
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
                          className={`h-[44px] w-[2px] ${
                            completado ? 'bg-[#155ead]' : 'bg-[#dce4ed]'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-[4px] pb-[20px]">
                      <div className="flex items-center justify-between w-full">
                        <p
                          className={`text-[14px] font-normal ${
                            pendiente ? 'text-[#5e7085]' : 'text-[#172b43]'
                          }`}
                        >
                          {paso.label}
                        </p>
                        {actual && (
                          <span className="bg-[#edf5ff] inline-flex items-center gap-[6px] px-[9px] py-[5px] rounded-[8px] text-[11px] font-semibold text-[#155ead]">
                            <span className="size-[6px] rounded-full bg-[#155ead]" />
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-[#5e7085] text-[11px] font-normal">
                        {paso.fecha}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Pie institucional */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[#5e7085] text-[11px] w-full">
          <span>S.I.U · Servicio municipal · Identidad ilustrativa</span>
          <span className="whitespace-pre-wrap text-center">
            Aviso de privacidad    ·    Ayuda y contacto    ·    Accesibilidad
          </span>
        </footer>
      </main>
    </div>
  );
}
