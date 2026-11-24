'use client';

import { apiFetch, ApiReport, uploadEvidenceFile } from './api';

const DB_NAME = 'siu_torreon_offline';
const STORE_NAME = 'pending_reports';

export interface OfflineReportDraft {
  id: string;
  categoryId: string;
  departmentId?: string;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  lat: number;
  lng: number;
  addressReference: string;
  description: string;
  imageBlob: Blob;
  imageName: string;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineReport(
  draft: Omit<OfflineReportDraft, 'id' | 'createdAt'>,
): Promise<string> {
  const db = await openDb();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: OfflineReportDraft = {
    ...draft,
    id,
    createdAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return id;
}

export async function getOfflineReportsCount(): Promise<number> {
  try {
    const db = await openDb();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function syncOfflineReports(): Promise<{
  synced: number;
  folios: string[];
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, folios: [] };
  }

  let items: OfflineReportDraft[] = [];
  try {
    const db = await openDb();
    items = await new Promise<OfflineReportDraft[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as OfflineReportDraft[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { synced: 0, folios: [] };
  }

  if (items.length === 0) return { synced: 0, folios: [] };

  const syncedFolios: string[] = [];
  const db = await openDb();

  for (const item of items) {
    try {
      const file = new File([item.imageBlob], item.imageName || 'offline.webp', {
        type: item.imageBlob.type || 'image/webp',
      });
      const uploaded = await uploadEvidenceFile(file);
      const created = await apiFetch<ApiReport>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: item.categoryId,
          departmentId: item.departmentId,
          riskLevel: item.riskLevel,
          lat: item.lat,
          lng: item.lng,
          addressReference: item.addressReference,
          description: item.description,
          imageUrl: uploaded.url,
        }),
      });

      syncedFolios.push(created.folio);

      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(item.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Stop on network/auth failure so remaining items stay queued
      break;
    }
  }

  return { synced: syncedFolios.length, folios: syncedFolios };
}
