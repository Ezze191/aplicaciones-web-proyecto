'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Camera,
  Upload,
  Droplets,
  Zap,
  Construction,
  CircleCheck,
  Circle,
  LocateFixed,
  MapPin,
  Send,
  ThumbsUp,
  Check,
  Clock,
  GitBranch,
} from 'lucide-react';
import { CiudadanoHeader } from '../components/CiudadanoHeader';
import { AlertType, SweetAlert } from '../components/SweetAlert';

type TipoProblema = 'fuga' | 'basura' | 'bache';

interface OpcionProblema {
  id: TipoProblema;
  titulo: string;
  subtitulo: string;
  dependencia: 'SIMAS' | 'La Ola' | 'Obras Públicas';
  dependenciaDesc: string;
  sla: string;
  folioPrefix: string;
  icon: 'droplets' | 'zap' | 'construction';
}

const OPCIONES_PROBLEMA: OpcionProblema[] = [
  {
    id: 'fuga',
    titulo: 'Fuga de agua',
    subtitulo: 'SIMAS · Agua potable y drenaje',
    dependencia: 'SIMAS',
    dependenciaDesc: 'Agua potable y drenaje',
    sla: '24 hrs',
    folioPrefix: 'SIM',
    icon: 'droplets',
  },
  {
    id: 'basura',
    titulo: 'Basura sin recolectar',
    subtitulo: 'La Ola · Recolección de basura',
    dependencia: 'La Ola',
    dependenciaDesc: 'Recolección de basura',
    sla: '24 hrs',
    folioPrefix: 'OLA',
    icon: 'zap',
  },
  {
    id: 'bache',
    titulo: 'Bache o vialidad dañada',
    subtitulo: 'Obras Públicas · Baches y vialidades',
    dependencia: 'Obras Públicas',
    dependenciaDesc: 'Baches y vialidades',
    sla: '48 hrs',
    folioPrefix: 'OP',
    icon: 'construction',
  },
];

