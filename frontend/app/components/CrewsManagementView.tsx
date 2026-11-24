'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Plus,
  Power,
  RotateCcw,
  Trash2,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  apiFetch,
  ApiError,
  AuthUser,
  CrewView,
  DepartmentItem,
} from '../lib/api';

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

export const CrewsManagementView: React.FC<CrewsManagementViewProps> = ({
  crews,
  departments,
  currentUser,
  onRefresh,
  onNotify,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState(
    currentUser.departmentId ?? departments[0]?.id ?? '',
  );
  const [leaderFirstName, setLeaderFirstName] = useState('');
  const [leaderLastName, setLeaderLastName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderPassword, setLeaderPassword] = useState('');
  const [polygonPoints, setPolygonPoints] = useState<
    Array<{ lat: number; lng: number }>
  >([]);

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

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (polygonPoints.length < 3) {
      onNotify(
        'error',
        'Haz clic en al menos 3 puntos sobre el mapa para delimitar la zona de cobertura.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/crews', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          departmentId:
            currentUser.role === 'ROLE_SUPERVISOR'
              ? currentUser.departmentId
              : departmentId,
          polygonCoordinates: polygonPoints,
          leaderFirstName: leaderFirstName.trim(),
          leaderLastName: leaderLastName.trim(),
          leaderEmail: leaderEmail.trim(),
          leaderPhone: leaderPhone.trim() || undefined,
          leaderPassword,
        }),
      });

      onNotify('success', 'Flotilla y credenciales de campo creadas con éxito.');
      setIsModalOpen(false);
      setName('');
      setLeaderFirstName('');
      setLeaderLastName('');
      setLeaderEmail('');
      setLeaderPhone('');
      setLeaderPassword('');
      setPolygonPoints([]);
      await onRefresh();
    } catch (err) {
      onNotify(
        'error',
        err instanceof ApiError ? err.message : 'No se pudo crear la flotilla.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] sm:text-[26px] font-bold text-[#0e315a]">
            Administración de Flotillas Operativas
          </h2>
          <p className="text-[13px] text-[#5e7085]">
            Da de alta cuadrillas de campo, delimita su polígono de cobertura en
            mapa y genera sus credenciales de acceso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDepartmentId(
              currentUser.departmentId ?? departments[0]?.id ?? '',
            );
            setIsModalOpen(true);
          }}
          className="h-11 px-4 rounded-[12px] bg-[#155ead] hover:bg-[#0f4a8a] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          <span>Nueva flotilla</span>
        </button>
      </div>

      {/* Mapa general de zonas de cobertura */}
      <div className="bg-white border border-[#dce4ed] rounded-[18px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0e315a] flex items-center gap-2">
            <MapPin className="size-4 text-[#155ead]" />
            <span>Zonas de cobertura activas ({crews.length} cuadrillas)</span>
          </h3>
        </div>
        <InteractiveMap
          zoom={12}
          heightClass="h-[260px] sm:h-[320px]"
          polygons={crews.map((c) => ({
            id: c.id,
            name: c.name,
            coordinates: c.coverageCoordinates,
            colorHex: c.isActive ? '#155ead' : '#94a3b8',
          }))}
        />
      </div>

      {/* Lista de Cuadrillas */}
      {crews.length === 0 ? (
        <div className="bg-white border border-dashed border-[#dce4ed] rounded-[16px] p-10 text-center text-sm text-[#5e7085]">
          No hay flotillas registradas todavía. Crea la primera cuadrilla para
          habilitar el despacho de órdenes.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {crews.map((crew) => (
            <article
              key={crew.id}
              className="bg-white border border-[#dce4ed] rounded-[16px] p-5 flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-[#edf5ff] text-[#155ead] flex items-center justify-center shrink-0">
                      <Truck className="size-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-[#155ead]">
                        {crew.departmentCode}
                      </span>
                      <h3 className="font-bold text-[15px] text-[#172b43] leading-snug">
                        {crew.name}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      crew.isActive
                        ? 'bg-[#eaf6ef] text-[#18734a]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {crew.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="bg-[#f3f6fa] rounded-xl p-3 text-xs space-y-1">
                  <p className="font-semibold text-[#172b43] flex items-center gap-1.5">
                    <UserCheck className="size-3.5 text-[#155ead]" />
                    <span>
                      {crew.leader.firstName} {crew.leader.lastName}
                    </span>
                  </p>
                  <p className="text-[#5e7085]">{crew.leader.email}</p>
                  {crew.leader.phone && (
                    <p className="text-[#5e7085]">Tel: {crew.leader.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-[10px] text-[#5e7085]">Servicios activos</p>
                    <p className="font-bold text-[#0e315a] text-sm">
                      {crew.activeServices}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-[10px] text-[#5e7085]">Cierres (7 días)</p>
                    <p className="font-bold text-[#18734a] text-sm">
                      {crew.completedThisWeek}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleToggleActive(crew)}
                className={`w-full py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  crew.isActive
                    ? 'border-[#dce4ed] text-[#5e7085] hover:bg-slate-50'
                    : 'border-[#c1e5cf] bg-[#eaf6ef] text-[#18734a]'
                }`}
              >
                <Power className="size-3.5" />
                <span>
                  {crew.isActive ? 'Pausar disponibilidad' : 'Reactivar cuadrilla'}
                </span>
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Alta de Flotilla + Polígono en Mapa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-[20px] w-full max-w-[920px] max-h-[94vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-[#dce4ed] flex flex-col gap-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-[20px] text-[#0e315a]">
                  Alta de flotilla operativa
                </h2>
                <p className="text-xs text-[#5e7085]">
                  Configura el nombre, responsable de campo y zona geográfica en
                  mapa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCrew}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              <div className="lg:col-span-6 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#172b43]">
                    Nombre de la cuadrilla *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Cuadrilla #05 - Sector Oriente"
                    className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                  />
                </div>

                {currentUser.role === 'ROLE_ADMIN' && (
                  <div>
                    <label className="text-xs font-semibold text-[#172b43]">
                      Dependencia *
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} · {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#172b43]">
                      Nombre del jefe de cuadrilla *
                    </label>
                    <input
                      required
                      value={leaderFirstName}
                      onChange={(e) => setLeaderFirstName(e.target.value)}
                      placeholder="Ej. Roberto"
                      className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#172b43]">
                      Apellidos *
                    </label>
                    <input
                      required
                      value={leaderLastName}
                      onChange={(e) => setLeaderLastName(e.target.value)}
                      placeholder="Ej. Méndez Lara"
                      className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#172b43]">
                      Correo institucional de campo *
                    </label>
                    <input
                      type="email"
                      required
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      placeholder="cuadrilla05@torreon.gob.mx"
                      className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#172b43]">
                      Teléfono móvil
                    </label>
                    <input
                      type="tel"
                      value={leaderPhone}
                      onChange={(e) => setLeaderPhone(e.target.value)}
                      placeholder="8711234567"
                      className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#172b43]">
                    Contraseña de acceso (mín. 8 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={leaderPassword}
                    onChange={(e) => setLeaderPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full p-2.5 rounded-xl border border-[#dce4ed] text-[13px] outline-none focus:border-[#155ead]"
                  />
                </div>
              </div>

              {/* Editor de Polígono en Mapa */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0e315a]">
                      Delimitar zona de cobertura en mapa *
                    </p>
                    <p className="text-[11px] text-[#5e7085]">
                      Haz clic en el mapa para agregar vértices ({polygonPoints.length}{' '}
                      puntos).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPolygonPoints((prev) => prev.slice(0, -1))
                      }
                      className="p-1.5 rounded-lg border border-[#dce4ed] text-[#5e7085] hover:bg-slate-50 cursor-pointer"
                      title="Deshacer último vértice"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolygonPoints([])}
                      className="p-1.5 rounded-lg border border-[#dce4ed] text-[#be313b] hover:bg-rose-50 cursor-pointer"
                      title="Limpiar polígono"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <InteractiveMap
                  zoom={12}
                  heightClass="h-[260px]"
                  editablePolygon={polygonPoints}
                  onEditablePolygonChange={setPolygonPoints}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#dce4ed] text-xs font-semibold text-[#5e7085] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#155ead] hover:bg-[#0f4a8a] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Guardando...' : 'Crear flotilla y acceso'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
