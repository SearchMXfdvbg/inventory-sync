'use client';

import React, { useEffect, useState } from 'react';
import { 
  GitCompare, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  ShoppingBag, 
  Store, 
  Loader2 
} from 'lucide-react';
import { 
  getInventory, 
  reconcileProduct, 
  Product, 
  ReconcileResponse 
} from '@/lib/api';
import Toast, { ToastProps } from '@/components/Toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadInitialData = async () => {
    try {
      const data = await getInventory();
      setProducts(data);
      if (data.length > 0) {
        setSelectedSku(data[0].sku);
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

  const handleReconcileCheck = async (sku: string) => {
    if (!sku) return;
    setReconciling(true);
    try {
      const res = await reconcileProduct(sku);
      setReconcileData(res);
      if (res.status === 'MATCH') {
        addToast(`El producto ${sku} está correctamente sincronizado en todos los canales.`, 'success');
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

  const isShopifyValid = reconcileData && reconcileData.shopify_stock !== null && reconcileData.shopify_stock !== undefined;
  const isMlValid = reconcileData && reconcileData.ml_stock !== null && reconcileData.ml_stock !== undefined;

  const shopifyDiff = (reconcileData && isShopifyValid) ? reconcileData.shopify_stock - reconcileData.sae_stock : 0;
  const mlDiff = (reconcileData && isMlValid) ? reconcileData.ml_stock - reconcileData.sae_stock : 0;

  return (
    <div className="space-y-8 relative">
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800">Verificador de Stock por Producto</h3>
          <p className="text-xs text-slate-400 mt-1">Seleccione un SKU para comparar stock multicanal</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold font-mono"
            >
              <option value="" disabled>Seleccione un SKU...</option>
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} - {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => handleReconcileCheck(selectedSku)}
            disabled={reconciling || !selectedSku}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
          >
            {reconciling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <GitCompare size={12} />
            )}
            <span>Conciliar Automáticamente</span>
          </button>
        </div>
      </div>

      {reconcileData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex justify-between items-center mb-8">
                <h4 className="font-semibold text-slate-800">Mapa Comparativo de Stock</h4>
                {reconcileData.status === 'MATCH' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-mono">
                    <CheckCircle size={14} /> Sincronizado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full animate-pulse font-mono">
                    <AlertTriangle size={14} /> Desalineado
                  </span>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-6 relative">
                <div className="flex flex-col items-center gap-2.5 text-center bg-slate-50 border border-slate-200 rounded-2xl p-6 w-36 shadow-xs relative">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Database size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">SAE (Física)</span>
                    <span className="text-2xl font-bold text-slate-800 mt-1 block">{reconcileData.sae_stock}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-slate-300 hidden md:flex font-mono text-[10px]">
                  <ArrowRight size={24} className="stroke-[2.5]" />
                  <span className="mt-1 font-semibold text-slate-400 uppercase">Master</span>
                </div>

                <div className={`flex flex-col items-center gap-2.5 text-center border rounded-2xl p-6 w-36 shadow-xs relative transition-all ${
                  !isShopifyValid ? 'border-amber-200 bg-amber-50/20' : shopifyDiff === 0 ? 'border-green-200 bg-green-50/20' : 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-300'
                }`}>
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Shopify</span>
                    <span className="text-2xl font-bold text-slate-800 mt-1 block">
                      {isShopifyValid ? reconcileData.shopify_stock : 'Sin Acceso'}
                    </span>
                  </div>
                  {isShopifyValid && shopifyDiff !== 0 && (
                    <span className="absolute -bottom-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm font-mono whitespace-nowrap">
                      {shopifyDiff > 0 ? `+${shopifyDiff}` : shopifyDiff} en Shopify
                    </span>
                  )}
                </div>

                <div className={`flex flex-col items-center gap-2.5 text-center border rounded-2xl p-6 w-36 shadow-xs relative transition-all ${
                  !isMlValid ? 'border-amber-200 bg-amber-50/20' : mlDiff === 0 ? 'border-green-200 bg-green-50/20' : 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-300'
                }`}>
                  <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                    <Store size={24} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Mercado Libre</span>
                    <span className="text-2xl font-bold text-slate-800 mt-1 block">
                      {isMlValid ? reconcileData.ml_stock : 'Sin Acceso'}
                    </span>
                  </div>
                  {isMlValid && mlDiff !== 0 && (
                    <span className="absolute -bottom-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm font-mono whitespace-nowrap">
                      {mlDiff > 0 ? `+${mlDiff}` : mlDiff} en ML
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-3">
              <button
                onClick={handleForceAlignment}
                disabled={reconciling || reconcileData.status === 'MATCH'}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {reconciling ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <GitCompare size={12} /> Forzar Conciliación
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Detalle de Discrepancias</h4>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs leading-normal">
                  <h5 className="font-bold text-slate-700 mb-1">Políticas de Conciliación</h5>
                  <p className="text-slate-500">
                    El stock de <strong>CONTPAQi SAE</strong> es el inventario maestro/físico real. En caso de discrepancias, el sistema de alineamiento forzará la actualización de Shopify y Mercado Libre para evitar ventas sin stock físico.
                  </p>
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-50 pb-2">
                    <span className="text-slate-500">Canal Shopify:</span>
                    {!isShopifyValid ? (
                      <span className="text-amber-600 font-bold">Sin Acceso / Error</span>
                    ) : shopifyDiff === 0 ? (
                      <span className="text-green-600 font-bold">Alineado</span>
                    ) : (
                      <span className="text-rose-600 font-bold">Desfase ({shopifyDiff > 0 ? `+${shopifyDiff}` : shopifyDiff})</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-50 pb-2">
                    <span className="text-slate-500">Canal Mercado Libre:</span>
                    {!isMlValid ? (
                      <span className="text-amber-600 font-bold">Sin Acceso / Error</span>
                    ) : mlDiff === 0 ? (
                      <span className="text-green-600 font-bold">Alineado</span>
                    ) : (
                      <span className="text-rose-600 font-bold">Desfase ({mlDiff > 0 ? `+${mlDiff}` : mlDiff})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-[10px] text-slate-400 text-center font-semibold font-mono mt-6">
              Última verificación: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
          <GitCompare size={40} className="text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 font-semibold mb-4">Seleccione un SKU para iniciar la conciliación.</p>
          {selectedSku && (
            <button
              type="button"
              onClick={() => handleReconcileCheck(selectedSku)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <GitCompare size={12} />
              <span>Conciliar Automáticamente</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
