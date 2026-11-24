'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { AuthUser } from '../lib/api';
import { getStoredSession, logoutSession } from '../lib/auth';
import { NotificationBell } from './NotificationBell';
import { SiuLogo } from './SiuLogo';

interface CiudadanoHeaderProps {
  onBellClick?: () => void;
  userOverride?: AuthUser | null;
}

export function CiudadanoHeader({ userOverride }: CiudadanoHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(userOverride ?? null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (userOverride) {
      setUser(userOverride);
      return;
    }
    const { user: stored } = getStoredSession();
    setUser(stored);
  }, [userOverride]);

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/auth/login');
  };

  const navItems = [
    { href: '/dashboard-ciudadano', label: 'Mapa', icon: MapIcon },
    { href: '/mis-reportes', label: 'Mis reportes', icon: ClipboardList },
    { href: '/reportar', label: 'Nuevo reporte', icon: Plus },
  ];

  return (
    <header className="bg-[#0e315a] text-white w-full shrink-0 border-b border-white/10 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[76px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú lateral"
            className="md:hidden p-1.5 -ml-1 rounded-lg text-white/90 hover:bg-white/10 cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

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
        </div>

        {/* Desktop Nav */}
        <nav
          aria-label="Navegación ciudadana"
          className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-white text-[#0e315a] font-semibold shadow-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && <NotificationBell />}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="hidden sm:block text-right">
                <p className="text-[12px] font-semibold leading-tight">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-[#ccdbed] leading-tight">
                  Ciudadano · Torreón
                </p>
              </div>
              <div className="size-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                <User className="size-4 text-white" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="hidden sm:flex p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a2547] border-t border-white/10 px-4 py-3 flex flex-col gap-1.5">
          {user && (
            <div className="px-3 py-2 mb-1 rounded-lg bg-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[11px] text-[#afcef0]">{user.email}</p>
              </div>
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold ${
                  active ? 'bg-white text-[#0e315a]' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/auth/login#rastreo"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white/90 hover:bg-white/10"
          >
            <Search className="size-4" />
            <span>Rastrear por folio</span>
          </Link>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-200 hover:bg-white/10 text-left cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
