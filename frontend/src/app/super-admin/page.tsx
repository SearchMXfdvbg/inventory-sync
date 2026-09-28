'use client';

import React, { useState } from 'react';
import { Users, Settings, Database, Activity, Shield, Key, CheckCircle2, XCircle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  lastSync: string;
  productsCount: number;
  salesCount: number;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: 'TNT-001',
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
      id: 'TNT-002',
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
      id: 'TNT-003',
      name: 'Distribuidora Global',
      email: 'info@distribuidoraglobal.com',
      plan: 'Business',
      status: 'active',
      createdAt: '2026-03-22T09:15:00Z',
      lastSync: '2026-04-15T08:30:00Z',
      productsCount: 3421,
      salesCount: 2105
    }
  ]);

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

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">PANEL DE SUPER ADMINISTRADOR</h1>
        <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" /> CONFIGURACIÓN GLOBAL
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Total Clientes</div>
          <div className="text-2xl font-bold text-white mt-1">24</div>
        </div>
        <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
          <div className="text-[10px] text-[#8e95a5] uppercase">Clientes Activos</div>
          <div className="text-2xl font-bold text-[#00ff66] mt-1">22</div>
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
        </div>

        {/* Tenant Rows */}
        <div>
          {tenants.map((tenant) => (
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
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="px-4 py-3 border-b border-[#20242c]">
          <h2 className="font-bold font-mono-code text-sm">ESTADO DEL SISTEMA</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">API Principal</div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
              <span className="font-mono-code text-xs">Operativo</span>
            </div>
          </div>
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">Base de Datos</div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
              <span className="font-mono-code text-xs">Conectada</span>
            </div>
          </div>
          <div className="border border-[#20242c] bg-[#090a0c] p-3">
            <div className="text-[10px] text-[#8e95a5] uppercase mb-1">Workers</div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00ff66]" />
              <span className="font-mono-code text-xs">3 activos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}