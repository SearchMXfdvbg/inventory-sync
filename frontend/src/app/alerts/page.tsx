'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2
} from 'lucide-react';
import { getInventory, getSales, getSettings, Product, Venta, isChannelConfigured, SystemSettings } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface AlertItem {
  id: string;
  type: 'stock_bajo' | 'desync' | 'sync_fail' | 'disconnected_channel';
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
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [products, sales, settData] = await Promise.all([
          getInventory(),
          getSales(),
          getSettings()
        ]);
        setSettings(settData);
        
        const tempAlerts: AlertItem[] = [];

        const shopifyOk = isChannelConfigured('shopify', settData);
        const mlOk = isChannelConfigured('mercadolibre', settData);
        const amazonOk = isChannelConfigured('amazon', settData);
        const ebayOk = isChannelConfigured('ebay', settData);
        const kauflandOk = isChannelConfigured('kaufland', settData);

        const hasAnyConfigured = shopifyOk || mlOk || amazonOk || ebayOk || kauflandOk;

        if (!hasAnyConfigured) {
          tempAlerts.push({
            id: 'no-channels-connected',
            type: 'disconnected_channel',
            title: 'Marketplaces Externos No Vinculados',
            description: 'El inventario opera en modo Almacén Central Local. No hay sincronización externa activa con Shopify, Mercado Libre, Amazon o eBay.',
            severity: 'LOW',
            source: 'Sistema Central',
            date: new Date().toISOString()
          });
        }

        products.forEach((p) => {
          if (p.stock === 0) {
            tempAlerts.push({
              id: `low-stock-zero-${p.sku}`,
              type: 'stock_bajo',
              title: 'Stock Agotado en Almacén Central',
              description: `El stock físico para el producto "${p.nombre}" llegó a 0. Sincronización bloqueada.`,
              severity: 'HIGH',
              sku: p.sku,
              source: 'Almacén Central',
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
              source: 'Almacén Central',
              date: new Date().toISOString()
            });
          }

          if (hasAnyConfigured) {
            const desyncedChannels: string[] = [];
            if (shopifyOk && p.shopify_stock !== undefined && p.shopify_stock !== p.stock) {
              desyncedChannels.push(`Shopify (${p.shopify_stock} uds)`);
            }
            if (mlOk && p.ml_stock !== undefined && p.ml_stock !== p.stock) {
              desyncedChannels.push(`Mercado Libre (${p.ml_stock} uds)`);
            }
            if (amazonOk && p.amazon_stock !== undefined && p.amazon_stock !== p.stock) {
              desyncedChannels.push(`Amazon EU (${p.amazon_stock} uds)`);
            }
            if (ebayOk && p.ebay_stock !== undefined && p.ebay_stock !== p.stock) {
              desyncedChannels.push(`eBay DE (${p.ebay_stock} uds)`);
            }
            if (kauflandOk && p.kaufland_stock !== undefined && p.kaufland_stock !== p.stock) {
              desyncedChannels.push(`Kaufland DE (${p.kaufland_stock} uds)`);
            }

            if (desyncedChannels.length > 0) {
              tempAlerts.push({
                id: `desync-${p.sku}`,
                type: 'desync',
                title: 'Desalineamiento de Stock en Canales Conectados',
                description: `El stock maestro es de ${p.stock} unidades, pero difiere en: ${desyncedChannels.join(', ')}.`,
                severity: 'HIGH',
                sku: p.sku,
                source: 'API Sync',
                date: new Date().toISOString()
              });
            }
          }
        });

        sales.forEach((s) => {
          if (s.status === 'FAILED') {
            tempAlerts.push({
              id: `fail-sale-${s.id}`,
              type: 'sync_fail',
              title: 'Error Crítico en Flujo de Transacción Saga',
              description: `Venta ${s.external_id} falló al propagarse en canales. Error: ${s.last_error || 'Desconocido'}`,
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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0e12] p-5 border border-slate-200 dark:border-[#20242c] shadow-hard flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ff3b00] animate-ping" />
            <h3 className="font-bold font-mono-code text-sm uppercase tracking-wider text-slate-800 dark:text-white">Centro de Alertas Consolidadas</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#8e95a5] mt-1 font-mono-code">Control de fallos, stock bajo y desalineamiento multicanal</p>
        </div>
        <div className="flex items-center gap-2 font-mono-code text-xs">
          <span className="px-3 py-1 bg-slate-100 dark:bg-[#14171e] text-slate-700 dark:text-[#8e95a5] border border-slate-200 dark:border-[#20242c]">
            TOTAL: <strong className="text-slate-900 dark:text-white">{alerts.length}</strong>
          </span>
          <span className="px-3 py-1 bg-[#ff3b00]/10 text-[#ff3b00] border border-[#ff3b00]/30 font-bold">
            GRAVEDAD ALTA: {alerts.filter((a) => a.severity === 'HIGH').length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sortedAlerts.length === 0 ? (
          <div className="bg-white dark:bg-[#0d0e12] p-12 border border-slate-200 dark:border-[#20242c] shadow-hard text-center flex flex-col items-center justify-center transition-colors">
            <CheckCircle2 size={36} className="text-[#00ff66] mb-3" />
            <h4 className="font-bold font-mono-code text-sm uppercase text-slate-800 dark:text-white">Sistema Operando Limpio</h4>
            <p className="text-xs text-slate-400 dark:text-[#8e95a5] mt-1 max-w-xs mx-auto font-mono-code">
              No hay alertas activas de stock ni fallos de procesamiento reportados en la red.
            </p>
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-4 border bg-white dark:bg-[#0d0e12] shadow-hard flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                alert.severity === 'HIGH' 
                  ? 'border-l-4 border-l-[#ff3b00] border-slate-200 dark:border-[#20242c]' 
                  : 'border-l-4 border-l-amber-500 border-slate-200 dark:border-[#20242c]'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={alert.severity} />
                  <span className="text-[10px] text-slate-400 dark:text-[#8e95a5] font-bold uppercase font-mono-code bg-slate-50 dark:bg-[#14171e] border border-slate-200 dark:border-[#20242c] px-1.5 py-0.5">
                    {alert.source}
                  </span>
                  {alert.sku && (
                    <span className="text-[10px] text-slate-600 dark:text-[#8e95a5] font-bold font-mono-code">
                      SKU: {alert.sku}
                    </span>
                  )}
                </div>
                
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{alert.title}</h4>
                <p className="text-xs text-slate-500 dark:text-[#8e95a5] leading-relaxed">{alert.description}</p>
                <p className="text-[10px] text-slate-400 dark:text-[#555d6e] font-mono-code">Reportado: {new Date(alert.date).toLocaleString()}</p>
              </div>

              {alert.sku && (
                <div className="w-full sm:w-auto">
                  <Link
                    href={alert.type === 'desync' ? `/reconciliation?sku=${alert.sku}` : `/inventory/${alert.sku}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-[#20242c] bg-white dark:bg-[#14171e] hover:border-[#00ff66]/40 text-slate-800 dark:text-white hover:text-[#00ff66] text-xs font-mono-code font-bold shadow-hard transition-colors"
                  >
                    RESOLVER INCIDENTE →
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
