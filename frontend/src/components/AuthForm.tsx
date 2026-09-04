'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  Mail, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import { setDemoMode, setTenantId, login, register } from '@/lib/api';

export default function AuthForm({ defaultMode = 'login' }: { defaultMode?: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMode = searchParams?.get('mode');
  const initialMode = queryMode === 'register' ? 'register' : defaultMode;

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams?.get('mode') === 'register') {
      setMode('register');
    }
  }, [searchParams]);

  // Submit Handler (Login / Register directo)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, complete todos los campos obligatorios.');
      return;
    }

    if (mode === 'register') {
      if (!email.trim() || !email.includes('@') || !email.includes('.')) {
        setError('El correo electrónico es obligatorio y debe ser válido (ej. contacto@tutienda.com).');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      try {
        setLoading(true);
        const res = await register(username.trim(), password, email.trim(), 'empresa-a');
        setSuccess('¡Cuenta creada exitosamente! Ingresando a tu panel...');
        setDemoMode(false);
        setTenantId('empresa-a');
        localStorage.setItem('logged_in', 'true');
        setTimeout(() => router.push('/dashboard'), 800);
      } catch (err: any) {
        setError(err.message || 'Error al crear la cuenta. Intente con otro usuario.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login Flow (Puro Nombre de Usuario y Contraseña)
    try {
      setLoading(true);
      const data = await login(username.trim(), password);
      const token = data.access_token || (data as any).token;
      if (token) {
        localStorage.setItem('auth_token', token);
      }
      setDemoMode(false);
      setTenantId('empresa-a');
      localStorage.setItem('logged_in', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      setError('Credenciales inválidas. Verifique su usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-3">
          IS
        </div>
        <h1 className="text-2xl font-bold text-slate-800">InventorySync</h1>
        <p className="text-slate-400 text-xs mt-1 font-semibold tracking-wide">
          Sincronización Multicanal de Stock en Tiempo Real
        </p>
      </div>

      {/* Tabs Switcher: Iniciar Sesión vs Crear Cuenta */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setSuccess('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'login'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LogIn size={15} />
          <span>Iniciar Sesión</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError('');
            setSuccess('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'register'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus size={15} />
          <span>Crear Cuenta</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium p-3.5 rounded-xl mb-5 animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium p-3.5 rounded-xl mb-5 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
            {mode === 'register' ? 'Nombre de Usuario' : 'Usuario Corporativo'}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={mode === 'register' ? 'ej. tu_tienda' : 'ej. admin o tu_usuario'}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white"
          />
        </div>

        {/* El correo es obligatorio en el registro, y NO aparece en el login */}
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
              <Mail size={13} className="text-blue-600" />
              Correo Electrónico (Obligatorio)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ventas@tutienda.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Confirmar Contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 focus:bg-white"
            />
          </div>
        )}


        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{mode === 'register' ? 'Creando cuenta...' : 'Iniciando sesión...'}</span>
            </>
          ) : mode === 'register' ? (
            <>
              <span>Continuar</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <LogIn size={16} />
              <span>Iniciar Sesión</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
