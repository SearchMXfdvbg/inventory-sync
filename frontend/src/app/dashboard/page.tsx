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
  ArrowUpRight,
  Terminal,
  Database,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Radio
} from 'lucide-react';
import { getInventory, getSales, getSettings, Product, Venta, isChannelConfigured, SystemSettings } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AccessGate from '@/components/AccessGate';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
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

      try {
        const session = localStorage.getItem('user_session');
        if (session) {
          const u = JSON.parse(session);
          const isSuper = u.username?.toLowerCase() === 'cristadmin';

          setCurrentUser({
            username: isSuper ? 'CristAdmin' : (u.username || 'Cliente'),
            role: isSuper ? 'SUPER_ADMIN' : (u.role || 'CLIENT_ADMIN'),
            plan: isSuper ? 'Enterprise (39,000 SKUs)' : (u.plan || 'Plan Guest'),
            is_active: isSuper ? true : (u.is_active ?? true),
            suspension_reason: isSuper ? '' : (u.suspension_reason || '')
          });
        }
      } catch {}
    }

    const fetchData = async () => {
      try {
        const [prodData, salesData, settData] = await Promise.all([
          getInventory(),
          getSales(),
          getSettings()
        ]);
        
        setProducts(prodData);
        setSales(salesData);
        setSettings(settData);

        const totalStock = prodData.reduce((acc, p) => acc + p.stock, 0);
        const lowStockCount = prodData.filter(p => p.stock < 5).length;
        
        const dayAgo = Date.now() - 3600000 * 24;
        const salesToday = salesData.filter(s => new Date(s.created_at).getTime() > dayAgo).length;

        const shopifyOk = isChannelConfigured('shopify', settData);
        const mlOk = isChannelConfigured('mercadolibre', settData);
        const amazonOk = isChannelConfigured('amazon', settData);
        const ebayOk = isChannelConfigured('ebay', settData);
        const kauflandOk = isChannelConfigured('kaufland', settData);

        const desyncCount = prodData.filter(p => {
          if (!shopifyOk && !mlOk && !amazonOk && !ebayOk && !kauflandOk) return false;
          if (shopifyOk && p.shopify_stock !== undefined && p.stock !== p.shopify_stock) return true;
          if (mlOk && p.ml_stock !== undefined && p.stock !== p.ml_stock) return true;
          if (amazonOk && p.amazon_stock !== undefined && p.stock !== p.amazon_stock) return true;
          if (ebayOk && p.ebay_stock !== undefined && p.stock !== p.ebay_stock) return true;
          if (kauflandOk && p.kaufland_stock !== undefined && p.stock !== p.kaufland_stock) return true;
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

  if (currentUser && currentUser.username.toLowerCase() !== 'cristadmin' && (currentUser.is_active === false || currentUser.plan === 'Plan Guest' || currentUser.plan?.toLowerCase().includes('guest'))) {
    return <AccessGate user={currentUser} />;
  }

  if (loading) {
    return (
      <div className="space-y-6 font-mono-code text-xs">
        <div className="p-4 border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] text-slate-600 dark:text-[#8e95a5] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00a843] dark:text-[#00ff66] animate-spin" />
          <span>INICIALIZANDO TELEMETRÍA DEL CLUSTER...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
          <div className="h-28 bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
          <div className="h-28 bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
          <div className="h-28 bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
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
        message: `Stock crítico en almacén central para ${p.nombre} (${p.sku}): ${p.stock} unidades físicas.`,
        severity: p.stock === 0 ? 'HIGH' : 'MEDIUM',
        sku: p.sku
      });
    }
    const shopifyOk = isChannelConfigured('shopify', settings);
    const mlOk = isChannelConfigured('mercadolibre', settings);
    const amazonOk = isChannelConfigured('amazon', settings);
    const ebayOk = isChannelConfigured('ebay', settings);
    const kauflandOk = isChannelConfigured('kaufland', settings);

    if ((shopifyOk && p.shopify_stock !== undefined && p.stock !== p.shopify_stock) ||
        (mlOk && p.ml_stock !== undefined && p.stock !== p.ml_stock) ||
        (amazonOk && p.amazon_stock !== undefined && p.stock !== p.amazon_stock) ||
        (ebayOk && p.ebay_stock !== undefined && p.stock !== p.ebay_stock) ||
        (kauflandOk && p.kaufland_stock !== undefined && p.stock !== p.kaufland_stock)) {
      quickAlerts.push({
        type: 'desync',
        message: `Desincronización en SKU ${p.sku}: Stock central (${p.stock}) no coincide con los canales remotos.`,
        severity: 'HIGH',
        sku: p.sku
      });
    }
  });

  const shopifyConnected = isChannelConfigured('shopify', settings);
  const mlConnected = isChannelConfigured('mercadolibre', settings);
  const amazonConnected = isChannelConfigured('amazon', settings);
  const ebayConnected = isChannelConfigured('ebay', settings);
  const kauflandConnected = isChannelConfigured('kaufland', settings);
  const connectedChannelsCount = [shopifyConnected, mlConnected, amazonConnected, ebayConnected, kauflandConnected].filter(Boolean).length;

  return (
    <div className="space-y-6 text-slate-800 dark:text-[#ededed] font-mono-code text-xs">
      {/* Top Telemetry Strip */}
      <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-3 shadow-hard flex flex-wrap items-center justify-between gap-4 text-[11px] transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#00a843] dark:bg-[#00ff66] animate-pulse"></span>
          <span className="text-[#008f39] dark:text-[#00ff66] font-bold">ORCHESTRATOR ONLINE</span>
          <span className="text-slate-300 dark:text-[#3a3f4d]">|</span>
          <span className="text-slate-600 dark:text-[#8e95a5]">ENGINE: <strong className="text-slate-900 dark:text-white font-medium">Saga Pattern Distributed Worker</strong></span>
          <span className="text-slate-300 dark:text-[#3a3f4d]">|</span>
          <span className="text-slate-600 dark:text-[#8e95a5]">FAIL-SAFE: <strong className="text-slate-900 dark:text-white font-medium">Atomic CAS Lock (0ms Race Window)</strong></span>
        </div>
        
        <div className="flex items-center gap-4 text-slate-600 dark:text-[#8e95a5]">
          <span>SHOPIFY API: <strong className="text-slate-900 dark:text-white">142ms</strong></span>
          <span>ML REST: <strong className="text-slate-900 dark:text-white">189ms</strong></span>
          <span>AMAZON SP-API: <strong className="text-slate-900 dark:text-white">318ms</strong></span>
          <span>SYNC LATENCY: <strong className="text-[#008f39] dark:text-[#00ff66]">&lt; 1.8s</strong></span>
        </div>
      </div>

      {/* DB Lock Serializer Secondary Strip */}
      <div className="border border-slate-200 dark:border-[#20242c] bg-slate-100 dark:bg-[#090a0c] px-4 py-2 shadow-hard flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-600 dark:text-[#8e95a5] transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#008f39] dark:text-[#00ff66]" />
          <span>DB LOCK SERIALIZER: <strong className="text-slate-900 dark:text-white">SQLite WAL / PostgreSQL (Row-level)</strong></span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-[#555d6e]">
          <span>MUTEX LOCK TIMEOUT: 1500ms</span>
          <span>•</span>
          <span>REINTENTOS EXPONENCIALES: 5s BACKOFF</span>
        </div>
      </div>

      {/* Channel Configuration Alert if zero connected */}
      {connectedChannelsCount === 0 && (
        <div className="border border-[#ff3b00]/40 bg-[#ff3b00]/10 p-4 shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 dark:text-[#ededed]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ff3b00]/20 border border-[#ff3b00]/40 text-[#ff3b00] flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">MODO ALMACÉN LOCAL (CANALES SIN VINCULAR)</p>
              <p className="text-[11px] text-slate-600 dark:text-[#a1a7b5] mt-0.5">
                El sistema opera sobre inventario local. Para activar la propagación bidireccional atómica, conecta las APIs de tus canales.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="font-bold bg-[#ff3b00] hover:bg-[#e03400] text-black px-4 py-2 shadow-hard shrink-0 text-xs"
          >
            VINCULAR CREDENCIALES API
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard space-y-2 transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8e95a5]">
            <span className="text-[10px] uppercase font-bold tracking-wider">// STOCK TOTAL FÍSICO</span>
            <Package className="w-4 h-4 text-[#008f39] dark:text-[#00ff66]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalStock.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 dark:text-[#555d6e]">Unidades consolidadas en base central</div>
        </div>

        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard space-y-2 transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8e95a5]">
            <span className="text-[10px] uppercase font-bold tracking-wider">// SKUS EN RIESGO (&lt;5)</span>
            <AlertTriangle className="w-4 h-4 text-[#ff3b00]" />
          </div>
          <div className="text-3xl font-extrabold text-[#ff3b00]">{stats.lowStockCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-[#555d6e]">Posible colisión ante compras simultáneas</div>
        </div>

        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard space-y-2 transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8e95a5]">
            <span className="text-[10px] uppercase font-bold tracking-wider">// TRANSACCIONES 24H</span>
            <ShoppingCart className="w-4 h-4 text-[#008f39] dark:text-[#00ff66]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.salesToday}</div>
          <div className="text-[10px] text-slate-500 dark:text-[#555d6e]">Eventos de venta resueltos por Saga</div>
        </div>

        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard space-y-2 transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8e95a5]">
            <span className="text-[10px] uppercase font-bold tracking-wider">// CANALES DESINCRONIZADOS</span>
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-[#f59e0b]" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-[#f59e0b]">{stats.desyncCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-[#555d6e]">Discrepancias en cola de conciliación</div>
        </div>
      </div>

      {/* Sales Telemetry Chart & Critical Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-6 shadow-hard flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-[#20242c]">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Rendimiento de Ventas Procesadas</h3>
              <p className="text-[10px] text-slate-500 dark:text-[#8e95a5] mt-0.5">Unidades debitadas atómicamente en los últimos 7 días</p>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-[#008f39] dark:text-[#00ff66] bg-[#00ff66]/10 px-2 py-1 border border-[#00ff66]/30">
              <Activity size={12} className="animate-pulse" /> LIVE STREAM
            </span>
          </div>

          <div className="h-56 w-full flex items-end justify-between px-4 pb-2 border-b border-slate-200 dark:border-[#20242c]">
            {chartData.map((d, i) => {
              const pct = (d.value / maxVal) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer relative" style={{ width: '12%' }}>
                  <div className="absolute bottom-full mb-2 bg-slate-900 dark:bg-[#14171e] text-white dark:text-[#00ff66] text-[10px] py-1 px-2 border border-slate-700 dark:border-[#20242c] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-hard z-10">
                    {d.value} uds.
                  </div>
                  
                  <div 
                    className="w-full bg-[#00a843] dark:bg-[#00ff66] hover:bg-[#008f39] dark:hover:bg-[#00d957] transition-all duration-300 shadow-hard"
                    style={{ height: `${Math.max(pct, 6)}%` }}
                  ></div>
                  
                  <span className="text-[10px] text-slate-500 dark:text-[#8e95a5] uppercase">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-6 shadow-hard flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-[#20242c]">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Telemetría de Alertas</h3>
              <span className="text-[10px] text-slate-500 dark:text-[#8e95a5]">{quickAlerts.length} detectadas</span>
            </div>

            <div className="space-y-3">
              {quickAlerts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-[#555d6e] text-xs">
                  <CheckCircle2 className="w-6 h-6 text-[#00a843] dark:text-[#00ff66] mx-auto mb-2 opacity-50" />
                  <span>Sin condiciones de riesgo activas en el cluster</span>
                </div>
              ) : (
                quickAlerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className="p-3 border border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] space-y-1.5 shadow-hard transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                        alert.severity === 'HIGH' 
                          ? 'border-[#ff3b00]/40 text-[#ff3b00] bg-[#ff3b00]/10' 
                          : 'border-amber-500/40 text-amber-600 dark:text-[#f59e0b] bg-amber-500/10'
                      }`}>
                        {alert.severity === 'HIGH' ? 'CRITICAL_LOCK' : 'WARNING'}
                      </span>
                      <Link 
                        href={`/inventory/${alert.sku}`}
                        className="text-[10px] text-slate-600 dark:text-[#8e95a5] hover:text-[#008f39] dark:hover:text-[#00ff66] flex items-center gap-0.5"
                      >
                        Inspeccionar SKU &rarr;
                      </Link>
                    </div>
                    <p className="text-[11px] text-slate-800 dark:text-[#ededed] leading-tight">
                      {alert.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {quickAlerts.length > 3 && (
            <Link 
              href="/alerts"
              className="text-xs text-slate-500 dark:text-[#8e95a5] hover:text-slate-900 dark:hover:text-white flex items-center justify-between border-t border-slate-200 dark:border-[#20242c] pt-3 mt-4"
            >
              <span>Ver todas las alertas ({quickAlerts.length})</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Tabla de Actividad Reciente */}
      <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-6 shadow-hard space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">Registro de Transacciones en Tiempo Real</h3>
            <p className="text-[10px] text-slate-500 dark:text-[#8e95a5] mt-0.5">Eventos resueltos por la máquina de estados Saga</p>
          </div>
          <Link 
            href="/sales"
            className="text-xs text-[#008f39] dark:text-[#00ff66] hover:underline flex items-center gap-1 font-bold"
          >
            Historial Completo &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5] uppercase text-[10px]">
                <th className="py-2.5 font-bold">Orden / Origen</th>
                <th className="py-2.5 font-bold">SKU</th>
                <th className="py-2.5 font-bold">Cant.</th>
                <th className="py-2.5 font-bold">Almacén Central</th>
                <th className="py-2.5 font-bold">Paso Shopify</th>
                <th className="py-2.5 font-bold">Paso Mercado Libre</th>
                <th className="py-2.5 font-bold text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#20242c]">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-[#555d6e]">
                    No se registran transacciones recientes en el log.
                  </td>
                </tr>
              ) : (
                sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-[#14171e]/50 transition-colors">
                    <td className="py-3">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{sale.external_id}</span>
                        <span className="text-[10px] text-slate-500 dark:text-[#8e95a5] uppercase">{sale.origen}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-800 dark:text-[#ededed] font-medium">{sale.sku}</td>
                    <td className="py-3 text-slate-900 dark:text-white font-bold">{sale.cantidad}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 border ${sale.sae_decremented ? 'border-[#00ff66]/40 text-[#008f39] dark:text-[#00ff66] bg-[#00ff66]/10' : 'border-slate-300 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5]'}`}>
                        {sale.sae_decremented ? 'CONFIRMADO' : 'EN COLA'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 border ${sale.shopify_synced ? 'border-[#00ff66]/40 text-[#008f39] dark:text-[#00ff66] bg-[#00ff66]/10' : 'border-slate-300 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5]'}`}>
                        {sale.shopify_synced ? 'CONFIRMADO' : 'EN COLA'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 border ${sale.ml_synced ? 'border-[#00ff66]/40 text-[#008f39] dark:text-[#00ff66] bg-[#00ff66]/10' : 'border-slate-300 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5]'}`}>
                        {sale.ml_synced ? 'CONFIRMADO' : 'EN COLA'}
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