export default function ReportarFallaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [problema, setProblema] = useState<TipoProblema>('fuga');
  const [fotoPreview, setFotoPreview] = useState<string>(
    '/images/figma-ciudadano/fuga-juarez.png',
  );
  const [fotoNombre, setFotoNombre] = useState('fuga_juarez.jpg · 2.4 MB');

  const [direccion, setDireccion] = useState('Av. Juárez y Calz. Colón, Centro');
  const [referencia, setReferencia] = useState(
    'Junto a la banqueta de la esquina',
  );

  const [showDeduplicacion, setShowDeduplicacion] = useState(false);
  const [votosCercanos, setVotosCercanos] = useState(24);
  const [folioGenerado, setFolioGenerado] = useState('SIM-2026-0842');

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

  const problemaActivo =
    OPCIONES_PROBLEMA.find((p) => p.id === problema) ?? OPCIONES_PROBLEMA[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setFotoNombre(`${file.name} · ${sizeMb} MB`);
    const url = URL.createObjectURL(file);
    setFotoPreview(url);
  };

  const renderIcon = (
    icon: OpcionProblema['icon'],
    className = 'w-5 h-5',
  ) => {
    if (icon === 'droplets') {
      return <Droplets className={`${className} text-[#155ead]`} />;
    }
    if (icon === 'zap') {
      return <Zap className={`${className} text-[#d97706]`} />;
    }
    return <Construction className={`${className} text-[#ea580c]`} />;
  };

  const handleConfirmarUbicacion = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDeduplicacion(true);
  };

  const handleSumarVoto = () => {
    setVotosCercanos((v) => v + 1);
    setShowDeduplicacion(false);
    setAlertState({
      open: true,
      type: 'success',
      title: '¡Confirmación registrada!',
      message:
        'Se sumó tu voto (+1) al folio SIM-2026-0842 para priorizar su atención.',
    });
  };

  const handleReportarDiferente = () => {
    setShowDeduplicacion(false);
    setFolioGenerado(
      problemaActivo.id === 'fuga'
        ? 'SIM-2026-0842'
        : `${problemaActivo.folioPrefix}-2026-0843`,
    );
    setPaso(3);
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-[#172b43]">
      <CiudadanoHeader
        onBellClick={() =>
          setAlertState({
            open: true,
            type: 'info',
            title: 'Notificaciones',
            message: 'No tienes notificaciones nuevas por el momento.',
          })
        }
      />

      <SweetAlert
        open={alertState.open}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      {/* Contenedor responsive: 1 columna en móvil (Figma), multi-columna amplia en web */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col gap-6">
        {/* Barra de progreso de pasos */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (paso === 1) {
                  router.push('/dashboard-ciudadano');
                } else if (paso === 2) {
                  setPaso(1);
                } else {
                  setPaso(2);
                }
              }}
              aria-label="Regresar"
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
              aria-label="Cerrar"
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

        {/* PASO 1: Foto y descripción */}
        {paso === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Columna izquierda: Título + Fotografía */}
            <div className="lg:col-span-6 flex flex-col gap-5">
              <div className="space-y-2">
                <h1 className="text-[26px] sm:text-[32px] font-bold leading-tight text-[#172b43]">
                  ¿Qué está pasando?
                </h1>
                <p className="text-[14px] text-[#5e7085] leading-relaxed">
                  Selecciona el problema; el sistema detectará la dependencia
                  correspondiente. Una foto y unos detalles nos ayudan a
                  canalizar tu reporte.
                </p>
              </div>

              <section className="flex flex-col gap-3 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#172b43]">
                    Fotografía del problema
                  </span>
                  <span className="text-[12px] text-[#5e7085]">
                    1 de 3 fotos
                  </span>
                </div>

                <div className="relative rounded-[16px] overflow-hidden border border-[#dce4ed] bg-slate-200 aspect-[16/10] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoPreview}
                    alt="Fotografía del problema reportado"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute left-3 bottom-3 bg-white/95 backdrop-blur-xs rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                    <CircleCheck className="w-3.5 h-3.5 text-[#18734a]" />
                    <span className="text-[12px] font-semibold text-[#172b43]">
                      {fotoNombre}
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
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
                        Tomar foto o subir archivo
                      </p>
                      <p className="text-[11px] text-[#5e7085]">
                        JPG o PNG · Máximo 10 MB
                      </p>
                    </div>
                  </div>
                  <Upload className="w-4 h-4 text-[#155ead] shrink-0" />
                </button>

                <p className="hidden lg:block text-[11px] text-[#5e7085] pt-1">
                  No incluyas rostros, placas ni datos personales en tu
                  fotografía.
                </p>
              </section>
            </div>

            {/* Columna derecha: Selección de problema + Dependencia + Botón */}
            <div className="lg:col-span-6 flex flex-col gap-5 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
              <section className="flex flex-col gap-2.5">
                <span className="text-[14px] font-bold text-[#172b43]">
                  Selecciona el problema
                </span>

                <div className="flex flex-col gap-2.5">
                  {OPCIONES_PROBLEMA.map((op) => {
                    const selected = op.id === problema;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setProblema(op.id)}
                        className={`w-full bg-white rounded-[14px] px-4 py-3.5 flex items-center justify-between text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-2 border-[#155ead] shadow-xs'
                            : 'border border-[#dce4ed] hover:border-[#b5c7db]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">{renderIcon(op.icon)}</div>
                          <div>
                            <p className="text-[14px] font-bold text-[#172b43]">
                              {op.titulo}
                            </p>
                            <p className="text-[12px] text-[#5e7085]">
                              {op.subtitulo}
                            </p>
                          </div>
                        </div>
                        {selected ? (
                          <CircleCheck className="w-5 h-5 text-[#155ead] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#cbd5e1] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <span className="text-[14px] font-bold text-[#172b43]">
                  Dependencia detectada
                </span>
                <div className="bg-white border border-[#0e315a] rounded-[14px] px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {renderIcon(problemaActivo.icon)}
                    <div>
                      <p className="text-[14px] font-bold text-[#172b43]">
                        {problemaActivo.dependencia}
                      </p>
                      <p className="text-[12px] text-[#5e7085]">
                        {problemaActivo.dependenciaDesc}
                      </p>
                    </div>
                  </div>
                  <CircleCheck className="w-5 h-5 text-[#0e315a] shrink-0" />
                </div>
                <p className="text-[11px] text-[#5e7085]">
                  El sistema canaliza automáticamente el reporte a la
                  dependencia correspondiente.
                </p>
              </section>

              <button
                type="button"
                onClick={() => setPaso(2)}
                className="w-full h-[50px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Siguiente: ubicación</span>
              </button>

              <p className="lg:hidden text-center text-[11px] text-[#5e7085] pb-2">
                No incluyas rostros, placas ni datos personales en tu
                fotografía.
              </p>
            </div>
          </div>
        )}

        {/* PASO 2: Ubicación GPS */}
        {paso === 2 && (
          <form
            onSubmit={handleConfirmarUbicacion}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
          >
            {/* Columna izquierda: Mapa GPS */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="lg:hidden space-y-1.5 mb-1">
                <h1 className="text-[26px] font-bold leading-tight text-[#172b43]">
                  Ubica la falla
                </h1>
                <p className="text-[14px] text-[#5e7085] leading-relaxed">
                  Mueve el mapa para colocar el pin en el punto exacto del
                  problema.
                </p>
              </div>

              <div className="relative h-[260px] sm:h-[320px] lg:h-[430px] w-full rounded-[16px] overflow-hidden bg-[#e9eef0] border border-[#dce4ed] select-none shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src="/images/figma-ciudadano/gps-manzanas.svg"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bg-[#d0e4d8] h-[54px] lg:h-[76px] right-[18%] top-[14%] w-[68px] lg:w-[96px] rounded-[6px]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src="/images/figma-ciudadano/gps-calles.svg"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src="/images/figma-ciudadano/gps-boulevard.svg"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src="/images/figma-ciudadano/gps-eje-vial.svg"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <span className="absolute left-[10%] top-[24%] text-[10px] sm:text-xs text-[#697c89] tracking-wide">
                  AV. JUÁREZ
                </span>
                <span className="absolute left-[34%] top-[24%] rotate-90 text-[9px] sm:text-[11px] text-[#697c89] tracking-wide">
                  CALZ. COLÓN
                </span>
                <span className="absolute right-[19%] top-[18%] text-[10px] sm:text-xs text-[#497c5d] text-center leading-tight">
                  Alameda
                  <br />
                  Zaragoza
                </span>
                <span className="absolute left-[13%] bottom-[16%] text-[11px] sm:text-xs font-semibold text-[#697c89] tracking-wider">
                  CENTRO
                </span>

                {/* Radio de precisión + pin central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-[92px] h-[92px] rounded-full bg-[#155ead]/10 border border-[#155ead]/60 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#155ead] border-2 border-white shadow-md flex items-center justify-center">
                      {problemaActivo.icon === 'droplets' ? (
                        <Droplets className="w-5 h-5 text-white" />
                      ) : problemaActivo.icon === 'zap' ? (
                        <Zap className="w-5 h-5 text-white" />
                      ) : (
                        <Construction className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 bg-white/95 border border-[#dce4ed] rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[12px] font-bold text-[#0e315a]">
                      {direccion.split(',')[0]}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Recentrar GPS"
                  onClick={() =>
                    setAlertState({
                      open: true,
                      type: 'info',
                      title: 'GPS actualizado',
                      message: 'Ubicación centrada con precisión de ±8 m.',
                    })
                  }
                  className="absolute right-3 bottom-3 w-10 h-10 rounded-[12px] bg-white border border-[#dce4ed] shadow-sm flex items-center justify-center text-[#155ead] hover:bg-slate-50 cursor-pointer"
                >
                  <LocateFixed className="w-5 h-5" />
                </button>

                <span className="absolute left-3 bottom-2 text-[9px] text-[#5e7085] bg-white/75 px-1.5 py-0.5 rounded">
                  Torreón, Coah. · Mapa ilustrativo · 100 m
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#18734a] text-[13px] font-semibold">
                <LocateFixed className="w-4 h-4 shrink-0" />
                <span>Ubicación GPS detectada · Precisión ±8 m</span>
              </div>
            </div>

            {/* Columna derecha: Campos de dirección y envío */}
            <div className="lg:col-span-5 flex flex-col gap-5 lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-6 lg:shadow-xs">
              <div className="hidden lg:block space-y-1.5">
                <h1 className="text-[28px] font-bold leading-tight text-[#172b43]">
                  Ubica la falla
                </h1>
                <p className="text-[14px] text-[#5e7085] leading-relaxed">
                  Mueve el mapa para colocar el pin en el punto exacto del
                  problema.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="direccion"
                  className="text-[13px] font-bold text-[#172b43]"
                >
                  Dirección del reporte
                </label>
                <div className="bg-white border border-[#dce4ed] rounded-[12px] h-[48px] px-3.5 flex items-center gap-2.5 focus-within:border-[#155ead] focus-within:ring-2 focus-within:ring-[#155ead]/20">
                  <MapPin className="w-4 h-4 text-[#5e7085] shrink-0" />
                  <input
                    id="direccion"
                    type="text"
                    required
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full bg-transparent text-[13px] text-[#172b43] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="referencia"
                  className="text-[13px] font-bold text-[#172b43]"
                >
                  Referencia adicional (opcional)
                </label>
                <input
                  id="referencia"
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej. Junto a la banqueta de la esquina"
                  className="w-full bg-white border border-[#dce4ed] rounded-[12px] h-[48px] px-3.5 text-[13px] text-[#5e7085] focus:text-[#172b43] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 outline-none"
                />
              </div>

              <p className="text-[12px] text-[#5e7085] leading-relaxed">
                Antes de enviar, buscamos reportes cercanos para no duplicar
                esfuerzos.
              </p>

              <button
                type="submit"
                className="w-full h-[50px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[14px] flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Confirmar ubicación y enviar</span>
              </button>
            </div>
          </form>
        )}

        {/* PASO 3: Reporte recibido */}
        {paso === 3 && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center lg:bg-white lg:border lg:border-[#dce4ed] lg:rounded-2xl lg:p-8 lg:shadow-xs">
            {/* Columna izquierda: Confirmación y acciones */}
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
                y recibir avisos de cada actualización.
              </p>

              <div className="hidden md:flex flex-col gap-3 pt-1">
                <Link
                  href={`/mis-reportes/${folioGenerado}`}
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

            {/* Columna derecha: Tarjeta del folio */}
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
                  {folioGenerado}
                </p>

                <p className="text-[14px] font-bold text-[#172b43]">
                  {problemaActivo.id === 'fuga'
                    ? 'Fuga de agua en vía pública'
                    : problemaActivo.titulo}
                </p>

                <p className="text-[12px] text-[#5e7085]">
                  {direccion}, Torreón, Coahuila
                </p>

                <div className="mt-2 bg-[#edf5ff] rounded-[14px] p-4 flex items-center gap-3 text-left">
                  <Clock className="w-6 h-6 text-[#155ead] shrink-0" />
                  <div>
                    <p className="text-[16px] font-bold text-[#0e315a]">
                      {problemaActivo.sla}
                    </p>
                    <p className="text-[11px] text-[#5e7085]">
                      Plazo estimado de atención · {problemaActivo.dependencia}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex md:hidden flex-col gap-3">
                <Link
                  href={`/mis-reportes/${folioGenerado}`}
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
          </div>
        )}
      </main>

      {/* MODAL DE DEDUPLICACIÓN GEOGRÁFICA */}
      {showDeduplicacion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dedup-title"
          className="fixed inset-0 z-50 bg-[#0e315a]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[24px] max-w-[420px] w-full p-6 shadow-xl flex flex-col gap-4 relative">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-[12px] bg-[#fef7e6] flex items-center justify-center text-[#b45309]">
                <MapPin className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowDeduplicacion(false)}
                aria-label="Cerrar aviso"
                className="p-1 rounded-lg text-[#5e7085] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider uppercase text-[#b45309]">
                DEDUPLICACIÓN GEOGRÁFICA
              </p>
              <h2
                id="dedup-title"
                className="text-[22px] font-bold leading-tight text-[#172b43]"
              >
                Alguien ya reportó una falla cerca
              </h2>
              <p className="text-[13px] text-[#5e7085] leading-relaxed">
                Encontramos un reporte similar a 28 m de tu ubicación, dentro
                del radio de 35 m.
              </p>
            </div>

            <div className="bg-[#f3f6fa] border border-[#dce4ed] rounded-[16px] p-3.5 space-y-2.5">
              <div className="rounded-[10px] overflow-hidden h-[120px] w-full bg-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/figma-ciudadano/fuga-juarez.png"
                  alt="Fuga de agua reportada previamente"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-[#155ead]">
                  SIM-2026-0842 · SIMAS
                </p>
                <p className="text-[14px] font-bold text-[#172b43]">
                  Fuga de agua en vía pública
                </p>
                <p className="text-[12px] text-[#5e7085]">
                  Av. Juárez y Calz. Colón · {votosCercanos} votos
                </p>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-semibold text-[#155ead]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#155ead]" />
                  En proceso
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSumarVoto}
                className="w-full h-[48px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Sí, sigue ahí (+1 voto)</span>
              </button>

              <button
                type="button"
                onClick={handleReportarDiferente}
                className="w-full h-[48px] bg-white hover:bg-slate-50 border border-[#dce4ed] text-[#155ead] font-semibold text-[14px] rounded-[12px] flex items-center justify-center transition-colors cursor-pointer"
              >
                Reportar diferente
              </button>
            </div>

            <p className="text-center text-[11px] text-[#5e7085] leading-relaxed">
              Tu confirmación suma apoyo al folio existente; no genera otro
              reporte.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
