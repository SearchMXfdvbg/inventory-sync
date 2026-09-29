'use client';

import React, { useState, useEffect } from 'react';
import { Users, Settings, Database, Activity, Shield, Key, CheckCircle2, XCircle, Edit, Save, X, Plus, Trash2, RefreshCw } from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  lastSync: string;
  productsCount: number;
  salesCount: number;
}

interface SystemStatus {
  api: 'operational' | 'degraded' | 'down';
  database: 'connected' | 'disconnected';
  workers: number;
  uptime: string;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: 'operational',
    database: 'connected',
    workers: 3,
    uptime: '99.9%'
  });
  const [editingTenant, setEditingTenant] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
  const [newTenant, setNewTenant] = useState<Omit<Tenant, 'id' | 'createdAt' | 'lastSync' | 'productsCount' | 'salesCount'>>({ 
    name: '', 
    email: '', 
    plan: 'Basic', 
    status: 'trial'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tenants desde la API
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // En una implementación real, esto se conectaría a la API
      // const response = await fetch('/api/super-admin/tenants');
      // const data = await response.json();
      
      // Simulación de datos para demo
      const mockTenants: Tenant[] = [
        {
          id: 1,
          name: 'TechCorp S.A. de C.V.',
          email: 'contacto@techcorp.com',
          plan: 'Enterprise',
          status: 'active',
          createdAt: '2026-01-15T10:30:00Z',
          lastSync: '2026-04-15T10:30:00Z',
          productsCount: 1247,
          salesCount: 842
        },
        {
          id: 2,
          name: 'ElectroMéxico',
          email: 'ventas@electromexico.com',
          plan: 'Professional',
          status: 'trial',
          createdAt: '2026-04-10T14:22:00Z',
          lastSync: '2026-04-14T16:45:00Z',
          productsCount: 563,
          salesCount: 210
        },
        {
          id: 3,
          name: 'Distribuidora Global',
          email: 'info@distribuidoraglobal.com',
          plan: 'Business',
          status: 'active',
          createdAt: '2026-03-22T09:15:00Z',
          lastSync: '2026-04-15T08:30:00Z',
          productsCount: 3421,
          salesCount: 2105
        }
      ];
      
      setTenants(mockTenants);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar los clientes');
      setLoading(false);
      console.error('Error loading tenants:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00ff66]/20 text-[#00ff66] font-mono-code text-[10px]">
            <Shield className="w-3 h-3" /> ACTIVO
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#f59e0b]/20 text-[#f59e0b] font-mono-code text-[10px]">
            <Key className="w-3 h-3" /> PRUEBA
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ff3b00]/20 text-[#ff3b00] font-mono-code text-[10px]">
            <XCircle className="w-3 h-3" /> SUSPENDIDO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#555d6e]/20 text-[#555d6e] font-mono-code text-[10px]">
            <XCircle className="w-3 h-3" /> DESCONOCIDO
          </span>
        );
    }
  };

  const getSystemStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />;
      case 'degraded':
        return <Activity className="w-4 h-4 text-[#f59e0b]" />;
      case 'down':
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-[#ff3b00]" />;
      default:
        return <XCircle className="w-4 h-4 text-[#555d6e]" />;
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant.id);
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      plan: tenant.plan,
      status: tenant.status
    });
  };

  const handleSaveTenant = async (id: number) => {
    try {
      // En una implementación real, esto se conectaría a la API
      // await fetch(`/api/super-admin/tenants/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editFormData)
      // });
      
      // Actualizar localmente
      setTenants(tenants.map(tenant => 
        tenant.id === id ? { ...tenant, ...editFormData } as Tenant : tenant
      ));
      
      setEditingTenant(null);
    } catch (err) {
      console.error('Error saving tenant:', err);
      alert('Error al guardar los cambios');
    }
  };

  const handleCancelEdit = () => {
    setEditingTenant(null);
  };

  const handleDeleteTenant = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
      try {
        // En una implementación real, esto se conectaría a la API
        // await fetch(`/api/super-admin/tenants/${id}`, { method: 'DELETE' });
        
        // Eliminar localmente
        setTenants(tenants.filter(tenant => tenant.id !== id));
      } catch (err) {
        console.error('Error deleting tenant:', err);
        alert('Error al eliminar el cliente');
      }
    }
  };

  const handleAddTenant = async () => {
    if (newTenant.name && newTenant.email) {
      try {
        // En una implementación real, esto se conectaría a la API
        // const response = await fetch('/api/super-admin/tenants', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(newTenant)
        // });
        // const result = await response.json();
        
        // Agregar localmente (simulación)
        const tenant: Tenant = {
          id: tenants.length + 1,
          ...newTenant,
          createdAt: new Date().toISOString(),
          lastSync: new Date().toISOString(),
          productsCount: 0,
          salesCount: 0
        };
        
        setTenants([...tenants, tenant]);
        setNewTenant({ name: '', email: '', plan: 'Basic', status: 'trial' });
        setShowAddForm(false);
      } catch (err) {
        console.error('Error adding tenant:', err);
        alert('Error al agregar el cliente');
      }
    }
  };

  const handleInputChange = (field: keyof Tenant, value: string | boolean) => {
    setNewTenant({ ...newTenant, [field]: value });
  };

  const handleEditInputChange = (field: keyof Tenant, value: string | boolean) => {
    setEditFormData({ ...editFormData, [field]: value });
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">PANEL DE SUPER ADMINISTRADOR</h1>
        <div className="flex gap-2">
          <button 
            onClick={loadTenants}
            className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> REFRESCAR
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> AGREGAR CLIENTE
          </button>
          <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" /> CONFIGURACIÓN GLOBAL
          </button>
        </div>
      </div>

      {/* Add Tenant Form */}
      {showAddForm && (
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 mb-6 shadow-hard">
          <h2 className="font-bold font-mono-code text-sm mb-4">AGREGAR NUEVO CLIENTE</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] text-[#8e95a5] uppercase mb-1">Nombre</label>
              <input
                type="text"
                value={newTenant.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-[#090a0c] border border-[#20242c] p-2 text-xs font-mono-code"
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8e95a5] uppercase mb-1">Email</label>
              <input
                type="email"
                value={newTenant.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full bg-[#090a0c] border border-[#20242c] p-2 text-xs font-mono-code"
                placeholder="Email del cliente"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8e95a5] uppercase mb-1">Plan</label>
              <select
                value={newTenant.plan}
                onChange={(e) => handleInputChange('plan', e.target.value)}
                className="w-full bg-[#090a0c] border border-[#20242c] p-2 text-xs font-mono-code"
              >
                <option value="Basic">Basic</option>
                <option value="Professional">Professional</option>
                <option value="Business">Business</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleAddTenant}
                className="px-3 py-2 bg-[#00ff66] text-[#090a0c] font-mono-code text-xs flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> Guardar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 bg-[#ff3b00] text-[#090a0c] font-mono-code text-xs flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="border border-[#ff3b00] bg-[#0d0e12] p-4 mb-6 shadow-hard">
          <div className="text-[#ff3b00] font-mono-code text-sm">{error}</div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Total Clientes</div>
          <div className="text-2xl font-bold text-white mt-1">{tenants.length}</div>
        </div>
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Clientes Activos</div>
          <div className="text-2xl font-bold text-[#00ff66] mt-1">
            {tenants.filter(t => t.status === 'active').length}
          </div>
        </div>
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Suscripciones</div>
          <div className="text-2xl font-bold text-white mt-1">$4,728/mes</div>
        </div>
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Tickets Abiertos</div>
          <div className="text-2xl font-bold text-[#ff3b00] mt-1">3</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard mb-6">
        <div className="px-4 py-3 border-b border-[#20242c]">
          <h2 className="font-bold font-mono-code text-sm">CLIENTES</h2>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 mb-2 px-4 font-mono-code text-[10px] text-[#555d6e] uppercase tracking-widest">
          <div className="col-span-3">Nombre</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2">Productos / Ventas</div>
          <div className="col-span-1">Acciones</div>
        </div>

        {/* Tenant Rows */}
        <div>
          {loading ? (
            <div className="px-4 py-6 text-center text-[#8e95a5]">
              Cargando clientes...
            </div>
          ) : tenants.length === 0 ? (
            <div className="px-4 py-6 text-center text-[#8e95a5]">
              No hay clientes registrados
            </div>
          ) : (
            tenants.map((tenant) => (
              editingTenant === tenant.id ? (
                // Formulario de edición
                <div 
                  key={tenant.id} 
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0 hover:bg-[#14171e]/50 transition-colors"
                >
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => handleEditInputChange('name', e.target.value)}
                      className="w-full bg-[#090a0c] border border-[#20242c] p-1 text-xs font-mono-code"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => handleEditInputChange('email', e.target.value)}
                      className="w-full bg-[#090a0c] border border-[#20242c] p-1 text-xs font-mono-code"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={editFormData.plan || ''}
                      onChange={(e) => handleEditInputChange('plan', e.target.value)}
                      className="w-full bg-[#090a0c] border border-[#20242c] p-1 text-xs font-mono-code"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Professional">Professional</option>
                      <option value="Business">Business</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select
                      value={editFormData.status || ''}
                      onChange={(e) => handleEditInputChange('status', e.target.value as any)}
                      className="w-full bg-[#090a0c] border border-[#20242c] p-1 text-xs font-mono-code"
                    >
                      <option value="active">ACTIVO</option>
                      <option value="trial">PRUEBA</option>
                      <option value="suspended">SUSPENDIDO</option>
                    </select>
                  </div>
                  <div className="col-span-2"></div>
                  <div className="col-span-1 flex gap-1">
                    <button 
                      onClick={() => handleSaveTenant(tenant.id)}
                      className="p-1 text-[#00ff66]"
                      title="Guardar"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="p-1 text-[#ff3b00]"
                      title="Cancelar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                // Vista normal
                <div
                  key={tenant.id}
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0 hover:bg-[#14171e]/50 transition-colors"
                >
                  <div className="col-span-3 font-mono-code text-xs">
                    <div className="font-bold">{tenant.name}</div>
                    <div className="text-[#8e95a5] text-[10px]">ID: {tenant.id}</div>
                  </div>
                  <div className="col-span-3 font-mono-code text-xs text-[#8e95a5]">{tenant.email}</div>
                  <div className="col-span-2 font-mono-code text-xs">{tenant.plan}</div>
                  <div className="col-span-2">
                    {getStatusBadge(tenant.status)}
                  </div>
                  <div className="col-span-2 font-mono-code text-[10px] text-[#8e95a5]">
                    {tenant.productsCount} / {tenant.salesCount}
                  </div>
                  <div className="col-span-1 flex gap-1">
                    <button 
                      onClick={() => handleEditTenant(tenant)}
                      className="p-1 text-[#8e95a5] hover:text-[#00ff66]"
                      title="Editar"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="p-1 text-[#8e95a5] hover:text-[#ff3b00]"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="px-4 py-3 border-b border-[#20242c]">
          <h2 className="font-bold font-mono-code text-sm">ESTADO DEL SISTEMA</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">API Principal</div>
            <div className="flex items-center gap-2">
              {getSystemStatusIcon(systemStatus.api)}
              <span className="font-mono-code text-xs">
                {systemStatus.api === 'operational' ? 'Operativo' : 
                 systemStatus.api === 'degraded' ? 'Degradado' : 'Fuera de servicio'}
              </span>
            </div>
          </div>
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">Base de Datos</div>
            <div className="flex items-center gap-2">
              {getSystemStatusIcon(systemStatus.database)}
              <span className="font-mono-code text-xs">
                {systemStatus.database === 'connected' ? 'Conectada' : 'Desconectada'}
              </span>
            </div>
          </div>
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">Workers</div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00ff66]" />
              <span className="font-mono-code text-xs">{systemStatus.workers} activos</span>
            </div>
          </div>
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">Uptime</div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
              <span className="font-mono-code text-xs">{systemStatus.uptime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}