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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0d0e12] p-5 border border-slate-200 dark:border-[#20242c] shadow-hard flex flex-col justify-between min-h-[450px] transition-colors">
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-[#20242c]">
              <div>
                <h3 className="font-bold font-mono-code text-sm uppercase tracking-wider text-slate-800 dark:text-white">Cola de Sincronización</h3>
                <p className="text-[11px] text-slate-400 dark:text-[#8e95a5] mt-0.5 font-mono-code">Transacciones PENDING o PROCESSING</p>
              </div>
              <button 
                onClick={() => loadQueue()} 
                className="p-1.5 border border-slate-200 dark:border-[#20242c] hover:border-[#00ff66]/40 text-slate-400 hover:text-[#00ff66] transition-colors cursor-pointer"
                title="Actualizar Cola"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 dark:bg-[#14171e] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
                <div className="h-12 bg-slate-100 dark:bg-[#14171e] border border-slate-200 dark:border-[#20242c] animate-pulse"></div>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={32} className="text-[#00ff66] mx-auto mb-3" />
                <h4 className="text-xs font-bold font-mono-code uppercase text-slate-700 dark:text-slate-300">Cola al Día</h4>
                <p className="text-[11px] text-slate-400 dark:text-[#8e95a5] mt-1 max-w-[220px] mx-auto font-mono-code leading-normal">
                  Todos los canales están sincronizados en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedVenta(item)}
                    className={`w-full text-left p-3 border transition-all flex items-center justify-between cursor-pointer font-mono-code ${
                      selectedVenta?.id === item.id
                        ? 'border-[#00ff66] bg-[#00ff66]/10 text-white shadow-hard'
                        : 'border-slate-200 dark:border-[#20242c] hover:bg-slate-50 dark:hover:bg-[#14171e]'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">{item.external_id}</span>
                      <span className="text-[10px] text-slate-500 dark:text-[#8e95a5] mt-0.5 block uppercase">SKU: {item.sku} (Cant: {item.cantidad})</span>
                    </div>
                    <div>
                      {item.status === 'PROCESSING' ? (
                        <Loader2 size={15} className="text-[#00ff66] animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500 uppercase px-1.5 py-0.5 border border-amber-500/30 bg-amber-500/10">En cola</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-[#20242c] pt-4 mt-6">
            <button
              onClick={() => loadQueue()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00ff66] hover:bg-[#00e65c] text-black font-bold font-mono-code text-xs shadow-hard border border-[#00ff66] transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> REFRESCAR COLA SAGA
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedVenta ? (
            <div className="space-y-6">
              <ActivityTimeline venta={selectedVenta} />

              <div className="bg-white dark:bg-[#0d0e12] p-5 border border-slate-200 dark:border-[#20242c] shadow-hard transition-colors">
                <h3 className="font-bold font-mono-code text-xs uppercase tracking-wider text-slate-800 dark:text-white mb-5">Flujo Saga: Transacciones entre Canales</h3>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 font-mono-code">
                  <div className="flex flex-col items-center gap-2 p-3 border border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#14171e] w-full sm:w-28 text-center shadow-hard">
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                      selectedVenta.origen === 'shopify' ? 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {selectedVenta.origen}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate w-full">{selectedVenta.external_id}</span>
                  </div>

                  <ArrowRight size={18} className="text-slate-400 dark:text-[#8e95a5] hidden sm:block" />

                  <div className={`flex flex-col items-center gap-2 p-3 border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.sae_decremented 
                      ? 'border-[#00ff66]/60 bg-[#00ff66]/10 text-[#00ff66] shadow-hard' 
                      : selectedVenta.status === 'PROCESSING' ? 'border-blue-400 bg-blue-950/20 animate-pulse' : 'border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#14171e]'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 dark:text-[#8e95a5] uppercase tracking-wider">CONTPAQi SAE</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Stock Decrementado</span>
                  </div>

                  <ArrowRight size={18} className="text-slate-400 dark:text-[#8e95a5] hidden sm:block" />

                  <div className={`flex flex-col items-center gap-2 p-3 border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.shopify_synced 
                      ? 'border-[#00ff66]/60 bg-[#00ff66]/10 text-[#00ff66] shadow-hard' 
                      : selectedVenta.status === 'PROCESSING' && selectedVenta.sae_decremented ? 'border-blue-400 bg-blue-950/20 animate-pulse' : 'border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#14171e]'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 dark:text-[#8e95a5] uppercase tracking-wider">Shopify</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Sincronizado</span>
                  </div>

                  <ArrowRight size={18} className="text-slate-400 dark:text-[#8e95a5] hidden sm:block" />

                  <div className={`flex flex-col items-center gap-2 p-3 border w-full sm:w-28 text-center transition-all ${
                    selectedVenta.ml_synced 
                      ? 'border-[#00ff66]/60 bg-[#00ff66]/10 text-[#00ff66] shadow-hard' 
                      : selectedVenta.status === 'PROCESSING' && selectedVenta.shopify_synced ? 'border-blue-400 bg-blue-950/20 animate-pulse' : 'border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#14171e]'
                  }`}>
                    <span className="text-[8px] font-bold text-slate-400 dark:text-[#8e95a5] uppercase tracking-wider">Mercado Libre</span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Sincronizado</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0d0e12] p-12 border border-slate-200 dark:border-[#20242c] shadow-hard text-center flex flex-col items-center justify-center min-h-[450px] transition-colors font-mono-code">
              <Layers size={36} className="text-slate-400 dark:text-[#20242c] mb-3" />
              <h3 className="font-bold text-sm uppercase text-slate-700 dark:text-slate-200">Ninguna Transacción Seleccionada</h3>
              <p className="text-xs text-slate-400 dark:text-[#8e95a5] max-w-sm mt-1 leading-relaxed">
                Selecciona una transacción activa de la cola para auditar el flujo Saga en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
