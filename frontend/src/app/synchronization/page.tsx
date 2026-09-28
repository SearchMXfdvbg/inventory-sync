'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Database, ShoppingCart, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { getIntegrationStatus, IntegrationStatus } from '@/lib/api';

export default function SynchronizationPage() {
  const [statuses, setStatuses] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const statusData = await getIntegrationStatus();
      setStatuses(statusData);
    } catch (error: any) {
      console.error('Error al cargar estado de sincronización:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getChannelStatus = (channel: string) => {
    if (!statuses) return { status: 'offline', enabled: false };
    
    switch (channel) {
      case 'shopify':
        return statuses.shopify;
      case 'mercadolibre':
        return statuses.mercadolibre;
      case 'tiktok':
        return statuses.tiktok;
      case 'amazon':
        return statuses.amazon;
      case 'ebay':
        return statuses.ebay;
      case 'kaufland':
        return statuses.kaufland;
      case 'sae':
        return statuses.sae;
      default:
        return { status: 'offline', enabled: false };
    }
  };

  const getChannelIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-[#00ff66]" />;
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-[#00ff66] animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#ff3b00]" />;
      default:
        return <XCircle className="w-5 h-5 text-[#555d6e]" />;
    }
  };

  const channels = [
    { id: 'sae', name: 'CONTPAQi SAE', icon: <Database className="w-5 h-5" /> },
    { id: 'shopify', name: 'Shopify', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'mercadolibre', name: 'Mercado Libre', icon: <Activity className="w-5 h-5" /> },
    { id: 'amazon', name: 'Amazon SP-API', icon: <Activity className="w-5 h-5" /> },
    { id: 'ebay', name: 'eBay', icon: <Activity className="w-5 h-5" /> },
    { id: 'kaufland', name: 'Kaufland', icon: <Activity className="w-5 h-5" /> },
    { id: 'tiktok', name: 'TikTok Shop', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">MONITOR DE SINCRONIZACIÓN</h1>
        <button 
          onClick={loadData}
          className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> ACTUALIZAR ESTADO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {channels.map((channel) => {
          const status = getChannelStatus(channel.id);
          const isConnected = status?.status === 'connected';
          
          return (
            <div key={channel.id} className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {channel.icon}
                  <h3 className="font-bold font-mono-code text-sm">{channel.name}</h3>
                </div>
                {getChannelIcon(status?.status || 'offline')}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8e95a5]">Estado:</span>
                  <span className="font-mono-code">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8e95a5]">Habilitado:</span>
                  <span className="font-mono-code">
                    {status?.enabled ? 'Sí' : 'No'}
                  </span>
                </div>
                {status?.status === 'connected' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8e95a5]">Última sincronización:</span>
                    <span className="font-mono-code">Justo ahora</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Queue */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="px-4 py-3 border-b border-[#20242c]">
          <h2 className="font-bold font-mono-code text-sm">COLA DE SINCRONIZACIÓN</h2>
        </div>
        <div className="p-4 text-center text-[#555d6e]">
          No hay elementos en la cola de sincronización.
        </div>
      </div>
    </div>
  );
}