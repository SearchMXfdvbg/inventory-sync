'use client';

import React, { useState } from 'react';
import { Bell, X, AlertTriangle, CheckCircle2, Info, Clock } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info' | 'success';
  timestamp: string;
  read: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'ALERT-001',
      title: 'Stock bajo en SKU-PRO-4090',
      message: 'El stock disponible es menor a 5 unidades.',
      type: 'warning',
      timestamp: '2026-04-15T09:30:00Z',
      read: false
    },
    {
      id: 'ALERT-002',
      title: 'Conexión restaurada con Shopify',
      message: 'La conexión con Shopify se ha restablecido correctamente.',
      type: 'success',
      timestamp: '2026-04-15T08:45:00Z',
      read: true
    },
    {
      id: 'ALERT-003',
      title: 'Error en sincronización con Mercado Libre',
      message: 'No se pudo actualizar el stock de 3 productos. Reintentando...',
      type: 'error',
      timestamp: '2026-04-15T07:22:00Z',
      read: false
    },
    {
      id: 'ALERT-004',
      title: 'Nuevo producto importado',
      message: 'Se han importado 42 nuevos productos desde el catálogo.',
      type: 'info',
      timestamp: '2026-04-14T16:30:00Z',
      read: true
    }
  ]);

  const markAsRead = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  const dismissAll = () => {
    setAlerts([]);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />;
      case 'error':
        return <X className="w-5 h-5 text-[#ff3b00]" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#00ff66]" />;
      default:
        return <Info className="w-5 h-5 text-[#00ff66]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">ALERTAS DEL SISTEMA</h1>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={markAllAsRead}
            className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs"
          >
            MARCAR TODO COMO LEÍDO
          </button>
          <button 
            onClick={dismissAll}
            className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs"
          >
            DESCARTAR TODO
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="border border-[#20242c] bg-[#0d0e12] p-8 text-center text-[#555d6e] shadow-hard">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono-code">No hay alertas en este momento</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard relative ${
                alert.read ? 'opacity-70' : ''
              }`}
            >
              <button
                onClick={() => dismissAlert(alert.id)}
                className="absolute top-3 right-3 text-[#555d6e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                
                <div className="flex-1">
                  <h3 className="font-bold font-mono-code text-sm mb-1">{alert.title}</h3>
                  <p className="font-mono-code text-xs text-[#a1a7b5] mb-2">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-code text-[10px] text-[#555d6e]">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    {!alert.read && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="text-[#8e95a5] hover:text-white font-mono-code text-[10px]"
                      >
                        MARCAR COMO LEÍDO
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}