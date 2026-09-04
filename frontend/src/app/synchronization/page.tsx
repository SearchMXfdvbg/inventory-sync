'use client';

import React, { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
import { getQueue, getInventory, Product, Venta } from '@/lib/api';
import ActivityTimeline from '@/components/ActivityTimeline';
import Toast, { ToastProps } from '@/components/Toast';

export default function SynchronizationPage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Venta[]>([]);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadQueue = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getQueue();
      setQueue(data);
      if (data.length > 0 && !selectedVenta) {
        setSelectedVenta(data[0]);
      }
    } catch (error: any) {
      if (!silent) addToast('Error al cargar la cola', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      loadQueue(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedVenta]);

  useEffect(() => {
    if (selectedVenta) {
      const match = queue.find(q => q.id === selectedVenta.id);
      if (match) {
        setSelectedVenta(match);
      }
    }
  }, [queue]);

  return (
    <div className="space-y-8 relative">
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Cola Activa</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Transacciones PENDING o PROCESSING</p>
              </div>
              <button 
                onClick={() => loadQueue()} 
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="Actualizar Cola"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="h-10 bg-slate-100 rounded-md animate-pulse"></div>
                <div className="h-10 bg-slate-100 rounded-md animate-pulse"></div>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-700">Cola de Sincronización Vacía</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                  Todos los canales están al día. No hay transacciones pendientes de procesar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedVenta(item)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-center justify-between ${
                      selectedVenta?.id === item.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate font-mono">{item.external_id}</span>
                      <span className="text-[10px] text-slate-500 mt-1 font-semibold block uppercase font-mono">SKU: {item.sku} (Cant: {item.cantidad})</span>
                    </div>
                    <div>
                      {item.status === 'PROCESSING' ? (
                        <Loader2 size={16} className="text-blue-500 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-600 uppercase font-mono">En cola</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <button
              onClick={() => loadQueue()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar Cola
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedVenta ? (
            <div className="space-y-6">
              <ActivityTimeline venta={selectedVenta} />

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-6">Esquema Arquitectura Saga (Flujo de Datos)</h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50 w-full sm:w-28 text-center shadow-xs">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono ${
                      selectedVenta.origen === 'shopify' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {selectedVenta.origen}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 truncate w-full font-mono">{selectedVenta.external_id}</span>
                  </div>

                  <ArrowRight size={20} className="text-slate-300 hidden sm:block stroke-[2.5]" />

                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.sae_decremented 
                      ? 'border-green-200 bg-green-50/50 shadow-xs' 
                      : selectedVenta.status === 'PROCESSING' ? 'border-blue-300 bg-blue-50/50 animate-pulse' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">CONTPAQi SAE</span>
                    <span className="text-[10px] font-bold text-slate-700">Stock Decrementado</span>
                  </div>

                  <ArrowRight size={20} className="text-slate-300 hidden sm:block stroke-[2.5]" />

                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.shopify_synced 
                      ? 'border-green-200 bg-green-50/50 shadow-xs' 
                      : selectedVenta.status === 'PROCESSING' && selectedVenta.sae_decremented ? 'border-blue-300 bg-blue-50/50 animate-pulse' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Shopify</span>
                    <span className="text-[10px] font-bold text-slate-700">Stock Sincronizado</span>
                  </div>

                  <ArrowRight size={20} className="text-slate-300 hidden sm:block stroke-[2.5]" />

                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.ml_synced 
                      ? 'border-green-200 bg-green-50/50 shadow-xs' 
                      : selectedVenta.status === 'PROCESSING' && selectedVenta.shopify_synced ? 'border-blue-300 bg-blue-50/50 animate-pulse' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Mercado Libre</span>
                    <span className="text-[10px] font-bold text-slate-700">Stock Sincronizado</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[450px]">
              <Layers size={40} className="text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-700">Ninguna Transacción Seleccionada</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                Seleccione una transacción activa de la cola de la izquierda para auditar el flujo de sincronización atómica entre canales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
