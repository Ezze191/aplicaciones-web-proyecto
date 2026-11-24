'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { apiFetch, AppNotification, TOKEN_STORAGE_KEY } from '../lib/api';

interface NotificationBellProps {
  className?: string;
}

function getTypeStyle(type?: string): { label: string; badgeClass: string } {
  switch (type) {
    case 'NEW_REPORT':
      return {
        label: 'Nuevo reporte',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'REPORT_ASSIGNED':
    case 'CREW_ASSIGNED':
      return {
        label: 'Asignación',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'REPORT_IN_PROCESS':
    case 'STATUS_CHANGE':
      return {
        label: 'Seguimiento',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'REPORT_RESOLVED':
      return {
        label: 'Resuelto',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'REPORT_REJECTED':
      return {
        label: 'Rechazado',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'REPORT_UPVOTE':
      return {
        label: 'Confirmación',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'CREW_CREATED':
    case 'CREW_UPDATED':
      return {
        label: 'Flotilla',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      };
    default:
      return {
        label: 'Aviso',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearing, setClearing] = useState(false);

  const loadNotifications = async () => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return;
    try {
      const data = await apiFetch<{
        items: AppNotification[];
        unreadCount: number;
      }>('/notifications', { skipAuthRedirect: true });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently ignore when unauthenticated or offline
    }
  };

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => void loadNotifications(), 20000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
        skipAuthRedirect: true,
      });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', {
        method: 'PATCH',
        skipAuthRedirect: true,
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleDismissOne = async (
    e: React.MouseEvent,
    notif: AppNotification,
  ) => {
    e.stopPropagation();
    try {
      await apiFetch(`/notifications/${notif.id}/dismiss`, {
        method: 'PATCH',
        skipAuthRedirect: true,
      });
      setItems((prev) => prev.filter((n) => n.id !== notif.id));
      if (!notif.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // ignore
    }
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    setClearing(true);
    try {
      await apiFetch('/notifications/clear', {
        method: 'PATCH',
        skipAuthRedirect: true,
      });
      setItems([]);
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void loadNotifications();
        }}
        aria-label="Centro de notificaciones"
        className="relative p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#be313b] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0e315a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-[320px] sm:w-[390px] bg-white text-[#172b43] rounded-[16px] shadow-2xl border border-[#dce4ed] z-50 overflow-hidden">
            <div className="px-4 py-3 bg-[#f3f6fa] border-b border-[#dce4ed] flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-[13px] text-[#0e315a]">
                  Notificaciones
                </h3>
                <p className="text-[11px] text-[#5e7085]">
                  {unreadCount} sin leer · {items.length} en bandeja
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    title="Marcar todas como vistas"
                    className="text-[11px] font-semibold text-[#155ead] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Vistas</span>
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    disabled={clearing}
                    onClick={() => void handleClearAll()}
                    title="Limpiar bandeja permanentemente"
                    className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Limpiar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 text-[#5e7085] hover:text-[#172b43] cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#5e7085]">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                items.map((n) => {
                  const typeMeta = getTypeStyle(n.type);
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && void handleMarkRead(n.id)}
                      className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-1.5 group ${
                        !n.isRead ? 'bg-[#edf5ff]/55' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${typeMeta.badgeClass}`}
                          >
                            {typeMeta.label}
                          </span>
                          <span className="font-bold text-[12px] text-[#0e315a] truncate">
                            {n.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.isRead && (
                            <span className="size-2 rounded-full bg-[#155ead]" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => void handleDismissOne(e, n)}
                            title="Quitar notificación"
                            aria-label="Quitar notificación"
                            className="p-0.5 rounded text-[#8ea0b5] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#5e7085] leading-snug">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-[#8ea0b5]">
                        {new Date(n.createdAt).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
