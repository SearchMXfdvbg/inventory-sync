'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart, 
  RefreshCw, 
  ChevronRight, 
  ArrowUpRight 
} from 'lucide-react';
import { getInventory, getSales, Product, Venta, isDemoMode } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStockCount: 0,
    salesToday: 0,
    desyncCount: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const logged = localStorage.getItem('logged_in');
      if (!token && !logged) {
        window.location.href = '/login';
        return;
      }
    }

    const fetchData = async () => {
      try {
        const prodData = await getInventory();
        const salesData = await getSales();
        
        setProducts(prodData);
        setSales(salesData);

        const totalStock = prodData.reduce((acc, p) => acc + p.stock, 0);
        const lowStockCount = prodData.filter(p => p.stock < 5).length;
        
        const dayAgo = Date.now() - 3600000 * 24;
        const salesToday = salesData.filter(s => new Date(s.created_at).getTime() > dayAgo).length;

        const desyncCount = prodData.filter(p => {
          if (isDemoMode()) {
            return p.stock !== p.shopify_stock || p.stock !== p.ml_stock;
          }
          return false;
        }).length;

        setStats({
          totalStock,
          lowStockCount,
          salesToday,
          desyncCount
        });
      } catch (error) {
        console.error('Error al cargar datos del dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  const getSalesChartData = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const chartData = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dateString = d.toDateString();
      
      const totalQty = sales
        .filter(s => {
          const saleDate = new Date(s.created_at);
          return saleDate.toDateString() === dateString && s.status === 'PROCESSED';
        })
        .reduce((sum, s) => sum + s.cantidad, 0);
        
      chartData.push({ label: dayName, value: totalQty });
    }
    return chartData;
  };

  const chartData = getSalesChartData();
  const maxVal = Math.max(...chartData.map(d => d.value), 5);

  const quickAlerts: { type: string; message: string; severity: string; sku: string }[] = [];
  products.forEach(p => {
    if (p.stock < 5) {
      quickAlerts.push({
        type: 'low_stock',
        message: `Stock bajo en SAE para ${p.nombre} (${p.sku}): ${p.stock} unidades.`,
        severity: p.stock === 0 ? 'HIGH' : 'MEDIUM',
        sku: p.sku
      });
    }
    if (isDemoMode() && (p.stock !== p.shopify_stock || p.stock !== p.ml_stock)) {
      quickAlerts.push({
        type: 'desync',
        message: `Desincronización en ${p.sku}: SAE (${p.stock}) vs Shopify (${p.shopify_stock}) vs ML (${p.ml_stock})`,
        severity: 'HIGH',
        sku: p.sku
      });
    }
  });

  return (
    <div className="space-y-8">
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Total</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.totalStock}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock Bajo (&lt;5)</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400">
            <ShoppingCart size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas 24h</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.salesToday}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <RefreshCw size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Canales Desinc.</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.desyncCount}</h3>
          </div>
        </div>
      </div>

      {/* Gráfica y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">Rendimiento de Ventas</h3>
              <p className="text-xs text-slate-400 mt-1">Unidades vendidas en los últimos 7 días</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded font-mono border border-green-200 dark:border-green-800/50">
              <TrendingUp size={12} /> Live
            </span>
          </div>

          <div className="h-56 w-full flex items-end justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            {chartData.map((d, i) => {
              const pct = (d.value / maxVal) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer relative" style={{ width: '12%' }}>
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-10 border border-slate-700">
                    {d.value} uds.
                  </div>
                  
                  <div 
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all duration-500 ease-out shadow-sm"
                    style={{ height: `${Math.max(pct, 5)}%` }}
                  ></div>
                  
                  <span className="text-[10px] font-semibold text-slate-400 uppercase font-mono">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Alertas Críticas</h3>
            <div className="space-y-3.5">
              {quickAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400 font-medium">No se detectaron alertas críticas</p>
                </div>
              ) : (
                quickAlerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div className={`mt-0.5 p-1 rounded ${alert.severity === 'HIGH' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'}`}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-normal line-clamp-2">
                        {alert.message}
                      </p>
                      <Link 
                        href={`/inventory/${alert.sku}`}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        Ir al producto <ArrowUpRight size={10} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {quickAlerts.length > 3 && (
            <Link 
              href="/alerts"
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-4"
            >
              <span>Ver todas las alertas ({quickAlerts.length})</span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Actividad Reciente</h3>
            <p className="text-xs text-slate-400 mt-1">Transacciones procesadas en la máquina de estados</p>
          </div>
          <Link 
            href="/sales"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            Ver historial completo <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
                <th className="pb-3 font-semibold">Venta / Origen</th>
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Cant.</th>
                <th className="pb-3 font-semibold">Paso SAE</th>
                <th className="pb-3 font-semibold">Paso Shopify</th>
                <th className="pb-3 font-semibold">Paso ML</th>
                <th className="pb-3 font-semibold text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-slate-400 font-medium">
                    No hay registros de sincronización
                  </td>
                </tr>
              ) : (
                sales.slice(0, 4).map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="leading-tight">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{sale.external_id}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{sale.origen}</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{sale.sku}</td>
                    <td className="py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{sale.cantidad}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sale.sae_decremented ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {sale.sae_decremented ? 'COMPLETO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sale.shopify_synced ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {sale.shopify_synced ? 'COMPLETO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sale.ml_synced ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {sale.ml_synced ? 'COMPLETO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <StatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
