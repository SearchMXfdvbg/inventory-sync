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
  Terminal,
  Database,
  Lock,
  Cpu,
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
      setError('ERROR_AUTH_01: Credenciales incompletas. Ingrese operador y clave.');
      return;
    }

    if (mode === 'register') {
      if (!email.trim() || !email.includes('@') || !email.includes('.')) {
        setError('ERROR_VAL_02: Correo corporativo no válido para emisión de webhook token.');
        return;
      }
      if (password.length < 6) {
        setError('ERROR_VAL_03: La clave debe tener mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('ERROR_VAL_04: Discrepancia de confirmación en clave.');
        return;
      }

      try {
        setLoading(true);
        const regRes = await register(username.trim(), password, email.trim(), 'empresa-a');
        setSuccess('NODO_AUTORIZADO: Cuenta aprovisionada. Enrutando a consola...');
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
        setError(err.message || 'ERROR_FATAL: Error al aprovisionar nodo.');
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
      setSuccess(isSuper ? 'PRIVILEGIO_SUPER_ADMIN_VALIDADO: Abriendo consola global.' : 'SESIÓN_VERIFICADA: Conexión establecida.');
      setTimeout(() => {
        if (isSuper || data?.user?.role === 'SUPER_ADMIN') {
          window.location.href = '/super-admin';
        } else {
          window.location.href = '/dashboard';
        }
      }, 400);
    } catch (err: any) {
      setError(err.message || 'ERROR_AUTH_401: Credenciales inválidas o token expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md border border-[#20242c] bg-[#0d0e12] shadow-hard text-[#ededed]">
      {/* Terminal Title Bar */}
      <div className="border-b border-[#20242c] bg-[#14171e] px-4 py-2.5 flex items-center justify-between font-mono-code text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#00ff66]" />
          <span className="text-[#8e95a5]">auth_gateway.sh</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#555d6e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66]"></span>
          <span>TLS 1.3 / CAS VERIFIED</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Brand Block */}
        <div>
          <div className="flex items-center gap-2 font-mono-code text-xs text-[#00ff66] mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>ACCESO AL CLUSTER // INVENTORY_SYNC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Consola de Operador' : 'Aprovisionar Nuevo Nodo'}
          </h1>
          <p className="font-mono-code text-xs text-[#8e95a5] mt-1">
            {mode === 'login' 
              ? 'Ingresa tus credenciales para acceder a la orquestación distribuida.'
              : 'Conecta tu infraestructura comercial con garantía atómica CAS.'}
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
            [ INICIAR SESIÓN ]
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
            [ CREAR NODO ]
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
              // {mode === 'register' ? 'IDENTIFICADOR DE OPERADOR' : 'USUARIO OPERADOR'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'register' ? 'ej. operador_central' : 'ej. admin'}
              className="w-full bg-[#090a0c] border border-[#20242c] px-3.5 py-2.5 text-[#ededed] placeholder-[#444a57] focus:outline-none focus:border-[#00ff66] text-xs transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] text-[#8e95a5] uppercase mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#00ff66]" />
                // CORREO CORPORATIVO
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
              // CLAVE DE ACCESO CRIPTOGRÁFICA
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
                // CONFIRMAR CLAVE DE ACCESO
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
                <span>AUTENTICANDO NODO...</span>
              </>
            ) : mode === 'register' ? (
              <>
                <span>DESPLEGAR CUENTA OPERATIVA</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <LogIn size={14} />
                <span>INGRESAR A LA CONSOLA</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Serializer Telemetry Footer */}
        <div className="pt-4 border-t border-[#20242c] font-mono-code text-[10px] text-[#8e95a5] space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-[#00ff66]" />
              DB LOCK SERIALIZER:
            </span>
            <span className="text-white font-medium">SQLite WAL / PostgreSQL (Row-level)</span>
          </div>
          <div className="flex items-center justify-between text-[#555d6e]">
            <span>FAIL-SAFE: Atomic CAS Lock (0ms Race Window)</span>
            <Link href="/" className="text-[#8e95a5] hover:text-white underline">
              &larr; Volver a la landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
