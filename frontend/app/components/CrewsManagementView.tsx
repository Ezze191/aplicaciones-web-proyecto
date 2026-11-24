'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  Circle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  PenTool,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  apiFetch,
  ApiError,
  AuthUser,
  CrewView,
  CrewWorkerItem,
  DepartmentItem,
} from '../lib/api';
import { DepartmentLogo } from './DepartmentLogo';

const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false },
);

interface CrewsManagementViewProps {
  crews: CrewView[];
  departments: DepartmentItem[];
  currentUser: AuthUser;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

function getLockedOperatorDomain(deptCode?: string | null): string {
  switch ((deptCode || '').toUpperCase()) {
    case 'SIM':
      return '@operador.simas.com.mx';
    case 'OLA':
      return '@operador.laola.com.mx';
    case 'OBP':
      return '@operador.obraspublicas.com.mx';
    default:
      return '@operador.torreon.gob.mx';
  }
}

function buildCirclePolygon(
  center: { lat: number; lng: number },
  radiusMeters: number,
  steps = 32,
): Array<{ lat: number; lng: number }> {
  const earthRadius = 6378137;
  const latRad = (center.lat * Math.PI) / 180;
  const points: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (2 * Math.PI * i) / steps;
    const dLat = (radiusMeters * Math.cos(angle)) / earthRadius;
    const dLng =
      (radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos(latRad));
    points.push({
      lat: Number((center.lat + (dLat * 180) / Math.PI).toFixed(6)),
      lng: Number((center.lng + (dLng * 180) / Math.PI).toFixed(6)),
    });
  }
  return points;
}

function generateSecurePassword(deptCode?: string | null): string {
  const prefix =
    deptCode === 'SIM'
      ? 'Simas'
      : deptCode === 'OLA'
        ? 'LaOla'
        : deptCode === 'OBP'
          ? 'Obras'
          : 'Oper';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}2026#${suffix}`;
}

