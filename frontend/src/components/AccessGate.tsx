'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Hourglass, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  Ticket,
  LifeBuoy
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
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] bg-grid-tech flex flex-col justify-between p-4 sm:p-8 relative selection:bg-[#00ff66] selection:text-black">
      {/* Top Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between max-w-5xl w-full mx-auto pb-4 border-b border-[#20242c] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff66] text-black font-bold font-mono-code flex items-center justify-center text-sm shadow-hard">
            //
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight flex items-center gap-2 font-mono-code">
              INVENTORY_SYNC <span className="text-[10px] uppercase px-1.5 py-0.5 border border-[#20242c] text-[#8e95a5]">GATEKEEPER</span>
            </h1>
            <p className="text-[11px] text-[#8e95a5] font-mono-code">Control de Acceso y Licenciamiento</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono-code text-xs">
          <Link
            href="/tickets"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171e] hover:bg-[#1a1e27] text-[#00ff66] border border-[#20242c] hover:border-[#00ff66]/40 transition-colors shadow-hard"
          >
            <LifeBuoy size={13} />
            <span>Tickets de Soporte</span>
          </Link>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171e] hover:bg-[#1a1e27] text-[#8e95a5] hover:text-[#ff3b00] border border-[#20242c] hover:border-[#ff3b00]/40 transition-colors"
          >
            <LogOut size={13} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Locked Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-10 max-w-xl w-full mx-auto">
        {isSuspended ? (
          /* PANTALLA CUENTA SUSPENDIDA */
          <div className="w-full bg-[#0d0e12] border-2 border-[#ff3b00] p-6 sm:p-8 shadow-hard space-y-6">
            <div className="border-b border-[#20242c] bg-[#14171e] -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 px-4 py-2.5 flex items-center justify-between font-mono-code text-xs">
              <span className="text-[#ff3b00] font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} />
                AUTH_GATE // ACCOUNT_SUSPENDED
              </span>
              <span className="text-[10px] text-[#8e95a5] uppercase">ESTADO: PAUSADO</span>
            </div>

            <div className="text-center space-y-3 pt-2">
              <div className="w-12 h-12 border border-[#ff3b00]/40 bg-[#ff3b00]/10 flex items-center justify-center text-[#ff3b00] mx-auto shadow-hard">
                <ShieldAlert size={26} />
              </div>

              <div>
                <span className="inline-block px-2 py-0.5 border border-[#ff3b00]/40 bg-[#ff3b00]/5 text-[#ff3b00] text-[10px] font-mono-code font-bold uppercase tracking-wider mb-2">
                  ACCESO PAUSADO TEMPORALMENTE
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono-code">
                  Tu Cuenta Está Suspendida
                </h2>
                <p className="text-xs text-[#8e95a5] mt-1">
                  El acceso a tu inventario y la sincronización con canales fue pausado.
                </p>
              </div>
            </div>

            {/* Motivo de Suspensión */}
            <div className="bg-[#090a0c] border border-[#ff3b00]/40 p-4 font-mono-code text-xs space-y-1">
              <div className="text-[10px] text-[#ff3b00] font-bold uppercase tracking-wider">
                MOTIVO INDICADO:
              </div>
              <p className="text-white text-xs font-semibold">
                "{user.suspension_reason || 'Falta de pago de mensualidad'}"
              </p>
            </div>

            {/* Info y Contacto */}
            <div className="bg-[#090a0c] border border-[#20242c] p-4 font-mono-code text-xs space-y-2 text-[#8e95a5]">
              <p className="text-white font-bold text-xs">// ¿CÓMO REACTIVAR EL SERVICIO?</p>
              <p className="text-[11px] leading-relaxed">
                Abre un ticket de soporte o contacta al administrador para liquidar el pendiente y restaurar la sincronización de inmediato.
              </p>
              <div className="pt-2 border-t border-[#20242c] flex flex-wrap justify-between items-center text-[11px]">
                <span>Super Administrador:</span>
                <span className="text-white font-bold">CristAdmin (cristadmin@inventorysync.io)</span>
              </div>
            </div>

            {statusMessage && (
              <div className="text-xs font-mono-code p-3 border border-[#ff9900]/40 bg-[#ff9900]/10 text-[#ff9900]">
                {statusMessage}
              </div>
            )}

            {/* Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5 font-mono-code">
              <Link
                href="/tickets"
                className="flex-1 px-4 py-3 bg-[#ff3b00] hover:bg-[#e03400] text-black font-bold text-xs shadow-hard flex items-center justify-center gap-2 border border-[#ff3b00] transition-colors"
              >
                <Ticket size={14} />
                <span>ABRIR TICKET DE APELACIÓN</span>
              </Link>
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="px-4 py-3 bg-[#14171e] hover:bg-[#1a1e27] text-white border border-[#20242c] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'VERIFICANDO...' : 'REVISAR REACTIVACIÓN'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* PANTALLA PLAN GUEST / ESPERA DE ACTIVACIÓN */
          <div className="w-full bg-[#0d0e12] border-2 border-[#ff9900] p-6 sm:p-8 shadow-hard space-y-6">
            <div className="border-b border-[#20242c] bg-[#14171e] -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 px-4 py-2.5 flex items-center justify-between font-mono-code text-xs">
              <span className="text-[#ff9900] font-bold flex items-center gap-1.5">
                <Hourglass size={13} />
                AUTH_GATE // PENDING_APPROVAL
              </span>
              <span className="text-[10px] text-[#8e95a5] uppercase">PLAN GUEST</span>
            </div>

            <div className="text-center space-y-3 pt-2">
              <div className="w-12 h-12 border border-[#ff9900]/40 bg-[#ff9900]/10 flex items-center justify-center text-[#ff9900] mx-auto shadow-hard">
                <Hourglass size={24} className="animate-pulse" />
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 border border-[#ff9900]/40 bg-[#ff9900]/5 text-[#ff9900] text-[10px] font-mono-code font-bold uppercase tracking-wider mb-2">
                  PLAN GUEST — ASIGNACIÓN PENDIENTE
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono-code">
                  Cuenta en Espera de Aprobación
                </h2>
                <p className="text-xs text-[#8e95a5] mt-1 font-mono-code">
                  Tu registro está listo con el <strong className="text-white">Plan Guest</strong>.
                </p>
              </div>
            </div>

            {/* Cuadro de Instrucciones */}
            <div className="bg-[#090a0c] border border-[#20242c] p-4 sm:p-5 text-left font-mono-code text-xs space-y-3">
              <div className="flex items-center gap-2 text-[#ff9900] text-[11px] font-bold uppercase tracking-wider border-b border-[#20242c] pb-2">
                <ShieldCheck size={14} />
                <span>[!] ACCESO RESTRINGIDO</span>
              </div>
              <p className="text-[#a1a7b5] text-xs leading-relaxed">
                Hola, <strong className="text-white">{user.username}</strong>. Para ver tu catálogo, órdenes y comenzar a sincronizar stock con Shopify y Mercado Libre, necesitas que el administrador active tu cuenta.
              </p>
              <div className="pt-2 border-t border-[#20242c] space-y-1 text-[11px]">
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="text-[#8e95a5]">Super Administrador:</span>
                  <span className="text-[#00ff66] font-bold">CristAdmin (cristadmin@inventorysync.io)</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="text-[#8e95a5]">Instrucción:</span>
                  <span className="text-white">Genera un Ticket de Activación abajo.</span>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="text-xs font-mono-code p-3 border border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66]">
                {statusMessage}
              </div>
            )}

            {/* Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5 font-mono-code">
              <Link
                href="/tickets"
                className="flex-1 px-4 py-3 bg-[#00ff66] hover:bg-[#00e65c] text-black font-bold text-xs shadow-hard flex items-center justify-center gap-2 border border-[#00ff66] transition-colors"
              >
                <Ticket size={14} />
                <span>ABRIR TICKET DE ACTIVACIÓN</span>
              </Link>
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="px-4 py-3 bg-[#14171e] hover:bg-[#1a1e27] text-white border border-[#20242c] hover:border-[#8e95a5] font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'CONSULTANDO...' : 'VERIFICAR ACTIVACIÓN'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-3 text-[#8e95a5] hover:text-[#ff3b00] border border-[#20242c] hover:border-[#ff3b00]/40 font-semibold text-xs transition-colors"
              >
                SALIR
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-[#555d6e] font-mono-code pt-4 border-t border-[#20242c]">
        // INVENTORY_SYNC | GATEWAY SERVICE | ACCESO POR AUTORIZACIÓN
      </footer>
    </div>
  );
}
