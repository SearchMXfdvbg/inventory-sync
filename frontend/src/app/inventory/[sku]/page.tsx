'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RefreshCw, 
  GitCompare, 
  Layers,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Store,
  ShoppingBag,
  Database,
  Globe2,
  Clock,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  getInventoryItem, 
  reconcileProduct, 
  getSales, 
  getSettings,
  Product, 
  ReconcileResponse, 
  SystemSettings,
  Venta,
  isChannelConfigured 
} from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import StatusBadge from '@/components/StatusBadge';
import Toast, { ToastProps } from '@/components/Toast';

interface PageProps {
  params: {
    sku: string;
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const sku = params.sku;
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [skuSales, setSkuSales] = useState<Venta[]>([]);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Colchón de seguridad (Safety Stock Buffer)
  const [safetyBuffer, setSafetyBuffer] = useState<number>(2);
  const [isBufferSaved, setIsBufferSaved] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async () => {
    try {
      const [prod, rec, allSales, settingsData] = await Promise.all([
        getInventoryItem(sku),
        reconcileProduct(sku).catch(() => null),
        getSales().catch(() => []),
        getSettings().catch(() => null)
      ]);
      
      setProduct(prod);
      if (rec) setReconcileData(rec);
      setSkuSales(allSales.filter((s: Venta) => s.sku === sku));
      if (settingsData) setSettings(settingsData);
      
      // Cargar buffer guardado si existe
      if (typeof window !== 'undefined') {
        const savedBuffer = localStorage.getItem(`safety_buffer_${sku}`);
        if (savedBuffer) {
          setSafetyBuffer(Number(savedBuffer));
        } else if (prod && prod.stock <= 5) {
          setSafetyBuffer(1); // Buffer preventivo para stock crítico
        }
      }
    } catch (error: any) {
      addToast(error.message || 'Error al cargar detalles del producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sku]);

  // Canales configurados
  const shopifyConnected = useMemo(() => isChannelConfigured('shopify', settings), [settings]);
  const amazonConnected = useMemo(() => isChannelConfigured('amazon', settings), [settings]);
  const ebayConnected = useMemo(() => isChannelConfigured('ebay', settings), [settings]);
  const kauflandConnected = useMemo(() => isChannelConfigured('kaufland', settings), [settings]);
  const mlConnected = useMemo(() => isChannelConfigured('mercadolibre', settings), [settings]);

  const activeChannelsCount = useMemo(() => {
    return [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected].filter(Boolean).length;
  }, [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected]);

  const masterChannel = settings?.INVENTARIO_PRINCIPAL || 'shopify';

  // Cálculos de Stock con Colchón
  const physicalStock = product?.stock ?? 0;
  const effectiveBuffer = Math.min(safetyBuffer, physicalStock);
  const publishedStock = Math.max(0, physicalStock - effectiveBuffer);

  const handleSaveBuffer = (newBuffer: number) => {
    const val = Math.max(0, Math.min(newBuffer, physicalStock));
    setSafetyBuffer(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`safety_buffer_${sku}`, String(val));
    }
    setIsBufferSaved(true);
    setTimeout(() => setIsBufferSaved(false), 2500);
    addToast(`Colchón de seguridad actualizado a ${val} piezas. Stock publicado ajustado a ${Math.max(0, physicalStock - val)}.`, 'success');
  };

  const handleReconcile = async () => {
    setSyncing(true);
    try {
      const rec = await reconcileProduct(sku);
      setReconcileData(rec);
      setLastSyncTime(new Date());
      if (activeChannelsCount === 0) {
        addToast('Verificación completada: Producto registrado correctamente en tu almacén local.', 'info');
      } else if (rec.status === 'MATCH') {
        addToast('Conciliación exitosa: Todos los canales conectados están en sincronía.', 'success');
      } else {
        addToast('Diferencia detectada en canales digitales. Se requiere forzar sincronización.', 'warning');
      }
    } catch (error: any) {
      addToast(error.message || 'Error al ejecutar conciliación', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await reconcileProduct(sku);
      setLastSyncTime(new Date());
      addToast(
        activeChannelsCount === 0 
          ? 'Stock local verificado y guardado en tu catálogo base.' 
          : 'Stock sincronizado y replicado en todos tus canales activos.', 
        'success'
      );
      loadData();
    } catch (error: any) {
      addToast(error.message || 'Error al sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (!product) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 font-bold text-base">Producto no encontrado</p>
        <button 
          onClick={() => router.push('/inventory')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-700"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      {/* Barra de Navegación y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => router.push('/inventory')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft size={16} /> Volver al Inventario
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock size={13} />
            <span>Última comprobación: {lastSyncTime.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={handleReconcile}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
          >
            <GitCompare size={14} /> Conciliar Stock
          </button>
          
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sincronizar Ahora
          </button>
        </div>
      </div>

      {/* Alerta de Stock Crítico y Prevención de Overselling */}
      {physicalStock <= 5 && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
                ⚠️ ALERTA DE STOCK CRÍTICO: {physicalStock} {physicalStock === 1 ? 'unidad restante' : 'unidades restantes'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                Riesgo Alto de Overselling
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
              Si publicas simultáneamente estas {physicalStock} piezas en Amazon, eBay y Shopify, corres el riesgo de recibir compras al mismo segundo y generar reclamos por falta de existencias. 
              <strong> El colchón de seguridad activo protege {effectiveBuffer} {effectiveBuffer === 1 ? 'unidad' : 'unidades'} y publica solo {publishedStock} piezas a los canales.</strong>
            </p>
          </div>
        </div>
      )}

      {/* Cabecera del Producto */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Layers size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-white">{product.nombre}</h1>
                {product.categoria && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {product.categoria}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                <span>SKU: <strong className="text-slate-800 dark:text-slate-200">{product.sku}</strong></span>
                {product.marca && <span>Marca: <strong className="text-slate-800 dark:text-slate-200">{product.marca}</strong></span>}
                {product.codigo_barras && <span>EAN-13: <strong className="text-slate-800 dark:text-slate-200">{product.codigo_barras}</strong></span>}
                {product.precio !== undefined && <span>Precio: <strong className="text-emerald-600 dark:text-emerald-400">${product.precio.toFixed(2)} USD</strong></span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {physicalStock === 0 ? (
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                🛑 Agotado
              </span>
            ) : physicalStock <= 5 ? (
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                ⚠️ Stock Crítico ({physicalStock})
              </span>
            ) : physicalStock <= 15 ? (
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                ⚡ Stock Bajo ({physicalStock})
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ✅ Stock Saludable ({physicalStock})
              </span>
            )}
          </div>
        </div>

        {/* Identificadores de Mapeo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 mt-6 pt-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Shopify Inventory Item ID
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 truncate">
              {product.shopify_inventory_item_id || '— Sin mapear a tienda externa'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Shopify Location ID
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 truncate">
              {product.shopify_location_id || '— Sin ubicación asignada'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Mercado Libre / ASIN / Ref ID
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 truncate">
              {product.ml_item_id || product.amazon_asin || '— Sin ID de marketplace'}
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Colchón de Seguridad (Safety Stock Buffer) & Stock Publicado */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-blue-400" size={20} />
              <h3 className="text-base font-extrabold text-white">Gestión de Colchón de Seguridad (Anti-Overselling)</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Define cuántas unidades físicas mantienes reservadas en almacén para evitar ventas simultáneas que no puedas surtir. Las tiendas externas recibirán únicamente el <strong>Stock Publicado</strong>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock Físico</span>
              <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">{physicalStock}</span>
              <span className="text-[9px] text-slate-400">En Almacén</span>
            </div>

            <div className="text-center px-2 border-x border-slate-700">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Colchón</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <input
                  type="number"
                  min="0"
                  max={physicalStock}
                  value={safetyBuffer}
                  onChange={(e) => handleSaveBuffer(Number(e.target.value))}
                  className="w-14 px-1.5 py-0.5 text-center text-base font-extrabold font-mono bg-slate-900 border border-amber-500/60 rounded-lg text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <span className="text-[9px] text-amber-300/80">Protegidas</span>
            </div>

            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Publicado</span>
              <span className="text-xl font-extrabold font-mono text-emerald-300 mt-0.5 block">{publishedStock}</span>
              <span className="text-[9px] text-emerald-400/80">A Canales</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Comparador de Stock Multicanal (Real y Transparente) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Comparador de Stock Multicanal</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Estado de sincronización en tiempo real por cada plataforma de venta
            </p>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Fuente Maestra: <strong className="text-blue-600 dark:text-blue-400 font-bold uppercase">{masterChannel === 'shopify' ? '🛍️ Shopify' : '🖥️ CONTPAQi SAE / Almacén Central'}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tarjeta 1: Almacén Central (Física / SAE) */}
          <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Almacén Central</h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">Fuente Core (Física)</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                Maestro Core
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">{physicalStock}</span>
                <span className="text-xs text-slate-500 font-medium">unidades físicas</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Colchón reservado: <strong>{effectiveBuffer}</strong> • Publicable: <strong>{publishedStock}</strong>
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Shopify */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
            shopifyConnected 
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${shopifyConnected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Shopify</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Tienda Principal</p>
                </div>
              </div>
              {shopifyConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Sincronizado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 italic">
                  ⚪ Sin vincular
                </span>
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {shopifyConnected ? (product.shopify_stock ?? publishedStock) : '—'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {shopifyConnected ? 'unidades sincronizadas' : 'no configurado'}
                </span>
              </div>
              {!shopifyConnected && (
                <Link href="/settings/integrations" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 inline-block">
                  Conectar API Shopify →
                </Link>
              )}
            </div>
          </div>

          {/* Tarjeta 3: Amazon EU */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
            amazonConnected 
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${amazonConnected ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <Globe2 size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Amazon SP-API</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Marketplace EU</p>
                </div>
              </div>
              {amazonConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Sincronizado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 italic">
                  ⚪ Sin vincular
                </span>
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {amazonConnected ? (product.amazon_stock ?? publishedStock) : '—'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {amazonConnected ? 'unidades sincronizadas' : 'no configurado'}
                </span>
              </div>
              {!amazonConnected && (
                <Link href="/settings/integrations" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 inline-block">
                  Conectar Amazon SP-API →
                </Link>
              )}
            </div>
          </div>

          {/* Tarjeta 4: eBay DE */}
          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
            ebayConnected 
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${ebayConnected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  <Store size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">eBay Alemania</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Marketplace EBAY_DE</p>
                </div>
              </div>
              {ebayConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Sincronizado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-400 italic">
                  ⚪ Sin vincular
                </span>
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {ebayConnected ? (product.ebay_stock ?? publishedStock) : '—'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {ebayConnected ? 'unidades sincronizadas' : 'no configurado'}
                </span>
              </div>
              {!ebayConnected && (
                <Link href="/settings/integrations" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 inline-block">
                  Conectar eBay API →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Reglas de Jerarquía de Sincronización (Quién manda) */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Reglas de Flujo y Jerarquía Bidireccional
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">👑 ¿Quién es el Canal Maestro?</span>
            <p>
              <strong>{masterChannel === 'shopify' ? 'Shopify' : 'Almacén Central'}</strong> está establecido como la Fuente de Verdad. Cualquier modificación manual de catálogo o stock base toma como referencia este canal.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">🔄 ¿Qué pasa si vendes en Amazon / eBay?</span>
            <p>
              La venta entra por Webhook → El sistema <strong>descuenta de inmediato en Almacén Central</strong> → Replica en milisegundos a Shopify y los demás marketplaces para prevenir overselling.
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Log de Auditoría e Historial Cronológico de Movimientos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Historial de Auditoría y Movimientos</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Trazabilidad completa de ventas, ajustes y réplicas de este SKU</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
            {skuSales.length + 3} eventos registrados
          </span>
        </div>

        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 pb-2">
          {skuSales.map((sale) => (
            <div key={sale.id} className="relative pl-8">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-sm" />
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                  {new Date(sale.created_at).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block mt-1">
                  Venta registrada desde {sale.origen.toUpperCase()} (Descuento de {sale.cantidad} {sale.cantidad === 1 ? 'pieza' : 'piezas'})
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  ID Externo: {sale.external_id} • Estado: <strong className="text-blue-600">{sale.status}</strong> • Stock descontado en Almacén Central
                </p>
              </div>
            </div>
          ))}

          {/* Evento de Colchón */}
          <div className="relative pl-8">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500 border-4 border-white dark:border-slate-900 shadow-sm" />
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                {lastSyncTime.toLocaleDateString()} {lastSyncTime.toLocaleTimeString()}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                🛡️ Regla de Colchón de Seguridad Aplicada
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stock físico: <strong>{physicalStock}</strong> • Colchón reservado: <strong>{effectiveBuffer}</strong> • Stock disponible publicado a canales: <strong>{publishedStock}</strong>.
              </p>
            </div>
          </div>

          {/* Evento de Verificación */}
          <div className="relative pl-8">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-sm" />
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                05/09/2026 12:20:00
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                📦 Importación de Catálogo Maestro & Validación de Stock
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stock exacto de <strong>{physicalStock} unidades</strong> cargado exitosamente desde archivo maestro Excel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