export const CrewsManagementView: React.FC<CrewsManagementViewProps> = ({
  crews,
  departments,
  currentUser,
  onRefresh,
  onNotify,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Padrón de trabajadores de la dependencia (20 empleados pre-registrados por dependencia)
  const [workersCatalog, setWorkersCatalog] = useState<CrewWorkerItem[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Formulario nueva flotilla
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState(
    currentUser.departmentId ?? departments[0]?.id ?? '',
  );
  const [leaderFirstName, setLeaderFirstName] = useState('');
  const [leaderLastName, setLeaderLastName] = useState('');
  const [leaderUsername, setLeaderUsername] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderPassword, setLeaderPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [drawMode, setDrawMode] = useState<'circle' | 'polygon'>('circle');
  const [crewMapCenter, setCrewMapCenter] = useState<{
    lat: number;
    lng: number;
  }>({ lat: 25.5428, lng: -103.4068 });
  const [crewMapZoom, setCrewMapZoom] = useState<number>(12);
  const [circleCenter, setCircleCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState<number>(1000);
  const [circleHistory, setCircleHistory] = useState<
    Array<{ center: { lat: number; lng: number } | null; radiusMeters: number }>
  >([]);
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ lat: number; lng: number }>
  >([]);

  // Modal de gestionar trabajadores en una flotilla existente
  const [editingWorkersCrew, setEditingWorkersCrew] = useState<CrewView | null>(
    null,
  );
  const [editWorkerIds, setEditWorkerIds] = useState<string[]>([]);
  const [editWorkerSearch, setEditWorkerSearch] = useState('');
  const [savingWorkers, setSavingWorkers] = useState(false);

  // Credenciales recién creadas para copiar fácilmente
  const [createdCredentials, setCreatedCredentials] = useState<{
    crewName: string;
    email: string;
    password: string;
  } | null>(null);

  const effectiveDepartmentId =
    currentUser.role === 'ROLE_SUPERVISOR'
      ? currentUser.departmentId ?? ''
      : departmentId || departments[0]?.id || '';

  const activeDepartment = useMemo(
    () => departments.find((d) => d.id === effectiveDepartmentId) ?? null,
    [departments, effectiveDepartmentId],
  );

  const lockedDomain = getLockedOperatorDomain(
    activeDepartment?.code ?? currentUser.departmentCode,
  );

  const loadWorkersCatalog = useCallback(
    async (deptId?: string) => {
      const targetDept =
        currentUser.role === 'ROLE_SUPERVISOR'
          ? currentUser.departmentId
          : deptId || effectiveDepartmentId;
      if (!targetDept) return;
      setLoadingWorkers(true);
      try {
        const list = await apiFetch<CrewWorkerItem[]>(
          `/crews/workers?departmentId=${encodeURIComponent(targetDept)}`,
        );
        setWorkersCatalog(list);
      } catch {
        setWorkersCatalog([]);
      } finally {
        setLoadingWorkers(false);
      }
    },
    [currentUser.departmentId, currentUser.role, effectiveDepartmentId],
  );

  useEffect(() => {
    if (effectiveDepartmentId) {
      void loadWorkersCatalog(effectiveDepartmentId);
    }
  }, [effectiveDepartmentId, loadWorkersCatalog]);

  const filteredCreateWorkers = useMemo(() => {
    const q = workerSearch.trim().toLowerCase();
    return workersCatalog.filter((w) => {
      if (!q) return true;
      return (
        w.employeeCode.toLowerCase().includes(q) ||
        `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q)
      );
    });
  }, [workersCatalog, workerSearch]);

  const filteredEditWorkers = useMemo(() => {
    const q = editWorkerSearch.trim().toLowerCase();
    const deptId = editingWorkersCrew?.departmentId;
    return workersCatalog.filter((w) => {
      if (deptId && w.departmentId !== deptId) return false;
      if (!q) return true;
      return (
        w.employeeCode.toLowerCase().includes(q) ||
        `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q)
      );
    });
  }, [workersCatalog, editWorkerSearch, editingWorkersCrew]);

  const toggleWorkerSelection = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleActive = async (crew: CrewView) => {
    try {
      await apiFetch(`/crews/${crew.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !crew.isActive }),
      });
      onNotify(
        'success',
        `${crew.name} marcada como ${!crew.isActive ? 'Activa' : 'Inactiva'}.`,
      );
      await onRefresh();
    } catch (err) {
      onNotify(
        'error',
        err instanceof ApiError ? err.message : 'Error al actualizar cuadrilla.',
      );
    }
  };

  const handleOpenCreateModal = () => {
    const generated = generateSecurePassword(
      activeDepartment?.code ?? currentUser.departmentCode,
    );
    setLeaderPassword(generated);
    setSelectedWorkerIds([]);
    setWorkerSearch('');
    setDrawMode('circle');
    setCircleCenter(null);
    setCircleRadiusMeters(1000);
    setCircleHistory([]);
    setPolygonPoints([]);
    setCrewMapCenter({ lat: 25.5428, lng: -103.4068 });
    setCrewMapZoom(12);
    setIsCreateOpen(true);
    void loadWorkersCatalog(effectiveDepartmentId);
  };

  const updateCircleGeofence = (
    nextCenter: { lat: number; lng: number } | null,
    nextRadius: number,
  ) => {
    setCircleHistory((prev) => [
      ...prev.slice(-19),
      { center: circleCenter, radiusMeters: circleRadiusMeters },
    ]);
    setCircleCenter(nextCenter);
    setCircleRadiusMeters(nextRadius);
  };

  const handleUndoGeofence = () => {
    if (drawMode === 'circle') {
      if (circleHistory.length === 0) {
        setCircleCenter(null);
        return;
      }
      const previous = circleHistory[circleHistory.length - 1];
      setCircleHistory((prev) => prev.slice(0, -1));
      setCircleCenter(previous.center);
      setCircleRadiusMeters(previous.radiusMeters);
    } else {
      setPolygonPoints((p) => p.slice(0, -1));
    }
  };

  const handleClearGeofence = () => {
    if (drawMode === 'circle') {
      if (circleCenter) {
        setCircleHistory((prev) => [
          ...prev.slice(-19),
          { center: circleCenter, radiusMeters: circleRadiusMeters },
        ]);
      }
      setCircleCenter(null);
    } else {
      setPolygonPoints([]);
    }
  };

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = leaderUsername
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    if (cleanUser.length < 2) {
      onNotify(
        'error',
        'Ingresa un nombre de usuario válido (mínimo 2 caracteres, solo letras, números, puntos o guiones).',
      );
      return;
    }

    if (drawMode === 'polygon' && polygonPoints.length > 0 && polygonPoints.length < 3) {
      onNotify(
        'error',
        'En trazado libre debes marcar al menos 3 puntos en el mapa (o limpiar para usar la zona general).',
      );
      return;
    }

    const finalPolygon =
      drawMode === 'circle'
        ? circleCenter
          ? buildCirclePolygon(circleCenter, circleRadiusMeters, 32)
          : undefined
        : polygonPoints.length >= 3
          ? polygonPoints
          : undefined;

    setSubmitting(true);
    try {
      const created = await apiFetch<CrewView>('/crews', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          departmentId: effectiveDepartmentId,
          polygonCoordinates: finalPolygon,
          leaderFirstName: leaderFirstName.trim(),
          leaderLastName: leaderLastName.trim(),
          leaderUsername: cleanUser,
          leaderPhone: leaderPhone.trim() || undefined,
          leaderPassword,
          workerIds: selectedWorkerIds,
        }),
      });

      setCreatedCredentials({
        crewName: created.name,
        email: created.leader.email,
        password: leaderPassword,
      });

      onNotify(
        'success',
        `Flotilla creada con acceso ${created.leader.email} y ${selectedWorkerIds.length} trabajador(es) asignado(s).`,
      );
      setIsCreateOpen(false);
      setName('');
      setLeaderFirstName('');
      setLeaderLastName('');
      setLeaderUsername('');
      setLeaderPhone('');
      setLeaderPassword('');
      setSelectedWorkerIds([]);
      setCircleCenter(null);
      setCircleHistory([]);
      setPolygonPoints([]);
      await Promise.all([onRefresh(), loadWorkersCatalog(effectiveDepartmentId)]);
    } catch (err) {
      onNotify(
        'error',
        err instanceof ApiError ? err.message : 'No se pudo crear la flotilla.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openManageWorkers = async (crew: CrewView) => {
    setEditingWorkersCrew(crew);
    setEditWorkerIds((crew.workers ?? []).map((w) => w.id));
    setEditWorkerSearch('');
    await loadWorkersCatalog(crew.departmentId);
  };

  const handleSaveCrewWorkers = async () => {
    if (!editingWorkersCrew) return;
    setSavingWorkers(true);
    try {
      await apiFetch(`/crews/${editingWorkersCrew.id}/workers`, {
        method: 'POST',
        body: JSON.stringify({ workerIds: editWorkerIds }),
      });
      onNotify(
        'success',
        `Trabajadores actualizados para ${editingWorkersCrew.name} (${editWorkerIds.length} asignado(s)).`,
      );
      setEditingWorkersCrew(null);
      await Promise.all([
        onRefresh(),
        loadWorkersCatalog(editingWorkersCrew.departmentId),
      ]);
    } catch (err) {
      onNotify(
        'error',
        err instanceof ApiError
          ? err.message
          : 'No se pudieron actualizar los trabajadores.',
      );
    } finally {
      setSavingWorkers(false);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify('success', `${label} copiado al portapapeles.`);
    } catch {
      onNotify('error', 'No se pudo copiar al portapapeles.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado de sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold text-[#0e315a] tracking-tight">
            Flotillas, Accesos de Operador y Trabajadores
          </h2>
          <p className="text-[13px] text-[#5e7085]">
            Registra flotillas, genera sus credenciales de operador ({lockedDomain})
            y asigna trabajadores del padrón de tu dependencia.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-[#155ead] hover:bg-[#0f4a8a] text-white font-semibold text-[13px] px-4 h-11 rounded-[12px] shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          <span>Registrar Nueva Flotilla</span>
        </button>
      </div>

      {/* Banner de credenciales recién creadas */}
      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <KeyRound className="size-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-0.5">
              <p className="font-bold text-sm">
                Acceso creado para {createdCredentials.crewName}
              </p>
              <p>
                Correo operador:{' '}
                <strong className="font-mono">{createdCredentials.email}</strong>
              </p>
              <p>
                Contraseña:{' '}
                <strong className="font-mono">
                  {createdCredentials.password}
                </strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                void handleCopyText(
                  `Correo: ${createdCredentials.email}\nContraseña: ${createdCredentials.password}`,
                  'Acceso de operador',
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Copy className="size-3.5" />
              <span>Copiar acceso</span>
            </button>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="p-2 rounded-xl text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              aria-label="Cerrar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mapa general de polígonos de cobertura */}
      <div className="bg-white border border-[#dce4ed] rounded-[18px] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[#0e315a] flex items-center gap-2">
            <MapPin className="size-4 text-[#155ead]" />
            Zonas de Cobertura Activas ({crews.length})
          </p>
          <span className="text-xs text-[#5e7085]">
            {workersCatalog.length} trabajadores en padrón ·{' '}
            {workersCatalog.filter((w) => !w.crewId).length} disponibles
          </span>
        </div>
        <InteractiveMap
          heightClass="h-[260px] sm:h-[310px]"
          zoom={12}
          polygons={crews
            .filter((c) => c.coverageCoordinates.length >= 3)
            .map((c) => ({
              id: c.id,
              name: `${c.name} (${c.activeServices} activas)`,
              colorHex: c.isActive ? '#155ead' : '#94a3b8',
              coordinates: c.coverageCoordinates,
            }))}
        />
      </div>

      {/* Tarjetas de flotillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {crews.map((crew) => {
          const crewWorkers = crew.workers ?? [];
          return (
            <div
              key={crew.id}
              className={`bg-white border rounded-[16px] p-4 shadow-2xs flex flex-col gap-3 ${
                crew.isActive ? 'border-[#dce4ed]' : 'border-slate-200 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DepartmentLogo code={crew.departmentCode} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[15px] text-[#0e315a] truncate">
                      {crew.name}
                    </h3>
                    <p className="text-[11px] text-[#5e7085] truncate">
                      {crew.departmentCode} · {crew.departmentName}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    crew.isActive
                      ? 'bg-[#eaf6ef] text-[#18734a]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {crew.isActive ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>

              {/* Acceso del operador */}
              <div className="bg-[#f8fafd] border border-[#e6edf5] rounded-xl p-3 flex flex-col gap-1 text-xs">
                <p className="font-semibold text-[#172b43] flex items-center gap-1.5">
                  <UserCheck className="size-3.5 text-[#155ead] shrink-0" />
                  <span>
                    Responsable: {crew.leader.firstName} {crew.leader.lastName}
                  </span>
                </p>
                <p className="text-[#5e7085] font-mono text-[11px] truncate">
                  {crew.leader.email}
                </p>
                {crew.leader.phone && (
                  <p className="text-[#5e7085]">Tel: {crew.leader.phone}</p>
                )}
              </div>

              {/* Trabajadores asignados */}
              <div className="border border-[#e6edf5] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#0e315a] flex items-center gap-1.5">
                    <Users className="size-3.5 text-[#155ead]" />
                    <span>Trabajadores asignados ({crewWorkers.length})</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void openManageWorkers(crew)}
                    className="text-[11px] font-semibold text-[#155ead] hover:underline cursor-pointer"
                  >
                    Gestionar
                  </button>
                </div>

                {crewWorkers.length === 0 ? (
                  <p className="text-[11px] text-[#5e7085]">
                    Sin trabajadores asignados todavía.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {crewWorkers.map((w) => (
                      <span
                        key={w.id}
                        title={`${w.employeeCode} · ${w.position}`}
                        className="inline-flex items-center gap-1 bg-[#edf5ff] text-[#0e315a] border border-[#d4e4f7] px-2 py-0.5 rounded-lg text-[11px] font-medium"
                      >
                        <span className="font-mono text-[10px] text-[#155ead]">
                          {w.employeeCode}
                        </span>
                        <span>
                          {w.firstName.split(' ')[0]} {w.lastName.split(' ')[0]}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-[#5e7085]">Activas</p>
                  <p className="font-bold text-sm text-[#0e315a]">
                    {crew.activeServices}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-[#5e7085]">Semana</p>
                  <p className="font-bold text-sm text-[#18734a]">
                    {crew.completedThisWeek}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-[#5e7085]">Prom. hrs</p>
                  <p className="font-bold text-sm text-[#155ead]">
                    {crew.avgResolutionHours || '—'}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void openManageWorkers(crew)}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold border border-[#cde2ff] bg-[#edf5ff] text-[#155ead] hover:bg-[#dcebff] cursor-pointer"
                >
                  <Users className="size-3.5" />
                  <span>Trabajadores</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleActive(crew)}
                  className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold border cursor-pointer ${
                    crew.isActive
                      ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="size-3.5" />
                  <span>{crew.isActive ? 'Desactivar' : 'Reactivar'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Registrar Nueva Flotilla + Acceso + Selección de Trabajadores */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-[920px] w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-[#dce4ed] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <DepartmentLogo
                  code={activeDepartment?.code ?? currentUser.departmentCode}
                  size="sm"
                />
                <div>
                  <h3 className="font-bold text-lg text-[#0e315a] flex items-center gap-2">
                    <Truck className="size-5 text-[#155ead]" />
                    Registrar Flotilla y Acceso de Operador
                  </h3>
                  <p className="text-xs text-[#5e7085]">
                    El dominio de operador se asigna automáticamente ({lockedDomain})
                    y no puede ser modificado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCrew}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Columna Izquierda: Datos de la flotilla + Credenciales de acceso */}
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-bold text-[#172b43]">
                    Nombre de la flotilla *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Cuadrilla #05 - Sector Norte"
                    className="mt-1 w-full h-10 px-3 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                  />
                </div>

                {currentUser.role === 'ROLE_ADMIN' && (
                  <div>
                    <label className="text-xs font-bold text-[#172b43]">
                      Dependencia *
                    </label>
                    <select
                      value={effectiveDepartmentId}
                      onChange={(e) => {
                        setDepartmentId(e.target.value);
                        setSelectedWorkerIds([]);
                      }}
                      className="mt-1 w-full h-10 px-3 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} · {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-[#172b43]">
                      Nombre del responsable *
                    </label>
                    <input
                      type="text"
                      required
                      value={leaderFirstName}
                      onChange={(e) => setLeaderFirstName(e.target.value)}
                      placeholder="Ej. Roberto"
                      className="mt-1 w-full h-10 px-3 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#172b43]">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      value={leaderLastName}
                      onChange={(e) => setLeaderLastName(e.target.value)}
                      placeholder="Ej. Méndez Lara"
                      className="mt-1 w-full h-10 px-3 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                </div>

                {/* Correo con dominio bloqueado en gris */}
                <div>
                  <label className="text-xs font-bold text-[#172b43] flex items-center gap-1.5">
                    <span>Correo de acceso como operador *</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#5e7085] bg-slate-100 px-1.5 py-0.5 rounded">
                      <Lock className="size-2.5" /> Dominio fijo
                    </span>
                  </label>
                  <div className="mt-1 flex items-stretch rounded-[10px] border border-[#dce4ed] overflow-hidden focus-within:border-[#155ead]">
                    <input
                      type="text"
                      required
                      value={leaderUsername}
                      onChange={(e) =>
                        setLeaderUsername(
                          e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''),
                        )
                      }
                      placeholder="usuario (ej. cuadrilla05)"
                      className="flex-1 min-w-0 h-10 px-3 text-[13px] text-[#172b43] outline-none bg-white"
                    />
                    <span
                      title="Dominio institucional fijo — no editable"
                      className="inline-flex items-center px-3 bg-slate-100 text-[#5e7085] border-l border-[#dce4ed] text-[12px] font-mono select-none shrink-0"
                    >
                      {lockedDomain}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5e7085] mt-1">
                    Solo escribe el nombre de usuario; el sistema iniciará sesión en
                    el panel de operador con{' '}
                    <strong className="font-mono text-[#0e315a]">
                      {(leaderUsername || 'usuario').toLowerCase()}
                      {lockedDomain}
                    </strong>
                    .
                  </p>
                </div>

                {/* Contraseña con botón generador */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#172b43]">
                      Contraseña de acceso (mín. 8 caracteres) *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setLeaderPassword(
                          generateSecurePassword(
                            activeDepartment?.code ??
                              currentUser.departmentCode,
                          ),
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#155ead] hover:underline cursor-pointer"
                    >
                      <RefreshCw className="size-3" />
                      <span>Generar contraseña</span>
                    </button>
                  </div>
                  <div className="mt-1 flex items-center rounded-[10px] border border-[#dce4ed] px-3 h-10 gap-2 focus-within:border-[#155ead]">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={leaderPassword}
                      onChange={(e) => setLeaderPassword(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-[13px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-[#5e7085] hover:text-[#172b43] cursor-pointer"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#172b43]">
                    Teléfono de contacto (opcional)
                  </label>
                  <input
                    type="tel"
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                    placeholder="8711000099"
                    className="mt-1 w-full h-10 px-3 rounded-[10px] border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                  />
                </div>

                {/* Selección de trabajadores del padrón */}
                <div className="border border-[#dce4ed] rounded-xl p-3 bg-[#f8fafd] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#0e315a] flex items-center gap-1.5">
                      <Users className="size-3.5 text-[#155ead]" />
                      <span>
                        Asignar trabajadores ({selectedWorkerIds.length}{' '}
                        seleccionados)
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-[#dce4ed] rounded-lg px-2.5 h-9">
                    <Search className="size-3.5 text-[#5e7085]" />
                    <input
                      type="text"
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      placeholder="Buscar empleado por nombre, código o puesto..."
                      className="w-full text-xs bg-transparent outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                    {loadingWorkers ? (
                      <p className="text-xs text-[#5e7085] py-3 text-center">
                        Cargando padrón de empleados...
                      </p>
                    ) : filteredCreateWorkers.length === 0 ? (
                      <p className="text-xs text-[#5e7085] py-3 text-center">
                        Sin trabajadores disponibles para esta búsqueda.
                      </p>
                    ) : (
                      filteredCreateWorkers.map((w) => {
                        const checked = selectedWorkerIds.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() =>
                              toggleWorkerSelection(w.id, setSelectedWorkerIds)
                            }
                            className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#edf5ff] border-[#155ead]'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#172b43] truncate">
                                <span className="font-mono text-[10px] text-[#155ead] mr-1.5">
                                  {w.employeeCode}
                                </span>
                                {w.firstName} {w.lastName}
                              </p>
                              <p className="text-[10px] text-[#5e7085] truncate">
                                {w.position}
                                {w.crewName ? ` · Actual: ${w.crewName}` : ' · Disponible'}
                              </p>
                            </div>
                            <span
                              className={`size-4 rounded flex items-center justify-center shrink-0 border ${
                                checked
                                  ? 'bg-[#155ead] border-[#155ead] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="size-3" />}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Geocerca circular o trazado libre + buscador de colonia */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#172b43]">
                    Zona de cobertura / Geocerca
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUndoGeofence}
                      disabled={
                        drawMode === 'circle'
                          ? !circleCenter && circleHistory.length === 0
                          : polygonPoints.length === 0
                      }
                      className="text-[11px] font-semibold text-[#5e7085] hover:text-[#172b43] flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <RotateCcw className="size-3" /> Deshacer
                    </button>
                    <button
                      type="button"
                      onClick={handleClearGeofence}
                      disabled={
                        drawMode === 'circle'
                          ? !circleCenter
                          : polygonPoints.length === 0
                      }
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="size-3" /> Limpiar
                    </button>
                  </div>
                </div>

                {/* Selector de modo: Geocerca circular vs Trazado libre */}
                <div className="grid grid-cols-2 gap-1.5 bg-[#f3f6fa] p-1 rounded-xl border border-[#dce4ed]">
                  <button
                    type="button"
                    onClick={() => setDrawMode('circle')}
                    className={`flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      drawMode === 'circle'
                        ? 'bg-white text-[#0e315a] shadow-xs border border-[#dce4ed]'
                        : 'text-[#5e7085] hover:text-[#172b43]'
                    }`}
                  >
                    <Circle className="size-3.5 text-[#155ead]" />
                    <span>Geocerca (Círculo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawMode('polygon')}
                    className={`flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      drawMode === 'polygon'
                        ? 'bg-white text-[#0e315a] shadow-xs border border-[#dce4ed]'
                        : 'text-[#5e7085] hover:text-[#172b43]'
                    }`}
                  >
                    <PenTool className="size-3.5 text-[#155ead]" />
                    <span>Trazado libre ({polygonPoints.length})</span>
                  </button>
                </div>

                {/* Controles de radio cuando está en modo Geocerca circular */}
                {drawMode === 'circle' && (
                  <div className="bg-[#f8fafd] border border-[#dce4ed] rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#172b43]">
                        Radio de cobertura
                      </span>
                      <span className="font-bold text-[#155ead]">
                        {circleRadiusMeters >= 1000
                          ? `${(circleRadiusMeters / 1000).toFixed(1)} km`
                          : `${circleRadiusMeters} m`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={5000}
                      step={100}
                      value={circleRadiusMeters}
                      onChange={(e) =>
                        updateCircleGeofence(
                          circleCenter,
                          Number(e.target.value),
                        )
                      }
                      className="w-full accent-[#155ead] cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[500, 1000, 2000, 3000].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateCircleGeofence(circleCenter, r)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                            circleRadiusMeters === r
                              ? 'bg-[#155ead] text-white border-[#155ead]'
                              : 'bg-white text-[#5e7085] border-[#dce4ed] hover:bg-slate-50'
                          }`}
                        >
                          {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <InteractiveMap
                  center={crewMapCenter}
                  zoom={crewMapZoom}
                  heightClass="h-[320px] lg:h-[360px]"
                  showSearchBar
                  searchPlaceholder="Buscar colonia o calle en Torreón..."
                  onSearchSelect={(lat, lng) => {
                    setCrewMapCenter({ lat, lng });
                    setCrewMapZoom(14);
                    if (drawMode === 'circle') {
                      updateCircleGeofence({ lat, lng }, circleRadiusMeters);
                    }
                  }}
                  editableCircle={
                    drawMode === 'circle' && circleCenter
                      ? {
                          center: circleCenter,
                          radiusMeters: circleRadiusMeters,
                        }
                      : null
                  }
                  onEditableCircleChange={({ center, radiusMeters }) => {
                    updateCircleGeofence(center, radiusMeters);
                  }}
                  editablePolygon={
                    drawMode === 'polygon' ? polygonPoints : undefined
                  }
                  onEditablePolygonChange={(nextCoords) => {
                    setPolygonPoints(nextCoords);
                  }}
                  onMapClick={(lat, lng) => {
                    if (drawMode === 'circle') {
                      updateCircleGeofence({ lat, lng }, circleRadiusMeters);
                    } else {
                      setPolygonPoints((prev) => [...prev, { lat, lng }]);
                    }
                  }}
                />
                <p className="text-[11px] text-[#5e7085]">
                  {drawMode === 'circle'
                    ? circleCenter
                      ? 'Puedes arrastrar el círculo, su centro o sus bordes directamente en el mapa para ubicarlo con precisión.'
                      : 'Busca una colonia arriba o haz clic en el mapa para colocar la geocerca circular.'
                    : 'Haz clic en 3 o más puntos para trazar el área; después puedes arrastrar toda la figura o cada vértice para ajustarla.'}
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-auto h-11 rounded-[12px] bg-[#155ead] hover:bg-[#124d8f] text-white font-semibold text-sm cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? 'Registrando flotilla...'
                    : 'Guardar Flotilla y Crear Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Asignar / Gestionar Trabajadores en una Flotilla Existente */}
      {editingWorkersCrew && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] max-w-[560px] w-full max-h-[88vh] flex flex-col shadow-2xl border border-[#dce4ed] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <DepartmentLogo
                  code={editingWorkersCrew.departmentCode}
                  size="sm"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-[#0e315a] truncate">
                    Trabajadores · {editingWorkersCrew.name}
                  </h3>
                  <p className="text-xs text-[#5e7085]">
                    Selecciona los empleados del padrón asignados a esta flotilla
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorkersCrew(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 bg-[#f8fafd] border border-[#dce4ed] rounded-xl px-3 h-10">
                <Search className="size-4 text-[#5e7085]" />
                <input
                  type="text"
                  value={editWorkerSearch}
                  onChange={(e) => setEditWorkerSearch(e.target.value)}
                  placeholder="Buscar por nombre, código (ej. SIM-EMP-001) o puesto..."
                  className="w-full text-xs bg-transparent outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {loadingWorkers ? (
                  <p className="text-xs text-[#5e7085] py-6 text-center">
                    Cargando padrón de trabajadores...
                  </p>
                ) : filteredEditWorkers.length === 0 ? (
                  <p className="text-xs text-[#5e7085] py-6 text-center">
                    No se encontraron trabajadores para esta dependencia.
                  </p>
                ) : (
                  filteredEditWorkers.map((w) => {
                    const checked = editWorkerIds.includes(w.id);
                    const inOtherCrew =
                      w.crewId && w.crewId !== editingWorkersCrew.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() =>
                          toggleWorkerSelection(w.id, setEditWorkerIds)
                        }
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#edf5ff] border-[#155ead]'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#172b43] truncate">
                            <span className="font-mono text-[11px] text-[#155ead] mr-1.5">
                              {w.employeeCode}
                            </span>
                            {w.firstName} {w.lastName}
                          </p>
                          <p className="text-[11px] text-[#5e7085] truncate">
                            {w.position}
                            {w.phone ? ` · ${w.phone}` : ''}
                          </p>
                          {inOtherCrew && (
                            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              Actualmente en: {w.crewName} (se reasignará si lo marcas)
                            </p>
                          )}
                        </div>
                        <span
                          className={`size-5 rounded-md flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-[#155ead] border-[#155ead] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="size-3.5" />}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-[#f8fafd] flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#0e315a]">
                {editWorkerIds.length} trabajador(es) seleccionado(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWorkersCrew(null)}
                  className="px-3.5 h-9 rounded-xl border border-[#dce4ed] bg-white text-xs font-semibold text-[#5e7085] hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingWorkers}
                  onClick={() => void handleSaveCrewWorkers()}
                  className="px-4 h-9 rounded-xl bg-[#155ead] hover:bg-[#124d8f] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {savingWorkers ? 'Guardando...' : 'Guardar asignación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
