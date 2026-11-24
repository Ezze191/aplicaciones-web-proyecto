'use client';

import React from 'react';
import Image from 'next/image';

export type DepartmentCode = 'SIM' | 'OLA' | 'OBP' | string;

interface DepartmentLogoMeta {
  src: string;
  alt: string;
  shortName: string;
}

const DEPARTMENT_LOGOS: Record<string, DepartmentLogoMeta> = {
  SIM: {
    src: '/images/departments/simas-logo.png',
    alt: 'Logo SIMAS Torreón',
    shortName: 'SIMAS',
  },
  SIMAS: {
    src: '/images/departments/simas-logo.png',
    alt: 'Logo SIMAS Torreón',
    shortName: 'SIMAS',
  },
  OLA: {
    src: '/images/departments/la-ola-logo.png',
    alt: 'Logo La OLA',
    shortName: 'La OLA',
  },
  OBP: {
    src: '/images/departments/obras-publicas-logo.png',
    alt: 'Logo Dirección de Obras Públicas',
    shortName: 'Obras Públicas',
  },
};

export function inferDepartmentCodeFromEmail(
  email?: string | null,
): 'SIM' | 'OLA' | 'OBP' | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@simas.com.mx') || normalized.endsWith('@operador.simas.com.mx')) {
    return 'SIM';
  }
  if (normalized.endsWith('@laola.com.mx') || normalized.endsWith('@operador.laola.com.mx')) {
    return 'OLA';
  }
  if (
    normalized.endsWith('@obraspublicas.com.mx') ||
    normalized.endsWith('@operador.obraspublicas.com.mx')
  ) {
    return 'OBP';
  }
  return null;
}

export function getDepartmentLogoMeta(
  code?: string | null,
): DepartmentLogoMeta | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  return DEPARTMENT_LOGOS[key] ?? null;
}

interface DepartmentLogoProps {
  code?: string | null;
  /**
   * - `xs`: 22px de alto (chips de filtro / botones compactos)
   * - `sm`: 30px de alto (tarjetas / badges)
   * - `md`: 42px de alto (headers de paneles)
   * - `lg`: 54px de alto (encabezados destacados / hero)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Envuelve el logo en un contenedor blanco limpio para máximo contraste */
  framed?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', { box: string; img: string; sizes: string }> = {
  xs: {
    box: 'h-6 min-w-8 px-1.5 rounded-md',
    img: 'h-4 w-auto max-w-[46px]',
    sizes: '48px',
  },
  sm: {
    box: 'h-8 min-w-11 px-2 rounded-lg',
    img: 'h-5.5 w-auto max-w-[68px]',
    sizes: '72px',
  },
  md: {
    box: 'h-10 sm:h-11 min-w-14 px-2.5 rounded-xl',
    img: 'h-7 sm:h-8 w-auto max-w-[92px]',
    sizes: '96px',
  },
  lg: {
    box: 'h-14 min-w-20 px-3 rounded-2xl',
    img: 'h-10 w-auto max-w-[128px]',
    sizes: '132px',
  },
};

export const DepartmentLogo: React.FC<DepartmentLogoProps> = ({
  code,
  size = 'md',
  framed = true,
  className = '',
}) => {
  const meta = getDepartmentLogoMeta(code);
  if (!meta) return null;

  const cfg = SIZE_CLASSES[size];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${
        framed
          ? 'bg-white border border-[#dce4ed] shadow-xs'
          : ''
      } ${cfg.box} ${className}`}
      title={meta.shortName}
    >
      <Image
        src={meta.src}
        alt={meta.alt}
        width={160}
        height={80}
        sizes={cfg.sizes}
        className={`${cfg.img} object-contain select-none`}
        priority={size === 'md' || size === 'lg'}
      />
    </div>
  );
};
