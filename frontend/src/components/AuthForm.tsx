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
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingrese su usuario y contraseña.');
      return;
    }

    if (mode === 'register') {
      if (!email.trim() || !email.includes('@') || !email.includes('.')) {
        setError('El correo electrónico corporativo es obligatorio y debe ser válido.');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe contener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      try {
        setLoading(true);
        const regRes = await register(username.trim(), password, email.trim(), 'empresa-a');
        setSuccess('¡Cuenta empresarial creada con éxito! Redirigiendo...');
        setDemoMode(false);
        setTenantId('empresa-a');
        localStorage.setItem('logged_in', 'true');

        try {
          const stored = localStorage.getItem('inventory_sync_tenants_v2');
          let list = stored ? JSON.parse(stored) : [];
          const cleanUser = username.trim();
          const cleanEmail = email.trim();
          const cleanPwd = password.trim();

          const existingIndex = list.findIndex((item: any) => item.name?.toLowerCase() === cleanUser.toLowerCase());
          if (existingIndex >= 0) {
            list[existingIndex].password = cleanPwd;
            list[existingIndex].email = cleanEmail;
          } else if (cleanUser.toLowerCase() !== 'cristadmin') {
            list.push({
              id: `TNT-${(list.length + 1).toString().padStart(3, '0')}`,
              name: cleanUser,
              owner: cleanUser,
              email: cleanEmail,
              password: cleanPwd,
              plan: 'Plan Guest',
              maxSkus: 0,
              activeSkus: 0,
              channels: ['Shopify', 'Mercado Libre'],
              status: 'ACTIVE',
              suspension_reason: '',
              commission_rate: '25%',
              created_at: new Date().toISOString(),
              last_sync: 'En Línea'
            });
          }
          localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(list));
          localStorage.setItem('user_session', JSON.stringify({
            username: cleanUser,
            email: cleanEmail,
            role: 'CLIENT_ADMIN',
            tenant_id: 'empresa-a',
            plan: 'Plan Guest',
            is_active: true,
            suspension_reason: ''
          }));
        } catch {}

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } catch (err: any) {
        setError(err.message || 'Error al registrar usuario.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login Flow
    try {
      setLoading(true);
      const cleanUser = username.trim();
      const isSuper = cleanUser.toLowerCase() === 'cristadmin';

      const data = await login(cleanUser, password);
      const token = data?.access_token || (isSuper ? 'jwt_superadmin_master' : 'bearer_token_eu_' + Date.now());
      localStorage.setItem('auth_token', token);
      localStorage.setItem('logged_in', 'true');

      // Respetar estrictamente el estado del servidor (is_active, plan, suspension_reason)
      const userPlan = isSuper ? 'Enterprise (39,000 SKUs)' : (data?.user?.plan || 'Plan Guest');
      const userActive = isSuper ? true : (data?.user?.is_active ?? true);
      const userReason = isSuper ? '' : (data?.user?.suspension_reason || '');

      localStorage.setItem('user_session', JSON.stringify({ 
        username: isSuper ? 'CristAdmin' : cleanUser, 
        role: isSuper ? 'SUPER_ADMIN' : (data?.user?.role || 'CLIENT_ADMIN'),
        plan: userPlan,
        is_active: userActive,
        suspension_reason: userReason
      }));

      try {
        const storedTenants = localStorage.getItem('inventory_sync_tenants_v2');
        let tList = storedTenants ? JSON.parse(storedTenants) : [];
        const idx = tList.findIndex((t: any) => t.name?.toLowerCase() === cleanUser.toLowerCase());
        if (idx >= 0) {
          tList[idx] = {
            ...tList[idx],
            plan: userPlan,
            status: userActive ? 'ACTIVE' : 'SUSPENDED',
            suspension_reason: userReason
          };
          localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(tList));
        }
      } catch {}
      setDemoMode(false);
      setTenantId(isSuper ? 'global-master' : 'empresa-a');
      setSuccess(isSuper ? '¡Acceso Maestro de Super Administrador Concedido!' : '¡Credenciales verificadas! Iniciando sesión...');
      setTimeout(() => {
        if (isSuper || data?.user?.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Verifique su usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 relative transition-colors">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/25 mb-3">
          IS
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">InventorySync</h1>
        <p className="text-slate-400 text-xs mt-1 font-semibold tracking-wide">
          Sincronización Multicanal de Stock en Tiempo Real
        </p>
      </div>

      {/* Tabs Switcher: Iniciar Sesión vs Crear Cuenta */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setSuccess('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'register'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <UserPlus size={15} />
          <span>Crear Cuenta</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium p-3.5 rounded-xl mb-5 animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium p-3.5 rounded-xl mb-5 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">
            {mode === 'register' ? 'Nombre de Usuario' : 'Usuario Corporativo'}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={mode === 'register' ? 'ej. tu_empresa' : 'ej. admin'}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
              <Mail size={13} className="text-blue-600 dark:text-blue-400" />
              Correo Electrónico Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.de"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5">Confirmar Contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 mt-4 cursor-pointer active:scale-98"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verificando credenciales...</span>
            </>
          ) : mode === 'register' ? (
            <>
              <span>Crear Cuenta Empresarial</span>
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

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck size={14} className="text-emerald-600" />
        <span>Autenticación TLS / OAuth2 Encriptada</span>
      </div>
    </div>
  );
}
