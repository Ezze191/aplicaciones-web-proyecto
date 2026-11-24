'use client';

import React from 'react';
import { SiuLogo } from './SiuLogo';

export interface AppLoaderProps {
  /** Título principal mostrado debajo del indicador */
  title?: string;
  /** Subtítulo opcional con contexto de la operación */
  subtitle?: string;
  /**
   * - `fullscreen`: Pantalla completa centrada (transiciones de panel / validación de sesión)
   * - `overlay`: Capa semitransparente con blur sobre la vista actual (ej. enviando login)
   * - `inline`: Indicador compacto reutilizable dentro de tarjetas, tablas o secciones
   */
  variant?: 'fullscreen' | 'overlay' | 'inline';
  /** Tamaño para la variante `inline` */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const INLINE_RING_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'size-5 border-2',
  md: 'size-8 border-[3px]',
  lg: 'size-11 border-[3px]',
};

export const AppLoader: React.FC<AppLoaderProps> = ({
  title = 'Cargando plataforma...',
  subtitle = 'Sincronizando información en tiempo real',
  variant = 'fullscreen',
  size = 'md',
  className = '',
}) => {
  if (variant === 'inline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-3 py-6 text-[#5e7085] ${className}`}
      >
        <span
          className={`inline-block rounded-full border-[#dce4ed] border-t-[#0e315a] animate-spin shrink-0 ${INLINE_RING_SIZE[size]}`}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#172b43] leading-tight">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-[#5e7085] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  const wrapperClasses =
    variant === 'overlay'
      ? 'fixed inset-0 z-[100] flex items-center justify-center bg-[#0e315a]/30 backdrop-blur-[3px] px-4'
      : 'min-h-screen w-full flex items-center justify-center bg-[#f3f6fa] px-4';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${wrapperClasses} ${className}`}
    >
      <div className="w-full max-w-[360px] bg-white border border-[#dce4ed] rounded-2xl shadow-[0_18px_45px_-18px_rgba(14,49,90,0.28)] p-7 flex flex-col items-center text-center">
        {/* Spinner concéntrico con emblema institucional */}
        <div className="relative flex items-center justify-center size-20 mb-5">
          <span className="absolute inset-0 rounded-full border-[3px] border-[#e6edf5]" />
          <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#0e315a] border-r-[#1d63b8] animate-spin" />
          <span className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#0284c7]/45 animate-spin [animation-direction:reverse] [animation-duration:1.8s]" />
          <div className="relative z-10 flex items-center justify-center rounded-xl bg-white p-1 shadow-xs">
            <SiuLogo variant="light" size="md" />
          </div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1d63b8] mb-1">
          S.I.U. Torreón Alerta
        </p>
        <h2 className="text-base font-bold text-[#172b43] leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#5e7085] mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Barra de progreso indeterminada */}
        <div className="w-full h-1.5 bg-[#eaf0f7] rounded-full overflow-hidden mt-5">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#0e315a] via-[#1d63b8] to-[#0284c7] animate-siu-loader-bar" />
        </div>
      </div>
    </div>
  );
};
