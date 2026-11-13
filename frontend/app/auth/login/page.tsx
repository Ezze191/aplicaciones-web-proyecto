"use client";

import { useState } from "react";

type TipoCuenta = "ciudadano" | "personal";

// Provisional: la detección real de la dependencia la debe hacer el backend.
function detectarDependencia(correo: string): string | null {
  const c = correo.toLowerCase();
  if (!c.includes("@")) return null;
  if (c.includes("simas")) return "SIMAS Torreón (Operativo)";
  if (c.includes("cfe")) return "CFE (Operativo)";
  if (c.includes("obras")) return "Obras Públicas (Operativo)";
  return null;
}

export default function LoginPage() {
  const [tipo, setTipo] = useState<TipoCuenta>("personal");
  const [correo, setCorreo] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  const esPersonal = tipo === "personal";
  const dependencia = esPersonal ? detectarDependencia(correo) : null;

  const tabBase =
    "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]";
  const tabActiva = "bg-[#0E315A] text-white";
  const tabInactiva = "bg-white text-[#0E315A] hover:bg-slate-100";

  const campo =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]";

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        {/* Panel informativo */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-[#0E315A]">
              Plataforma Municipal
            </h1>
            <p className="font-semibold text-[#0284C7]">
              Gestión de Incidencias Urbanas
            </p>
            <p className="text-sm text-slate-600">
              Torreón, Coahuila · Zona Metropolitana
            </p>
          </header>

          <h2 className="mb-3 text-sm font-bold text-slate-800">
            Canalización inmediata a organismos:
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="rounded-lg border border-slate-200 p-3">
              <strong className="text-[#0284C7]">SIMAS:</strong> Fugas de agua,
              drenaje y colectores caídos.
            </li>
            <li className="rounded-lg border border-slate-200 p-3">
              <strong className="text-[#D97706]">CFE:</strong> Alumbrado
              público, cables y transformadores.
            </li>
            <li className="rounded-lg border border-slate-200 p-3">
              <strong className="text-[#EA580C]">Obras Públicas:</strong>{" "}
              Bacheo y rehabilitación de pavimento.
            </li>
          </ul>

          {/* Rastreo de folio */}
          <form
            className="mt-6 rounded-xl border-2 border-dashed border-slate-300 p-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <h2 className="text-sm font-bold text-slate-800">
              ¿Solo deseas consultar un reporte existente?
            </h2>
            <p className="mb-3 text-xs text-slate-600">
              No necesitas iniciar sesión para dar seguimiento público a tu
              avería.
            </p>
            <label htmlFor="folio" className="sr-only">
              Folio del reporte
            </label>
            <div className="flex gap-2">
              <input
                id="folio"
                name="folio"
                type="text"
                placeholder="SIM-2026-0842"
                pattern="[A-Za-z]{3}-[0-9]{4}-[0-9]{4}"
                title="Formato: SIM-2026-0842"
                className={campo}
              />
              <button
                type="submit"
                className="rounded-lg bg-[#0E315A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
              >
                Rastrear
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Consulta estatus, cuadrilla asignada y foto del antes/después.
            </p>
          </form>
        </section>

        {/* Tarjeta de login */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#0E315A]">Iniciar Sesión</h2>
          <p className="mb-4 text-sm text-slate-600">
            Ingresa tus credenciales para acceder a la plataforma
          </p>

          <div
            role="tablist"
            aria-label="Tipo de cuenta"
            className="mb-5 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!esPersonal}
              onClick={() => setTipo("ciudadano")}
              className={`${tabBase} ${!esPersonal ? tabActiva : tabInactiva}`}
            >
              Cuenta Ciudadana
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={esPersonal}
              onClick={() => setTipo("personal")}
              className={`${tabBase} ${esPersonal ? tabActiva : tabInactiva}`}
            >
              Personal / Delegación
            </button>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label
                htmlFor="correo"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                {esPersonal ? "Correo Electrónico Institucional:" : "Correo Electrónico:"}
              </label>
              <input
                id="correo"
                name="correo"
                type="email"
                autoComplete="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder={
                  esPersonal ? "supervisor.simas@torreon.gob.mx" : "tucorreo@ejemplo.com"
                }
                className={campo}
              />
              <p
                aria-live="polite"
                className={
                  dependencia
                    ? "mt-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-800"
                    : "sr-only"
                }
              >
                {dependencia ? `✓ Delegación detectada automáticamente: ${dependencia}` : ""}
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                Contraseña:
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={verPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={`${campo} pr-24`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-pressed={verPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-[#0E315A] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0284C7]"
                >
                  {verPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700">
                <input type="checkbox" name="recordar" className="h-4 w-4" />
                Mantener sesión activa por seguridad
              </label>
              <a
                href="#"
                className="font-semibold text-[#0284C7] underline hover:text-[#0E315A]"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#0E315A] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#0a2444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
            >
              {esPersonal ? "Acceder al panel operativo →" : "Iniciar sesión →"}
            </button>

            {esPersonal && (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Sesión única restringida por dependencia conforme a políticas
                internas.
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}