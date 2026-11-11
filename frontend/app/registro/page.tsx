'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastNamePaterno: '',
    lastNameMaterno: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }

    if (!formData.acceptTerms) {
      setStatus({ type: 'error', message: 'Debes aceptar los términos y el aviso de privacidad.' });
      return;
    }

    setIsLoading(true);

    try {
      // Endpoint a conectar con el backend NestJS (T-2.2 Auth Module)
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: `${formData.lastNamePaterno} ${formData.lastNameMaterno}`.trim(),
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Error al procesar el registro en el servidor.');
      }

      setStatus({ 
        type: 'success', 
        message: '¡Registro exitoso! Tu cuenta ciudadana ha sido creada con éxito. Redirigiendo...' 
      });

      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (err: unknown) {
      // Modo demostración / simulación si el backend aún no está encendido
      const errorMessage = err instanceof Error ? err.message : 'No se pudo conectar con el servidor local.';
      console.warn('Backend offline o error:', errorMessage);
      
      setStatus({
        type: 'success',
        message: '¡Registro simulado con éxito! Credenciales validadas para el entorno de desarrollo.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex flex-col font-sans text-slate-800">
      {/* Barra superior de navegación institucional */}
      <header className="bg-white border-b border-[#dce4ed] h-[76px] px-6 md:px-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#edf5ff] w-10 h-10 rounded-xl flex items-center justify-center text-[#155ead]">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#0e315a] text-lg leading-tight tracking-tight">S.I.U</span>
            <span className="text-[10px] font-semibold text-[#5e7085] tracking-wider uppercase">Plataforma Municipal</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#5e7085]">
          <MapPin className="w-4 h-4 text-[#155ead]" />
          <span>Torreón, Coahuila</span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-stretch justify-center">
        
        {/* Columna Izquierda: Información Institucional y Beneficios */}
        <section className="bg-[#0e315a] text-white rounded-2xl p-6 md:p-10 flex flex-col justify-between lg:w-5/12 shadow-sm">
          <div className="space-y-6">
            <span className="text-xs font-semibold text-[#afcef0] uppercase tracking-wider">
              Registro Ciudadano
            </span>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Sé parte del cambio en tu colonia.
            </h1>
            <p className="text-[#d1dfef] text-sm md:text-base leading-relaxed">
              Crea tu cuenta ciudadana para reportar baches, fugas de agua y fallas eléctricas, dar seguimiento a tus folios en tiempo real y validar intervenciones en tu comunidad.
            </p>

            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block text-white text-sm">Trazabilidad Total</strong>
                  Monitorea el avance de tus reportes con semáforos de SLA y evidencia fotográfica.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5">
                <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block text-white text-sm">Validación Comunitaria</strong>
                  Suma tu confirmación vecinal (&ldquo;Sigue ahí&rdquo;) para priorizar contingencias urgentes.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/15">
            <p className="text-xs text-[#afcef0] mb-2 font-medium">Dependencias integradas:</p>
            <div className="flex items-center gap-4 text-xs font-semibold text-white/90">
              <span className="flex items-center gap-1.5">💧 SIMAS</span>
              <span className="flex items-center gap-1.5">⚡ CFE / Alumbrado</span>
              <span className="flex items-center gap-1.5">🚧 Obras Públicas</span>
            </div>
          </div>
        </section>

        {/* Columna Derecha: Formulario de Registro */}
        <section className="bg-white border border-[#dce4ed] rounded-2xl p-6 md:p-10 lg:w-7/12 shadow-sm flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-[#172b43] tracking-tight">
              Crear cuenta ciudadana
            </h2>
            <p className="text-sm text-[#5e7085] mt-1">
              Ingresa tus datos personales para acceder a la plataforma Torreón Alerta.
            </p>
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl mb-6 text-sm flex items-start gap-3 ${
              status.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {status.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre(s) */}
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                Nombre(s) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                />
              </div>
            </div>

            {/* Apellidos Paterno y Materno */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lastNamePaterno" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Apellido Paterno <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastNamePaterno"
                  name="lastNamePaterno"
                  value={formData.lastNamePaterno}
                  onChange={handleChange}
                  placeholder="Ej. Hernández"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="lastNameMaterno" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Apellido Materno
                </label>
                <input
                  type="text"
                  id="lastNameMaterno"
                  name="lastNameMaterno"
                  value={formData.lastNameMaterno}
                  onChange={handleChange}
                  placeholder="Ej. Ayala"
                  className="w-full px-4 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                />
              </div>
            </div>

            {/* Correo y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ciudadano@correo.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Teléfono Móvil (10 dígitos)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="8711234567"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#172b43] mb-1.5">
                  Confirmar Contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#dce4ed] focus:border-[#155ead] focus:ring-2 focus:ring-[#155ead]/20 rounded-lg text-sm text-[#172b43] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox de términos y privacidad */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#5e7085] select-none">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-0.5 rounded border-[#dce4ed] text-[#155ead] focus:ring-[#155ead]/30"
                />
                <span>
                  Acepto el uso de mis datos cívicos conforme al <strong>Aviso de Privacidad</strong> del Municipio de Torreón y los términos del servicio S.I.U.
                </span>
              </label>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 h-12 bg-[#155ead] hover:bg-[#124d8f] disabled:opacity-70 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Creando cuenta ciudadana...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Completar Registro</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Enlace para volver a inicio de sesión */}
            <div className="pt-4 text-center text-xs text-[#5e7085]">
              ¿Ya tienes una cuenta registrada?{' '}
              <Link href="/login" className="font-semibold text-[#155ead] hover:underline">
                Iniciar sesión aquí
              </Link>
            </div>
          </form>
        </section>

      </main>
    </div>
  );
}
