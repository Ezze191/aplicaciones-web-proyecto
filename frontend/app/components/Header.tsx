'use client';

import React from 'react';
import { Droplets, Waves, Hammer, Bell, User } from 'lucide-react';
import { DependencyConfig, DependencyKey } from '../types/dashboard';

interface HeaderProps {
  currentDependency: DependencyConfig;
  allDependencies: Record<string, DependencyConfig>;
  onSelectDependency: (key: DependencyKey) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentDependency,
  allDependencies,
  onSelectDependency,
  unreadCount = 2,
}) => {
  const renderIcon = (iconName: string, className = 'size-5') => {
    switch (iconName) {
      case 'droplets':
        return <Droplets className={className} />;
      case 'wave':
        return <Waves className={className} />;
      case 'hammer':
        return <Hammer className={className} />;
      default:
        return <Droplets className={className} />;
    }
  };

  return (
    <header
      className={`w-full text-white transition-colors duration-300 shadow-md shrink-0 ${currentDependency.headerBgClass}`}
    >
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[74px] flex items-center justify-between gap-3">
        {/* Left: Department Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center justify-center size-9 sm:size-[38px] rounded-xl bg-white/10 text-white shrink-0 shadow-inner">
            {renderIcon(currentDependency.iconName, 'size-4.5 sm:size-5')}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-[15px] sm:text-[18px] lg:text-[19px] leading-tight text-white tracking-tight truncate">
              {currentDependency.fullName}
            </h1>
            <p className="hidden xs:block text-[#c5d9ed] text-[10px] sm:text-[11px] leading-tight opacity-90 truncate">
              {currentDependency.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Dependency Switcher Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center bg-black/25 p-1 rounded-xl border border-white/10 backdrop-blur-sm shrink-0">
          {Object.values(allDependencies).map((dep) => {
            const isSelected = dep.key === currentDependency.key;
            return (
              <button
                key={dep.key}
                onClick={() => onSelectDependency(dep.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#0e315a] shadow font-semibold scale-[1.02]'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {renderIcon(dep.iconName, 'size-3.5')}
                <span>{dep.shortName}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Operational Status & User Session */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          {/* Status pill */}
          <div className="bg-[#eaf6ef] text-[#18734a] flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-[8px] shrink-0 text-[10px] sm:text-[11px] font-semibold border border-[#c1e5cf]/40 shadow-xs">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18734a] opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-[#18734a]"></span>
            </span>
            <span className="hidden sm:inline">Operación en línea</span>
            <span className="sm:hidden">En línea</span>
          </div>

          {/* Notifications */}
          <button
            title="Notificaciones operativas"
            className="relative p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Bell className="size-4.5 sm:size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-[#be313b] ring-2 ring-[#0e315a]" />
            )}
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-white/15">
            <div className="hidden lg:block text-right">
              <p className="text-[12px] font-medium text-white leading-tight">
                Laura Méndez
              </p>
              <p className="text-[10px] text-white/70 leading-tight">
                Supervisora de Operaciones
              </p>
            </div>
            <div className="size-8 sm:size-[32px] rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <User className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Dependency Switcher (Horizontal scrollable bar) */}
      <div className="md:hidden flex items-center justify-between gap-1.5 px-3 py-2 border-t border-white/10 bg-black/15 overflow-x-auto">
        {Object.values(allDependencies).map((dep) => {
          const isSelected = dep.key === currentDependency.key;
          return (
            <button
              key={dep.key}
              onClick={() => onSelectDependency(dep.key)}
              className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-[#0e315a] shadow font-bold'
                  : 'text-white/85 bg-white/5 hover:bg-white/10'
              }`}
            >
              {renderIcon(dep.iconName, 'size-3.5')}
              <span className="truncate">{dep.shortName}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
