'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Hourglass, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { clearSession } from '@/lib/api';

interface AccessGateProps {
  user: {
    username: string;
    role?: string;
    plan?: string;
    is_active?: boolean;
    suspension_reason?: string;
  };
  onRefresh?: () => void;
}

export default function AccessGate({ user, onRefresh }: AccessGateProps) {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSuspended = user.is_active === false;
  const isGuest = !isSuspended && (user.plan === 'Plan Guest' || user.plan?.toLowerCase().includes('guest'));

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      // Re-consultar el estado del tenant en el servidor
      const res = await fetch('/api/super-admin/tenants');
      if (res.ok) {
        const tenants = await res.json();
        const found = tenants.find((t: any) => t.name?.toLowerCase() === user.username.toLowerCase());
        if (found) {
          // Actualizar caché local
          const stored = localStorage.getItem('inventory_sync_tenants_v2');
          let list = stored ? JSON.parse(stored) : [];
          const idx = list.findIndex((item: any) => item.name?.toLowerCase() === user.username.toLowerCase());
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...found };
          } else {
            list.push(found);
          }
          localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(list));

          const currentSession = JSON.parse(localStorage.getItem('user_session') || '{}');
          localStorage.setItem('user_session', JSON.stringify({
            ...currentSession,
            plan: found.plan,
            is_active: found.status === 'ACTIVE',
            suspension_reason: found.suspension_reason || ''
          }));

          if (found.status === 'ACTIVE' && found.plan !== 'Plan Guest') {
            setStatusMessage('¡Tu cuenta ha sido activada y tu plan ha sido asignado! Entrando al sistema...');
            setTimeout(() => {
              window.location.reload();
            }, 800);
            return;
          }
        }
      }
      setStatusMessage('Estado verificado: Tu cuenta aún se encuentra pendiente de activación o asignación por el administrador.');
    } catch {
      setStatusMessage('No se pudo verificar el estado en este momento. Intenta de nuevo en unos segundos.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  if (!isSuspended && !isGuest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${isSuspended ? 'bg-red-600' : 'bg-amber-500'}`} />
        <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${isSuspended ? 'bg-orange-600' : 'bg-blue-600'}`} />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl w-full mx-auto pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            IS
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
              InventorySync <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">Enterprise</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Plataforma de Sincronización Multicanal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Locked Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-12 max-w-2xl w-full mx-auto">
        {isSuspended ? (
          /* PANTALLA CUENTA SUSPENDIDA */
          <div className="w-full bg-slate-900/90 border border-red-500/30 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-red-950/40 space-y-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
              <ShieldAlert size={40} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-[11px] font-mono font-bold uppercase tracking-wider">
                Acceso Pausado
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Tu Cuenta Está Suspendida
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                El acceso a tus datos de inventario, catálogo y sincronización en tiempo real ha sido pausado.
              </p>
            </div>

            {/* Motivo de Suspensión Destacado */}
            <div className="bg-red-950/60 border border-red-800/80 rounded-2xl p-5 text-left space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle size={15} />
                <span>Motivo de Suspensión:</span>
              </div>
              <p className="text-sm font-semibold text-white pl-6">
                "{user.suspension_reason || 'Falta de pago de mensualidad'}"
              </p>
            </div>

            {/* Info y Contacto */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2 text-left">
              <p className="font-bold text-slate-200">¿Cómo reactivar tu cuenta?</p>
              <p className="text-slate-400 leading-relaxed">
                Ponte en contacto con el Super Administrador para solventar el motivo indicado y restaurar inmediatamente la sincronización con tus canales de venta.
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">Contacto Administrador:</span>
                <span className="text-blue-400 font-bold">cristadmin@inventorysync.io</span>
              </div>
            </div>

            {statusMessage && (
              <p className="text-xs font-semibold text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-800/50 animate-fade-in">
                {statusMessage}
              </p>
            )}

            {/* Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'Verificando con Servidor...' : 'Comprobar si ya fue Reactivada'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          /* PANTALLA PLAN GUEST / ESPERA DE APROBACIÓN */
          <div className="w-full bg-slate-900/90 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-amber-950/20 space-y-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              <Hourglass size={40} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[11px] font-mono font-bold uppercase tracking-wider">
                Plan Guest — Asignación Pendiente
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Cuenta en Espera de Aprobación
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Tu perfil de cliente ha sido registrado correctamente con el <strong className="text-amber-300 font-bold">Plan Guest</strong>.
              </p>
            </div>

            {/* Cuadro de Instrucciones */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 text-left space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={16} />
                <span>Acceso Restringido</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Hola, <strong className="text-white">{user.username}</strong>. Para ver tu catálogo, órdenes y comenzar a sincronizar tu inventario con Shopify y Mercado Libre, <strong className="text-amber-300">comunícate con el administrador</strong> para que active tu cuenta y te asigne un plan de sincronización.
              </p>
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                <span className="text-slate-400">Super Administrador:</span>
                <span className="text-blue-400 font-bold">CristAdmin (cristadmin@inventorysync.io)</span>
              </div>
            </div>

            {statusMessage && (
              <p className="text-xs font-semibold text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-800/50 animate-fade-in">
                {statusMessage}
              </p>
            )}

            {/* Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'Consultando Servidor...' : 'Comprobar si ya fue Asignado mi Plan'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 font-mono pt-6 border-t border-slate-800/80">
        InventorySync Cloud Enterprise © 2026 • Protección de Datos y Alta Disponibilidad
      </footer>
    </div>
  );
}
