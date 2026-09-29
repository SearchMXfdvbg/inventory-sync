'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  RefreshCw,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { 
  getSales, 
  getInventory, 
  Product, 
  Venta 
} from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Toast, { ToastProps } from '@/components/Toast';

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Venta[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const salesData = await getSales();
      const productsData = await getInventory();
      setSales(salesData);
      setProducts(productsData);
    } catch (error: any) {
      addToast('Error al cargar transacciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = 
      sale.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.external_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = originFilter === 'all' || sale.origen === originFilter;
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesOrigin && matchesStatus;
  });

  return (
    <div className="space-y-6 relative">
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU o ID..."
              className="pl-9 pr-4 py-1.5 w-full border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold font-mono"
          >
            <option value="all">Todos los Orígenes</option>
            <option value="shopify">Shopify</option>
            <option value="mercadolibre">Mercado Libre</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="amazon">Amazon SP-API</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold font-mono"
          >
            <option value="all">Todos los Estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="PROCESSED">Procesado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>

        <button
          onClick={loadData}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar Ventas
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">External ID</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4">Estado Saga</th>
                <th className="py-3 px-4 text-center">Reintentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4">
                    <LoadingSkeleton variant="table" />
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    No hay transacciones de venta registradas
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                        sale.origen === 'shopify' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' :
                        sale.origen === 'mercadolibre' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' :
                        sale.origen === 'tiktok' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60' :
                        sale.origen === 'amazon' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60' :
                        'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                      }`}>
                        {sale.origen}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">{sale.external_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-100 font-semibold">{sale.sku}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-100">{sale.cantidad}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500 dark:text-slate-400">
                      {sale.attempts} / 5
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
