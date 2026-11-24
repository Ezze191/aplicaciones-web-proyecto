'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  getOfflineReportsCount,
  syncOfflineReports,
} from '../lib/offlineQueue';

export const PwaManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const refreshQueue = async () => {
      const count = await getOfflineReportsCount();
      setPendingCount(count);
      if (navigator.onLine && count > 0) {
        const res = await syncOfflineReports();
        if (res.synced > 0) {
          setPendingCount(await getOfflineReportsCount());
          setSyncNotice(
            `${res.synced} reporte(s) en cola sincronizados (${res.folios.join(', ')})`,
          );
          setTimeout(() => setSyncNotice(null), 5000);
        }
      }
    };

    void refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      void refreshQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueUpdated = () => {
      void refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('siu-offline-updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('siu-offline-updated', handleQueueUpdated);
    };
  }, []);

  if (isOnline && pendingCount === 0 && !syncNotice) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50">
      {!isOnline && (
        <div className="bg-[#0e315a] text-white px-4 py-3 rounded-xl shadow-xl border border-white/15 flex items-center gap-3 text-xs">
          <WifiOff className="size-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold">Modo sin conexión activo (PWA)</p>
            <p className="text-[#c5d9ed]">
              Los reportes que captures se guardarán en IndexedDB
              {pendingCount > 0 ? ` (${pendingCount} en cola)` : ''}.
            </p>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="bg-[#155ead] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs">
          <RefreshCw className="size-4 animate-spin shrink-0" />
          <span>Sincronizando {pendingCount} reporte(s) pendientes...</span>
        </div>
      )}

      {syncNotice && (
        <div className="bg-[#18734a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}
    </div>
  );
};
