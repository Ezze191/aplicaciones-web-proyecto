'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, CircleUserRound } from 'lucide-react';
import { SiuLogo } from './SiuLogo';

interface CiudadanoHeaderProps {
  onBellClick?: () => void;
}

export function CiudadanoHeader({ onBellClick }: CiudadanoHeaderProps) {
  return (
    <header className="bg-[#0e315a] text-white h-[76px] px-4 sm:px-8 flex items-center justify-between shrink-0 border-b border-white/10">
      <Link
        href="/dashboard-ciudadano"
        className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
      >
        <SiuLogo variant="dark" />
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white text-[17px] tracking-tight">
            S.I.U
          </span>
          <span className="text-[10px] text-[#afcef0] tracking-wider uppercase">
            Plataforma Municipal
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBellClick}
          aria-label="Notificaciones"
          className="p-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
        </button>
        <Link
          href="/mis-reportes"
          aria-label="Mis reportes"
          className="p-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors"
        >
          <CircleUserRound className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
