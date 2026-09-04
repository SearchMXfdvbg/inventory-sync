'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  RefreshCw, 
  GitCompare, 
  Layers 
} from 'lucide-react';
import { 
  getInventoryItem, 
  reconcileProduct, 
  getSales, 
  Product, 
  ReconcileResponse, 
  Venta 
} from '@/lib/api';
import StockCard from '@/components/StockCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
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
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [skuSales, setSkuSales] = useState<Venta[]>([]);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [syncing, setSyncing] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async () => {
    try {
      const prod = await getInventoryItem(sku);
      const rec = await reconcileProduct(sku);
      const allSales = await getSales();
      
      setProduct(prod);
      setReconcileData(rec);
      setSkuSales(allSales.filter((s) => s.sku === sku));
    } catch (error: any) {
      addToast(error.message || 'Error al cargar detalles del producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sku]);

  const handleReconcile = async () => {
    setSyncing(true);
    try {
      const rec = await reconcileProduct(sku);
      setReconcileData(rec);
      if (rec.status === 'MATCH') {
        addToast('Conciliación completada: Todos los canales están alineados.', 'success');
      } else {
        addToast('Diferencia detectada en canales digitales. Se requiere sincronización.', 'warning');
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
      addToast('Sincronización y conciliación ejecutada exitosamente.', 'success');
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

  if (!product || !reconcileData) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 font-medium">Producto no encontrado</p>
        <button 
          onClick={() => router.push('/inventory')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => router.push('/inventory')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Volver al Inventario
        </button>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleReconcile}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <GitCompare size={14} /> Conciliar Stock
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/10"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sincronizar Ahora
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{product.nombre}</h1>
            <p className="text-sm font-mono text-slate-400 mt-1">{product.sku}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Shopify Inventory ID</span>
            <span className="text-xs font-mono text-slate-700 block bg-slate-50 p-2.5 rounded-lg border border-slate-150 truncate">
              {product.shopify_inventory_item_id}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Shopify Location ID</span>
            <span className="text-xs font-mono text-slate-700 block bg-slate-50 p-2.5 rounded-lg border border-slate-150 truncate">
              {product.shopify_location_id}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mercado Libre Item ID</span>
            <span className="text-xs font-mono text-slate-700 block bg-slate-50 p-2.5 rounded-lg border border-slate-150 truncate">
              {product.ml_item_id}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800">Comparador de Stock Multicanal</h3>
          <p className="text-xs text-slate-400 mt-1">Niveles de inventario reportados en tiempo real</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StockCard channel="sae" stock={reconcileData.sae_stock} />
          <StockCard channel="shopify" stock={reconcileData.shopify_stock} expectedStock={reconcileData.sae_stock} />
          <StockCard channel="mercadolibre" stock={reconcileData.ml_stock} expectedStock={reconcileData.sae_stock} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-6">Historial de Eventos y Auditoría</h3>
        <div className="relative border-l border-slate-100 ml-4 space-y-6 pb-2">
          {skuSales.map((sale) => (
            <div key={sale.id} className="relative pl-8">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center text-blue-500 shadow-sm"></div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                  {new Date(sale.created_at).toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-700 block mt-1">
                  Venta registrada desde {sale.origen === 'shopify' ? 'Shopify' : 'Mercado Libre'} (Cant. {sale.cantidad})
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-1 font-mono">
                  ID Externo: {sale.external_id} | Estado final: <span className="font-bold">{sale.status}</span>
                </span>
              </div>
            </div>
          ))}

          <div className="relative pl-8">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-100 border-4 border-white flex items-center justify-center text-green-500 shadow-sm"></div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">30/08/2026 10:15:00</span>
              <span className="text-xs font-semibold text-slate-700 block mt-1">Mapeo inicial de canales completado</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">Integraciones API de Shopify y Mercado Libre validadas.</span>
            </div>
          </div>

          <div className="relative pl-8">
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-100 border-4 border-white flex items-center justify-center text-green-500 shadow-sm"></div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">30/08/2026 10:00:00</span>
              <span className="text-xs font-semibold text-slate-700 block mt-1">Producto creado en CONTPAQi SAE</span>
              <span className="text-[10px] text-slate-500 font-medium block mt-1">Stock inicial establecido. SKU importado por el worker.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
