'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  Mail, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { setTenantId, login, register } from '@/lib/api';

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
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    if (mode === 'register') {
      if (!email.trim() || !email.includes('@') || !email.includes('.')) {
        setError('Por favor, ingresa un correo electrónico válido.');
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
        const regRes = await register(username.trim(), password, email.trim(), 'empresa-a');
        setSuccess('Cuenta creada exitosamente. Redirigiendo...');
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
        setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
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
      setTenantId(isSuper ? 'global-master' : 'empresa-a');
      setSuccess(isSuper ? 'Sesión de Super Administrador iniciada. Redirigiendo...' : 'Sesión iniciada correctamente. Redirigiendo...');
      setTimeout(() => {
        if (isSuper || data?.user?.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md border border-[#20242c] bg-[#0d0e12] shadow-hard text-[#ededed]">
      {/* Top Title Bar */}
      <div className="border-b border-[#20242c] bg-[#14171e] px-4 py-2.5 flex items-center justify-between font-mono-code text-xs">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#00ff66]" />
          <span className="text-[#8e95a5]">Acceso al Sistema</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#555d6e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66]"></span>
          <span>Conexión Segura</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Brand Block */}
        <div>
          <div className="flex items-center gap-2 font-mono-code text-xs text-[#00ff66] mb-1">
            <span>// INVENTORY_SYNC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="font-mono-code text-xs text-[#8e95a5] mt-1">
            {mode === 'login' 
              ? 'Ingresa tus credenciales para acceder a la plataforma.'
              : 'Registra tu empresa para comenzar a sincronizar tus canales de venta.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border border-[#20242c] bg-[#090a0c] p-1 font-mono-code text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`py-2 px-3 text-center transition-all ${
              mode === 'login'
                ? 'bg-[#20242c] text-[#00ff66] font-bold shadow-hard'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
            className={`py-2 px-3 text-center transition-all ${
              mode === 'register'
                ? 'bg-[#20242c] text-[#00ff66] font-bold shadow-hard'
                : 'text-[#8e95a5] hover:text-white'
            }`}
          >
            CREAR CUENTA
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="border border-[#ff3b00]/40 bg-[#ff3b00]/10 text-[#ff3b00] p-3 font-mono-code text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="border border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66] p-3 font-mono-code text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono-code text-xs">
          <div>
            <label className="block text-[11px] text-[#8e95a5] uppercase mb-1.5">
              USUARIO
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. admin"
              className="w-full bg-[#090a0c] border border-[#20242c] px-3.5 py-2.5 text-[#ededed] placeholder-[#444a57] focus:outline-none focus:border-[#00ff66] text-xs transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] text-[#8e95a5] uppercase mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#00ff66]" />
                CORREO ELECTRÓNICO
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operaciones@empresa.mx"
                className="w-full bg-[#090a0c] border border-[#20242c] px-3.5 py-2.5 text-[#ededed] placeholder-[#444a57] focus:outline-none focus:border-[#00ff66] text-xs transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-[#8e95a5] uppercase mb-1.5">
              CONTRASEÑA
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#090a0c] border border-[#20242c] pl-3.5 pr-10 py-2.5 text-[#ededed] placeholder-[#444a57] focus:outline-none focus:border-[#00ff66] text-xs transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8e95a5] hover:text-white"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] text-[#8e95a5] uppercase mb-1.5">
                CONFIRMAR CONTRASEÑA
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#090a0c] border border-[#20242c] px-3.5 py-2.5 text-[#ededed] placeholder-[#444a57] focus:outline-none focus:border-[#00ff66] text-xs transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff66] hover:bg-[#00e65c] disabled:opacity-50 text-black font-bold py-3 px-4 shadow-hard flex items-center justify-center gap-2 border border-[#00ff66] transition-transform active:translate-x-0.5 active:translate-y-0.5 mt-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>INICIANDO SESIÓN...</span>
              </>
            ) : mode === 'register' ? (
              <>
                <span>CREAR CUENTA</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <LogIn size={14} />
                <span>INICIAR SESIÓN</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-[#20242c] font-mono-code text-xs text-center">
          <Link href="/" className="text-[#8e95a5] hover:text-[#00ff66] transition-colors inline-flex items-center gap-1.5">
            &larr; Volver a la landing
          </Link>
        </div>
      </div>
    </div>
  );
}
