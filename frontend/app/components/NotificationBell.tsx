'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { apiFetch, AppNotification, TOKEN_STORAGE_KEY } from '../lib/api';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    const timer = setInterval(() => void loadNotifications(), 30000);
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
          <div className="absolute right-0 mt-2 w-[310px] sm:w-[360px] bg-white text-[#172b43] rounded-[16px] shadow-2xl border border-[#dce4ed] z-50 overflow-hidden">
            <div className="px-4 py-3 bg-[#f3f6fa] border-b border-[#dce4ed] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[13px] text-[#0e315a]">
                  Notificaciones
                </h3>
                <p className="text-[11px] text-[#5e7085]">
                  {unreadCount} sin leer
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-[#155ead] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Marcar todo</span>
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

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#5e7085]">
                  No tienes notificaciones registradas todavía.
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.isRead && void handleMarkRead(n.id)}
                    className={`w-full text-left p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-1 ${
                      !n.isRead ? 'bg-[#edf5ff]/55' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[12px] text-[#0e315a]">
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="size-2 rounded-full bg-[#155ead] shrink-0" />
                      )}
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
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
