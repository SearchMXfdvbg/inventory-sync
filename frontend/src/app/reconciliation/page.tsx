'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  GitCompare, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  ShoppingBag, 
  Store, 
  Globe2,
  Loader2,
  Zap,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { 
  getInventory, 
  getSettings,
  reconcileProduct, 
  Product, 
  SystemSettings,
  ReconcileResponse,
  isChannelConfigured 
} from '@/lib/api';
import Toast, { ToastProps } from '@/components/Toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadInitialData = async () => {
    try {
      const [invData, settingsData] = await Promise.all([
        getInventory(),
        getSettings().catch(() => null)
      ]);
      const cleanInv = Array.isArray(invData) ? invData.filter(p => {
        const u = (p.sku || '').toUpperCase();
        return u && u !== 'SKU' && u !== 'CODIGO' && !u.includes('GENERADO') && !u.includes('PRODUCTOS UNICOS') && u.length <= 50;
      }) : [];
      setProducts(cleanInv);
      if (settingsData) setSettings(settingsData);
      if (cleanInv.length > 0) {
        setSelectedSku(cleanInv[0].sku);
      }
    } catch (error) {
      addToast('Error al cargar catálogo de productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Canales realmente conectados
  const shopifyConnected = useMemo(() => isChannelConfigured('shopify', settings), [settings]);
  const amazonConnected = useMemo(() => isChannelConfigured('amazon', settings), [settings]);
  const ebayConnected = useMemo(() => isChannelConfigured('ebay', settings), [settings]);
  const kauflandConnected = useMemo(() => isChannelConfigured('kaufland', settings), [settings]);
  const mlConnected = useMemo(() => isChannelConfigured('mercadolibre', settings), [settings]);

  const activeChannelsCount = useMemo(() => {
    return [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected].filter(Boolean).length;
  }, [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected]);

  const handleReconcileCheck = async (sku: string) => {
    if (!sku) return;
    setReconciling(true);
    try {
      const res = await reconcileProduct(sku);
      setReconcileData(res);
      setLastCheckTime(new Date());
      if (activeChannelsCount === 0) {
        addToast(`El producto ${sku} está guardado en Almacén Local. No hay tiendas externas conectadas aún.`, 'info');
      } else if (res.status === 'MATCH') {
        addToast(`El producto ${sku} está correctamente sincronizado en todos los canales activos.`, 'success');
      } else {
        addToast(`Diferencia de stock detectada en el SKU ${sku}.`, 'warning');
      }
    } catch (error: any) {
      addToast(error.message || 'Error al ejecutar conciliación', 'error');
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (selectedSku) {
      handleReconcileCheck(selectedSku);
    }
  }, [selectedSku]);

  const handleForceAlignment = async () => {
    if (!selectedSku) return;
    setReconciling(true);
    try {
      const res = await reconcileProduct(selectedSku);
      setReconcileData(res);
      setLastCheckTime(new Date());
      addToast('Alineamiento y conciliación de stock ejecutada exitosamente.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Error al alinear stock', 'error');
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  const selectedProduct = products.find(p => p.sku === selectedSku);
  const saeStock = selectedProduct?.stock ?? reconcileData?.sae_stock ?? 0;

  return (
    <div className="space-y-8 relative">
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>

      {/* Banner de Estado de Canales */}
      {activeChannelsCount === 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Modo Almacén Central (Catálogo Base)</p>
              <p className="text-blue-700 dark:text-blue-300">
                Actualmente no tienes tiendas externas conectadas (Shopify, Amazon, ML). La conciliación verifica tu base de datos central.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            <Zap size={13} />
            <span>Conectar Tiendas</span>
          </Link>
        </div>
      )}

      {/* Selector de Producto */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">Verificador de Stock por Producto</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Seleccione un SKU para comparar stock multicanal</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search size={16} />
            </span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-semibold font-mono shadow-inner"
            >
              <option value="" disabled>Seleccione un SKU...</option>
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.nombre} ({p.stock} pzas)
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => handleReconcileCheck(selectedSku)}
            disabled={reconciling || !selectedSku}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          >
            {reconciling ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <GitCompare size={13} />
            )}
            <span>Conciliar Ahora</span>
          </button>
        </div>
      </div>

      {reconcileData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa Comparativo */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[380px] transition-colors">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">Mapa Comparativo de Stock</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedProduct?.nombre || selectedSku}</p>
                </div>

                {activeChannelsCount === 0 ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full font-mono">
                    <ShieldCheck size={14} className="text-blue-500" /> Almacén Local (Sin Canales)
                  </span>
                ) : reconcileData.status === 'MATCH' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full font-mono">
                    <CheckCircle size={14} /> Sincronizado en Vivo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-3 py-1 rounded-full animate-pulse font-mono">
                    <AlertTriangle size={14} /> Desalineado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-4">
                {/* 1. Almacén Central (Fuente Core) */}
                <div className="flex flex-col items-center gap-2 text-center bg-blue-50/50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 shadow-xs">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                    <Database size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block font-mono">
                      Central (SAE)
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {saeStock}
                    </span>
                    <span className="text-[10px] text-slate-400">Fuente Core</span>
                  </div>
                </div>

                {/* 2. Shopify */}
                <div className={`flex flex-col items-center gap-2 text-center border rounded-2xl p-4 shadow-xs transition-all ${
                  shopifyConnected 
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                }`}>
                  <div className={`p-2.5 rounded-xl ${shopifyConnected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Shopify
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {shopifyConnected ? (selectedProduct?.shopify_stock ?? saeStock) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {shopifyConnected ? '🟢 Sincronizado' : '⚪ Sin conectar'}
                    </span>
                  </div>
                </div>

                {/* 3. Amazon EU */}
                <div className={`flex flex-col items-center gap-2 text-center border rounded-2xl p-4 shadow-xs transition-all ${
                  amazonConnected 
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                }`}>
                  <div className={`p-2.5 rounded-xl ${amazonConnected ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Globe2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Amazon EU
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {amazonConnected ? (selectedProduct?.amazon_stock ?? saeStock) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {amazonConnected ? '🟢 Sincronizado' : '⚪ Sin conectar'}
                    </span>
                  </div>
                </div>

                {/* 4. eBay DE */}
                <div className={`flex flex-col items-center gap-2 text-center border rounded-2xl p-4 shadow-xs transition-all ${
                  ebayConnected 
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                }`}>
                  <div className={`p-2.5 rounded-xl ${ebayConnected ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      eBay DE
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {ebayConnected ? (selectedProduct?.ebay_stock ?? saeStock) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {ebayConnected ? '🟢 Sincronizado' : '⚪ Sin conectar'}
                    </span>
                  </div>
                </div>

                {/* 5. Kaufland DE */}
                <div className={`flex flex-col items-center gap-2 text-center border rounded-2xl p-4 shadow-xs transition-all ${
                  kauflandConnected 
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                }`}>
                  <div className={`p-2.5 rounded-xl ${kauflandConnected ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Kaufland DE
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {kauflandConnected ? (selectedProduct?.kaufland_stock ?? saeStock) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {kauflandConnected ? '🟢 Sincronizado' : '⚪ Sin conectar'}
                    </span>
                  </div>
                </div>

                {/* 6. Mercado Libre */}
                <div className={`flex flex-col items-center gap-2 text-center border rounded-2xl p-4 shadow-xs transition-all ${
                  mlConnected 
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                }`}>
                  <div className={`p-2.5 rounded-xl ${mlConnected ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Mercado Libre
                    </span>
                    <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                      {mlConnected ? (selectedProduct?.ml_stock ?? saeStock) : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {mlConnected ? '🟢 Sincronizado' : '⚪ Sin conectar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 flex justify-end gap-3">
              <button
                onClick={handleForceAlignment}
                disabled={reconciling}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                {reconciling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <GitCompare size={13} /> Forzar Conciliación
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Panel Lateral: Detalle de Discrepancias y Políticas */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-base">Detalle de Canales & Conexiones</h4>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs leading-normal space-y-1">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Políticas de Conciliación</h5>
                  <p className="text-slate-500 dark:text-slate-400">
                    El stock de <strong>Almacén Central (SAE)</strong> es el inventario maestro físico real. Al conciliar, cualquier tienda externa conectada se actualiza para igualar el stock disponible.
                  </p>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  {/* Shopify */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Canal Shopify:</span>
                    {shopifyConnected ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Conectado / Alineado</span>
                    ) : (
                      <span className="text-slate-400 italic">⚪ No conectado</span>
                    )}
                  </div>

                  {/* Amazon */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Canal Amazon EU:</span>
                    {amazonConnected ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Conectado / Alineado</span>
                    ) : (
                      <span className="text-slate-400 italic">⚪ No conectado</span>
                    )}
                  </div>

                  {/* eBay */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Canal eBay DE:</span>
                    {ebayConnected ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Conectado / Alineado</span>
                    ) : (
                      <span className="text-slate-400 italic">⚪ No conectado</span>
                    )}
                  </div>

                  {/* Mercado Libre */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Canal Mercado Libre:</span>
                    {mlConnected ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Conectado / Alineado</span>
                    ) : (
                      <span className="text-slate-400 italic">⚪ No conectado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-[10px] text-slate-400 dark:text-slate-500 text-center font-semibold font-mono mt-6 flex items-center justify-center gap-1.5">
              <Clock size={12} />
              <span>Última comprobación: {lastCheckTime.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px] transition-colors">
          <GitCompare size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-4">Seleccione un SKU para iniciar la conciliación.</p>
          {selectedSku && (
            <button
              type="button"
              onClick={() => handleReconcileCheck(selectedSku)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <GitCompare size={12} />
              <span>Conciliar Ahora</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

