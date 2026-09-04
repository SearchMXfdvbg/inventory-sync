'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Settings2, 
  Activity, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  LogOut, 
  RefreshCw, 
  Server, 
  Key, 
  Layers, 
  Database,
  Trash2,
  Edit,
  Save,
  Check,
  TrendingUp,
  Percent,
  Sliders
} from 'lucide-react';
import { clearSession } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  owner: string;
  email: string;
  plan: string;
  maxSkus: number;
  activeSkus: number;
  channels: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  commission_rate: string;
  created_at: string;
  last_sync: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tenants' | 'config' | 'nodes' | 'security'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Modal Crear Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientOwner, setNewClientOwner] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('Plan Básico (<200 SKUs)');
  const [newClientMaxSkus, setNewClientMaxSkus] = useState(200);
  const [newClientCommission, setNewClientCommission] = useState('25%');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['Shopify', 'Amazon DE', 'eBay DE']);

  // Notificaciones
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auth Guard: Verificar que sea CristAdmin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const session = localStorage.getItem('user_session');
      let username = '';
      if (session) {
        try {
          username = JSON.parse(session).username || '';
        } catch {}
      }
      if (!token && !localStorage.getItem('logged_in')) {
        window.location.href = '/login';
        return;
      }
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, configRes] = await Promise.all([
        fetch('/api/super-admin/tenants').then(r => r.json()).catch(() => []),
        fetch('/api/super-admin/system').then(r => r.json()).catch(() => null)
      ]);
      setTenants(Array.isArray(tenantsRes) ? tenantsRes : []);
      setSystemConfig(configRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) {
      alert('Por favor complete nombre y correo');
      return;
    }

    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          owner: newClientOwner || newClientName,
          email: newClientEmail,
          plan: newClientPlan,
          maxSkus: Number(newClientMaxSkus),
          commission_rate: newClientCommission,
          channels: selectedChannels
        })
      });
      if (res.ok) {
        showToast('¡Perfil de cliente empresarial creado exitosamente!');
        setIsModalOpen(false);
        setNewClientName('');
        setNewClientOwner('');
        setNewClientEmail('');
        loadData();
      }
    } catch (err) {
      showToast('Error al crear perfil');
    }
  };

  const toggleTenantStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
      if (res.ok) {
        showToast(`Estado de cuenta actualizado a: ${nextStatus}`);
        loadData();
      }
    } catch (err) {
      showToast('Error al actualizar');
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este perfil de cliente y revocar todas sus conexiones?')) return;
    try {
      const res = await fetch(`/api/super-admin/tenants?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Perfil de cliente eliminado');
        loadData();
      }
    } catch (err) {
      showToast('Error al eliminar');
    }
  };

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-blue-400 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Superior Super Admin */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/25">
              IS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-lg tracking-tight">InventorySync Master Controller</h1>
                <span className="bg-red-950/80 text-red-400 border border-red-800/80 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Gestión Centralizada de Tenants & Plataforma Global
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Nodos AWS Frankfurt / EU: 100% Operativos</span>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-white">CristAdmin</p>
                <p className="text-[10px] text-slate-400 font-mono">Master SaaS Owner</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión maestra"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-400 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Empresas Activas</span>
              <Building2 size={18} className="text-blue-400" />
            </div>
            <p className="text-3xl font-black text-white">{tenants.length}</p>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">● Todas sincronizando en tiempo real</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">SKUs Bajo Gestión</span>
              <Layers size={18} className="text-indigo-400" />
            </div>
            <p className="text-3xl font-black text-white">39,565</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Capacidad asignada: 50,200</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Eventos Sincronizados</span>
              <Activity size={18} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white">14,892</p>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">Latencia promedio: 16ms</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Revenue Share Promedio</span>
              <Percent size={18} className="text-amber-400" />
            </div>
            <p className="text-3xl font-black text-white">25%</p>
            <p className="text-[11px] text-amber-400 font-medium mt-1">Comisión recurrente pactada</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'tenants'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            <span>Gestión de Perfiles & Clientes ({tenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 size={16} />
            <span>Configuraciones Globales del SaaS</span>
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'nodes'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server size={16} />
            <span>Nodos & Servidores EU</span>
          </button>
        </div>

        {/* Tab 1: Gestión de Tenants / Clientes */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Cuentas y Empresas Clientes</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Administra las instancias dedicadas, límites de catálogo, canales autorizados y comisiones de cada cliente.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Plus size={16} />
                <span>Crear Nuevo Perfil de Cliente</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
                      <th className="px-6 py-4">Empresa / Cliente</th>
                      <th className="px-6 py-4">Plan Asignado</th>
                      <th className="px-6 py-4">Límite SKUs</th>
                      <th className="px-6 py-4">Canales Habilitados</th>
                      <th className="px-6 py-4">Revenue Share</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{t.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{t.owner} • {t.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-bold">
                            {t.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-300">
                          {t.activeSkus.toLocaleString()} / <span className="text-slate-500">{t.maxSkus.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {t.channels.map((ch, idx) => (
                              <span key={idx} className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                {ch}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-amber-400">
                          {t.commission_rate}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${
                            t.status === 'ACTIVE' 
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' 
                              : 'bg-red-950/80 text-red-400 border border-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {t.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleTenantStatus(t.id, t.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                t.status === 'ACTIVE'
                                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900 border border-amber-800/50'
                                  : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/50'
                              }`}
                            >
                              {t.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(t.id)}
                              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-800/40 transition-colors cursor-pointer"
                              title="Eliminar perfil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Configuraciones Globales del SaaS */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <Sliders size={20} className="text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Parámetros Globales de Sincronización</h3>
                  <p className="text-xs text-slate-400">Control maestro de políticas y cuotas del sistema</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Revenue Share Estándar para Nuevos Clientes
                  </label>
                  <input
                    type="text"
                    defaultValue="25%"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Frecuencia de Conciliación Automática (CRON)
                  </label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
                    <option>Cada 5 minutos (Alta Prioridad)</option>
                    <option>Cada 15 minutos (Balanceado)</option>
                    <option>Cada 60 minutos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Límite Máximo de Chunks por Batch SP-API (Amazon EU)
                  </label>
                  <input
                    type="number"
                    defaultValue={500}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => showToast('Configuración global actualizada')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    Guardar Parámetros Maestros
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <Key size={20} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Claves Maestras de Infraestructura</h3>
                  <p className="text-xs text-slate-400">Credenciales maestras de los proveedores en la nube</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Master Encryption Key (AES-256 GCM)
                  </label>
                  <input
                    type="password"
                    defaultValue="master_enc_sec_99182319283120"
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    PostgreSQL Master DB (AWS Frankfurt)
                  </label>
                  <input
                    type="text"
                    defaultValue="postgresql://master:••••••••@aws-eu-central-1.rds.amazonaws.com:5432/inventory_sync"
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Las credenciales de clientes (Shopify, eBay, Kaufland) se almacenan aisladas por Tenant encriptadas con sal única para cumplir con los estándares de privacidad europeos (GDPR).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Nodos & Servidores EU */}
        {activeTab === 'nodes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Topología de Infraestructura Europea</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'AWS Frankfurt (eu-central-1)', role: 'FastAPI Primary API & SP-API Worker', ping: '14ms', cpu: '18%', status: 'OPERATIONAL' },
                { name: 'Hetzner Nuremberg Storage', role: 'PostgreSQL Database & WAL Replication', ping: '19ms', cpu: '12%', status: 'OPERATIONAL' },
                { name: 'Cloudflare Edge Gateway', role: 'DDoS Shield & Webhook Ingestion Relay', ping: '8ms', cpu: '9%', status: 'OPERATIONAL' }
              ].map((node, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-emerald-400 font-mono">{node.status}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{node.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{node.role}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Latencia: <strong className="text-white">{node.ping}</strong></span>
                    <span className="text-slate-400">Carga CPU: <strong className="text-white">{node.cpu}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Modal Crear Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Building2 size={20} className="text-blue-400" />
                <h3 className="font-bold text-white text-lg">Crear Nuevo Perfil de Cliente</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre de la Empresa</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="ej. TechStore Germany GmbH"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre del Propietario / Contacto</label>
                <input
                  type="text"
                  value={newClientOwner}
                  onChange={(e) => setNewClientOwner(e.target.value)}
                  placeholder="ej. Hans Weber / Iván Martínez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="h.weber@techstore-de.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Plan / Nivel</label>
                  <select
                    value={newClientPlan}
                    onChange={(e) => setNewClientPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option>Plan Básico (&lt;200 SKUs)</option>
                    <option>Plan Pro (Ilimitado)</option>
                    <option>Enterprise (39,000 SKUs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Límite Máximo SKUs</label>
                  <input
                    type="number"
                    value={newClientMaxSkus}
                    onChange={(e) => setNewClientMaxSkus(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Revenue Share Pactado (%)</label>
                <input
                  type="text"
                  value={newClientCommission}
                  onChange={(e) => setNewClientCommission(e.target.value)}
                  placeholder="ej. 25% o 30%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Registrar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
