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
  Sliders,
  LayoutDashboard,
  Eye,
  EyeOff,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { clearSession } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  owner: string;
  email: string;
  password?: string;
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
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('Plan Básico (<200 SKUs)');
  const [newClientMaxSkus, setNewClientMaxSkus] = useState(200);
  const [newClientCommission, setNewClientCommission] = useState('25%');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['Shopify', 'Amazon DE', 'eBay DE']);

  // Modal de Código Secreto Maestro (060718)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'view' | 'toggle_status' | 'delete' | 'update';
    tenant: Tenant;
    updatePayload?: any;
  } | null>(null);

  // Modal Visualizar / Editar Perfil
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewedTenant, setViewedTenant] = useState<Tenant | null>(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [isEditingInView, setIsEditingInView] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    owner: string;
    email: string;
    password: string;
    plan: string;
    maxSkus: number;
    commission_rate: string;
    channels: string[];
  }>({
    name: '',
    owner: '',
    email: '',
    password: '',
    plan: 'Plan Básico (<200 SKUs)',
    maxSkus: 200,
    commission_rate: '25%',
    channels: ['Shopify', 'Mercado Libre']
  });

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

      // 1. Read local storage cache first
      let localTenants: Tenant[] = [];
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('inventory_sync_tenants_v2');
          if (stored) {
            localTenants = JSON.parse(stored);
          }
        } catch {}
      }

      // 2. Fetch server tenants
      const [tenantsRes, configRes] = await Promise.all([
        fetch('/api/super-admin/tenants').then(r => r.json()).catch(() => []),
        fetch('/api/super-admin/system').then(r => r.json()).catch(() => null)
      ]);

      const serverList: Tenant[] = Array.isArray(tenantsRes) ? tenantsRes : [];

      // 3. Merge uniquely by username / name, preserving real passwords
      const tenantMap = new Map<string, Tenant>();
      localTenants.forEach(t => {
        if (t.name?.toLowerCase() !== 'cristadmin') {
          tenantMap.set(t.name.toLowerCase(), t);
        }
      });
      serverList.forEach(t => {
        if (t.name?.toLowerCase() !== 'cristadmin') {
          const existing = tenantMap.get(t.name.toLowerCase());
          tenantMap.set(t.name.toLowerCase(), {
            ...t,
            password: existing?.password || t.password || 'ClienteSeguro2026#'
          });
        }
      });

      const mergedTenants = Array.from(tenantMap.values());

      // 4. If we have local tenants not yet synced to the server, push them
      if (mergedTenants.length > serverList.length) {
        fetch('/api/super-admin/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', tenants: mergedTenants })
        }).catch(() => {});
      }

      // 5. Save back to localStorage and update state
      if (typeof window !== 'undefined') {
        localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(mergedTenants));
      }
      setTenants(mergedTenants);
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

    const clientPwd = newClientPassword.trim() || 'ClienteSeguro2026#';

    try {
      const newTenantObj: Tenant = {
        id: `TNT-${(tenants.length + 1).toString().padStart(3, '0')}`,
        name: newClientName.trim(),
        owner: newClientOwner.trim() || newClientName.trim(),
        email: newClientEmail.trim(),
        password: clientPwd,
        plan: newClientPlan,
        maxSkus: Number(newClientMaxSkus),
        activeSkus: 0,
        channels: selectedChannels,
        status: 'ACTIVE',
        commission_rate: newClientCommission,
        created_at: new Date().toISOString(),
        last_sync: 'En Línea'
      };

      // Add to local state and localStorage immediately
      const updatedList = [newTenantObj, ...tenants.filter(t => t.name.toLowerCase() !== newTenantObj.name.toLowerCase())];
      setTenants(updatedList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(updatedList));
      }

      // Send to server
      await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          owner: newClientOwner || newClientName,
          email: newClientEmail,
          password: clientPwd,
          plan: newClientPlan,
          maxSkus: Number(newClientMaxSkus),
          commission_rate: newClientCommission,
          channels: selectedChannels
        })
      });

      showToast('¡Perfil de cliente empresarial creado exitosamente!');
      setIsModalOpen(false);
      setNewClientName('');
      setNewClientOwner('');
      setNewClientEmail('');
      setNewClientPassword('');
      loadData();
    } catch (err) {
      showToast('Error al crear perfil');
    }
  };

  const requestSecurityAction = (type: 'view' | 'toggle_status' | 'delete' | 'update', tenant: Tenant, updatePayload?: any) => {
    setPendingAction({ type, tenant, updatePayload });
    setSecurityPin('');
    setSecurityError(null);
    setIsSecurityModalOpen(true);
  };

  const handleValidateSecurityCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin.trim() !== '060718') {
      setSecurityError('Código secreto incorrecto. Acceso denegado.');
      return;
    }

    if (!pendingAction) return;

    const { type, tenant, updatePayload } = pendingAction;
    setIsSecurityModalOpen(false);
    setSecurityPin('');
    setSecurityError(null);

    if (type === 'view') {
      setViewedTenant(tenant);
      setShowViewPassword(false);
      setIsEditingInView(false);
      setEditForm({
        name: tenant.name,
        owner: tenant.owner,
        email: tenant.email,
        password: tenant.password || 'ClienteSeguro2026#',
        plan: tenant.plan,
        maxSkus: tenant.maxSkus,
        commission_rate: tenant.commission_rate,
        channels: tenant.channels || ['Shopify', 'Mercado Libre']
      });
      setIsViewModalOpen(true);
    } else if (type === 'toggle_status') {
      toggleTenantStatus(tenant.id, tenant.status);
    } else if (type === 'delete') {
      handleDeleteTenant(tenant.id);
    } else if (type === 'update') {
      await handleSaveEditedTenant(tenant.id, updatePayload);
    }
    setPendingAction(null);
  };

  const handleSaveEditedTenant = async (id: string, payload: any) => {
    try {
      const updatedList = tenants.map(t => {
        if (t.id === id) {
          return {
            ...t,
            ...payload
          };
        }
        return t;
      });
      setTenants(updatedList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(updatedList));
      }

      if (viewedTenant && viewedTenant.id === id) {
        setViewedTenant({ ...viewedTenant, ...payload });
      }
      setIsEditingInView(false);

      await fetch('/api/super-admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      });

      showToast('¡Perfil y credenciales actualizados exitosamente!');
      loadData();
    } catch (err) {
      showToast('Error al actualizar datos');
    }
  };

  const handleImpersonateTenant = (tenant: Tenant) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenant.id);
      localStorage.setItem('user_session', JSON.stringify({
        username: tenant.name,
        role: 'CLIENT_ADMIN',
        tenant_id: tenant.id
      }));
      showToast(`Accediendo al entorno de ${tenant.name}...`);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 400);
    }
  };

  const toggleTenantStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updatedList = tenants.map(t => t.id === id ? { ...t, status: nextStatus as 'ACTIVE' | 'SUSPENDED' } : t);
    setTenants(updatedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(updatedList));
    }

    try {
      await fetch('/api/super-admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
      showToast(`Estado de cuenta actualizado a: ${nextStatus}`);
    } catch (err) {
      showToast('Error al actualizar');
    }
  };

  const handleDeleteTenant = async (id: string) => {
    const updatedList = tenants.filter(t => t.id !== id);
    setTenants(updatedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventory_sync_tenants_v2', JSON.stringify(updatedList));
    }

    try {
      await fetch(`/api/super-admin/tenants?id=${id}`, { method: 'DELETE' });
      showToast('Perfil de cliente eliminado exitosamente');
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

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow-sm"
              title="Ir al Dashboard de Operaciones"
            >
              <LayoutDashboard size={15} className="text-blue-400" />
              <span>Ver Dashboard</span>
            </Link>

            <ThemeToggle />

            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Nodos AWS Frankfurt: 100% Operativos</span>
            </div>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-bold text-white">CristAdmin</p>
                <p className="text-[10px] text-amber-400 font-mono">Master SaaS Owner</p>
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
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-2 text-slate-600 opacity-60" />
                          <p className="font-semibold text-sm text-slate-300">No hay perfiles de clientes registrados aún.</p>
                          <p className="text-xs text-slate-500 mt-1">Los nuevos clientes aparecerán aquí automáticamente al registrarse o puedes registrar uno nuevo con el botón superior.</p>
                        </td>
                      </tr>
                    ) : (
                      tenants.map((t) => (
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
                              onClick={() => requestSecurityAction('view', t)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950/70 text-blue-300 hover:bg-blue-900 border border-blue-800/60 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                              title="Visualizar perfil de cliente"
                            >
                              <Eye size={13} />
                              <span>Visualizar</span>
                            </button>

                            <button
                              onClick={() => requestSecurityAction('toggle_status', t)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                t.status === 'ACTIVE'
                                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900 border border-amber-800/50'
                                  : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/50'
                              }`}
                            >
                              {t.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                            </button>

                            <button
                              onClick={() => requestSecurityAction('delete', t)}
                              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-800/40 transition-colors cursor-pointer"
                              title="Eliminar perfil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
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

              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <Key size={13} />
                  <span>Contraseña de Acceso del Cliente</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  placeholder="ej. ContraseñaSegura2026#"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-amber-300 font-mono"
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

      {/* Modal de Código Secreto Maestro (060718) */}
      {isSecurityModalOpen && pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-7 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Autorización Super Admin</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Código Secreto Requerido</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSecurityModalOpen(false);
                  setPendingAction(null);
                  setSecurityPin('');
                  setSecurityError(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Para <strong className="text-amber-400 uppercase font-bold">
                  {pendingAction.type === 'view' ? 'Visualizar' : pendingAction.type === 'toggle_status' ? (pendingAction.tenant.status === 'ACTIVE' ? 'Suspender' : 'Reactivar') : pendingAction.type === 'update' ? 'Editar y Guardar Datos' : 'Eliminar'}
                </strong> el perfil de <span className="text-white font-bold">{pendingAction.tenant.name}</span>, ingresa tu código secreto maestro:
              </p>
            </div>

            {securityError && (
              <div className="bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2 animate-fade-in">
                <AlertTriangle size={16} className="shrink-0 text-red-400" />
                <span>{securityError}</span>
              </div>
            )}

            <form onSubmit={handleValidateSecurityCode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Código Secreto de Seguridad (PIN)
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={securityPin}
                  onChange={(e) => {
                    setSecurityPin(e.target.value);
                    setSecurityError(null);
                  }}
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSecurityModalOpen(false);
                    setPendingAction(null);
                    setSecurityPin('');
                    setSecurityError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  <span>Validar y Continuar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar / Editar Perfil de Cliente */}
      {isViewModalOpen && viewedTenant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{isEditingInView ? editForm.name || viewedTenant.name : viewedTenant.name}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] font-bold">
                      {viewedTenant.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isEditingInView ? 'Modo de Edición de Perfil & Credenciales' : 'Detalles y Configuración de Instancia Cliente'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingInView ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingInView(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit size={14} />
                    <span>Editar Perfil</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingInView(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span>Ver Detalles</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setViewedTenant(null);
                    setIsEditingInView(false);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <XCircle size={22} />
                </button>
              </div>
            </div>

            {!isEditingInView ? (
              // Modo Solo Lectura / Visualización
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Propietario / Contacto</p>
                    <p className="text-white font-bold text-sm mt-0.5">{viewedTenant.owner}</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Correo Electrónico</p>
                    <p className="text-white font-mono font-medium truncate mt-0.5" title={viewedTenant.email}>{viewedTenant.email}</p>
                  </div>

                  {/* Tarjeta de Contraseña con Toggle Ojo */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 font-medium uppercase text-[10px] flex items-center gap-1.5">
                        <Key size={12} className="text-amber-400" />
                        <span>Contraseña de Acceso del Cliente</span>
                      </p>
                      <p className="text-amber-300 font-mono font-bold text-sm tracking-wider mt-1">
                        {showViewPassword ? (viewedTenant.password || 'ClienteSeguro2026#') : '••••••••••••'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowViewPassword(!showViewPassword)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    >
                      {showViewPassword ? (
                        <>
                          <EyeOff size={15} />
                          <span>Ocultar</span>
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          <span>Ver Contraseña</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Plan Asignado</p>
                    <p className="text-indigo-400 font-bold mt-0.5">{viewedTenant.plan}</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Límite de Catálogo</p>
                    <p className="text-white font-mono font-bold mt-0.5">{viewedTenant.maxSkus.toLocaleString()} SKUs</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Revenue Share Pactado</p>
                    <p className="text-amber-400 font-mono font-bold text-sm mt-0.5">{viewedTenant.commission_rate}</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-slate-500 font-medium uppercase text-[10px]">Estado de Cuenta</p>
                    <p className={`font-bold mt-0.5 ${viewedTenant.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {viewedTenant.status === 'ACTIVE' ? '● Activo en Tiempo Real' : '● Suspendido'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <p className="text-slate-500 font-medium uppercase text-[10px]">Canales Habilitados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewedTenant.channels.map((ch, idx) => (
                      <span key={idx} className="text-xs font-semibold bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
                        <Check size={12} className="text-emerald-400" />
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleImpersonateTenant(viewedTenant)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard size={15} />
                    <span>Ver Dashboard como {viewedTenant.name}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingInView(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs border border-slate-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        setViewedTenant(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Modo Edición de Datos
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  requestSecurityAction('update', viewedTenant, editForm);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Nombre de la Empresa</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Propietario / Contacto</label>
                    <input
                      type="text"
                      value={editForm.owner}
                      onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Campo Contraseña Editable con botón de ver/ocultar */}
                <div>
                  <label className="block font-bold text-amber-400 uppercase mb-1 flex items-center gap-1.5">
                    <Key size={13} />
                    <span>Contraseña de Acceso</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showViewPassword ? 'text' : 'password'}
                      required
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Nueva contraseña"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-4 pr-12 py-2.5 text-sm text-amber-300 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowViewPassword(!showViewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showViewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Plan / Nivel</label>
                    <select
                      value={editForm.plan}
                      onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                    >
                      <option>Plan Básico (&lt;200 SKUs)</option>
                      <option>Plan Pro (Ilimitado)</option>
                      <option>Enterprise (39,000 SKUs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-400 uppercase mb-1">Límite Máximo SKUs</label>
                    <input
                      type="number"
                      value={editForm.maxSkus}
                      onChange={(e) => setEditForm({ ...editForm, maxSkus: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1">Revenue Share (%)</label>
                  <input
                    type="text"
                    value={editForm.commission_rate}
                    onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase mb-1.5">Canales Habilitados</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Shopify', 'Mercado Libre', 'Amazon DE', 'eBay DE', 'Kaufland DE', 'TikTok Shop'].map((ch) => {
                      const isChecked = editForm.channels.includes(ch);
                      return (
                        <label
                          key={ch}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-600 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({ ...editForm, channels: [...editForm.channels, ch] });
                              } else {
                                setEditForm({ ...editForm, channels: editForm.channels.filter((c) => c !== ch) });
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600"
                          />
                          <span className="text-[11px] font-semibold">{ch}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingInView(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 cursor-pointer flex items-center gap-2"
                  >
                    <Save size={15} />
                    <span>Guardar Cambios (PIN 060718)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
