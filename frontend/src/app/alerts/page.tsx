'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2
} from 'lucide-react';
import { getInventory, getSales, Product, Venta, isDemoMode } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface AlertItem {
  id: string;
  type: 'stock_bajo' | 'desync' | 'sync_fail';
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  sku?: string;
  source?: string;
  date: string;
}

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const products = await getInventory();
        const sales = await getSales();
        
        const tempAlerts: AlertItem[] = [];

        products.forEach((p) => {
          if (p.stock === 0) {
            tempAlerts.push({
              id: `low-stock-zero-${p.sku}`,
              type: 'stock_bajo',
              title: 'Stock Agotado en CONTPAQi SAE',
              description: `El stock físico para el producto "${p.nombre}" llegó a 0. Sincronización bloqueada.`,
              severity: 'HIGH',
              sku: p.sku,
              source: 'SAE',
              date: new Date().toISOString()
            });
          } else if (p.stock < 5) {
            tempAlerts.push({
              id: `low-stock-warn-${p.sku}`,
              type: 'stock_bajo',
              title: 'Nivel Crítico de Inventario',
              description: `Quedan únicamente ${p.stock} unidades de "${p.nombre}" en almacén central.`,
              severity: 'MEDIUM',
              sku: p.sku,
              source: 'SAE',
              date: new Date().toISOString()
            });
          }
        });

        if (isDemoMode()) {
          products.forEach((p) => {
            const hasShopifyDesync = p.stock !== p.shopify_stock;
            const hasMlDesync = p.stock !== p.ml_stock;

            if (hasShopifyDesync || hasMlDesync) {
              const channels = [];
              if (hasShopifyDesync) channels.push(`Shopify (${p.shopify_stock} uds)`);
              if (hasMlDesync) channels.push(`Mercado Libre (${p.ml_stock} uds)`);

              tempAlerts.push({
                id: `desync-${p.sku}`,
                type: 'desync',
                title: 'Desalineamiento de Stock en Canales',
                description: `El stock maestro en SAE es de ${p.stock} unidades, pero difiere en: ${channels.join(' y ')}.`,
                severity: 'HIGH',
                sku: p.sku,
                source: 'API Sync',
                date: new Date().toISOString()
              });
            }
          });
        }

        sales.forEach((s) => {
          if (s.status === 'FAILED') {
            tempAlerts.push({
              id: `fail-sale-${s.id}`,
              type: 'sync_fail',
              title: 'Error Crítico en Flujo de Transacción Saga',
              description: `Venta ${s.external_id} falló al propagarse en Shopify/ML. Error: ${s.last_error || 'Desconocido'}`,
              severity: 'HIGH',
              sku: s.sku,
              source: s.origen,
              date: s.updated_at
            });
          }
        });

        setAlerts(tempAlerts);
      } catch (error) {
        console.error('Error al cargar alertas', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedAlerts = [...alerts].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Centro de Alertas Consolidadas</h3>
          <p className="text-xs text-slate-400 mt-1">Control de fallos, stock bajo y desalineamiento multicanal</p>
        </div>
        <div className="flex gap-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
            Total Alertas: {alerts.length}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-mono">
            Gravedad Alta: {alerts.filter((a) => a.severity === 'HIGH').length}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {sortedAlerts.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
            <CheckCircle2 size={40} className="text-green-500 mb-3" />
            <h4 className="font-bold text-slate-700">Sistema Operando Limpio</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              No hay alertas activas de stock ni fallos de procesamiento reportados en la red.
            </p>
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-300 ${
                alert.severity === 'HIGH' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={alert.severity} />
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded">
                    {alert.source}
                  </span>
                  {alert.sku && (
                    <span className="text-[10px] text-slate-500 font-bold font-mono">
                      SKU: {alert.sku}
                    </span>
                  )}
                </div>
                
                <h4 className="font-bold text-slate-800 text-sm leading-snug">{alert.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{alert.description}</p>
                <p className="text-[9px] text-slate-400 font-bold font-mono">Reportado: {new Date(alert.date).toLocaleString()}</p>
              </div>

              {alert.sku && (
                <div className="w-full sm:w-auto">
                  <Link
                    href={alert.type === 'desync' ? `/reconciliation?sku=${alert.sku}` : `/inventory/${alert.sku}`}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    Resolver Incidente
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
