'use client';

import React from 'react';
import {
  BarChart3,
  Kanban,
  LogOut,
  Truck,
  User,
} from 'lucide-react';
import { AuthUser, DepartmentItem } from '../lib/api';
import {
  DepartmentLogo,
  inferDepartmentCodeFromEmail,
} from './DepartmentLogo';
import { NotificationBell } from './NotificationBell';
import { SiuLogo } from './SiuLogo';

export type AdminSectionTab = 'kanban' | 'flotillas' | 'analitica';

interface HeaderProps {
  currentUser: AuthUser;
  departments: DepartmentItem[];
  selectedDepartmentId: string;
  onSelectDepartment: (departmentId: string) => void;
  activeSection: AdminSectionTab;
  onSelectSection: (section: AdminSectionTab) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  departments,
  selectedDepartmentId,
  onSelectDepartment,
  activeSection,
  onSelectSection,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'ROLE_ADMIN';
  const activeDept =
    departments.find((d) => d.id === selectedDepartmentId) ?? null;
  const activeDeptCode =
    activeDept?.code ??
    currentUser.departmentCode ??
    inferDepartmentCodeFromEmail(currentUser.email);

  return (
    <header className="w-full bg-[#0e315a] text-white shadow-md shrink-0 sticky top-0 z-30">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[74px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {activeDeptCode ? (
            <DepartmentLogo
              code={activeDeptCode}
              size="md"
              className="border-white/25"
            />
          ) : (
            <SiuLogo variant="dark" />
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-[15px] sm:text-[18px] leading-tight text-white tracking-tight truncate">
              {activeDept ? activeDept.name : 'S.I.U · Todas las dependencias'}
            </h1>
            <p className="hidden sm:block text-[#c5d9ed] text-[11px] leading-tight truncate">
              Centro de atención y operación urbana · Torreón
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <nav className="hidden lg:flex items-center bg-black/25 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => onSelectSection('kanban')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeSection === 'kanban'
                ? 'bg-white text-[#0e315a] shadow font-semibold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Kanban className="size-4" />
            <span>Tablero Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('flotillas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeSection === 'flotillas'
                ? 'bg-white text-[#0e315a] shadow font-semibold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Truck className="size-4" />
            <span>Flotillas</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('analitica')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
              activeSection === 'analitica'
                ? 'bg-white text-[#0e315a] shadow font-semibold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="size-4" />
            <span>Analítica BI</span>
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex bg-[#eaf6ef] text-[#18734a] items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18734a] opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-[#18734a]" />
            </span>
            <span>Operación en línea</span>
          </div>

          <NotificationBell />

          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            <div className="hidden xl:block text-right">
              <p className="text-[12px] font-semibold text-white leading-tight">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-[10px] text-white/75 leading-tight">
                {isAdmin
                  ? 'Administrador General'
                  : `Supervisor · ${currentUser.departmentCode ?? 'Dependencia'}`}
              </p>
            </div>
            <div className="size-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
              <User className="size-4" />
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-barra: Dependencias (para ROLE_ADMIN) + Tabs móviles */}
      <div className="bg-black/20 border-t border-white/10">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 py-2 flex flex-wrap items-center justify-between gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => onSelectDepartment('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
                  selectedDepartmentId === 'ALL'
                    ? 'bg-white text-[#0e315a]'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Todas
              </button>
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDepartment(d.id)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-all ${
                    selectedDepartmentId === d.id
                      ? 'bg-white text-[#0e315a] shadow-xs'
                      : 'text-white/85 hover:bg-white/10'
                  }`}
                >
                  <DepartmentLogo code={d.code} size="xs" />
                  <span>{d.code}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mobile / Tablet Section Switcher */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onSelectSection('kanban')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                activeSection === 'kanban'
                  ? 'bg-white text-[#0e315a]'
                  : 'text-white/85 bg-white/5'
              }`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('flotillas')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                activeSection === 'flotillas'
                  ? 'bg-white text-[#0e315a]'
                  : 'text-white/85 bg-white/5'
              }`}
            >
              Flotillas
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('analitica')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                activeSection === 'analitica'
                  ? 'bg-white text-[#0e315a]'
                  : 'text-white/85 bg-white/5'
              }`}
            >
              Analítica BI
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
