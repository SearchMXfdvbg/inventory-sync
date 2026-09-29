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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0d0e12] p-4 border border-slate-200 dark:border-[#20242c] shadow-hard transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-[#8e95a5]" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU o ID..."
              className="pl-9 pr-4 py-2 w-full border border-slate-200 dark:border-[#20242c] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#8e95a5]/60 bg-white dark:bg-[#090a0c] font-mono-code focus:outline-none focus:border-[#00ff66] transition-colors"
            />
          </div>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#090a0c] border border-slate-200 dark:border-[#20242c] py-2 px-3 focus:outline-none focus:border-[#00ff66] cursor-pointer font-bold font-mono-code uppercase"
          >
            <option value="all">TODOS LOS ORÍGENES</option>
            <option value="shopify">Shopify</option>
            <option value="mercadolibre">Mercado Libre</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="amazon">Amazon SP-API</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#090a0c] border border-slate-200 dark:border-[#20242c] py-2 px-3 focus:outline-none focus:border-[#00ff66] cursor-pointer font-bold font-mono-code uppercase"
          >
            <option value="all">TODOS LOS ESTADOS</option>
            <option value="PENDING">PENDIENTE</option>
            <option value="PROCESSING">PROCESANDO</option>
            <option value="PROCESSED">PROCESADO</option>
            <option value="FAILED">FALLIDO</option>
          </select>
        </div>

        <button
          onClick={loadData}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-[#00ff66] hover:bg-[#00e65c] text-black font-bold font-mono-code text-xs shadow-hard border border-[#00ff66] transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> REFRESCAR VENTAS
        </button>
      </div>

      <div className="bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] shadow-hard overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] text-[10px] font-bold text-slate-500 dark:text-[#8e95a5] uppercase tracking-widest font-mono-code">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">External ID</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4">Estado Saga</th>
                <th className="py-3 px-4 text-center">Reintentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#20242c] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4">
                    <LoadingSkeleton variant="table" />
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-[#8e95a5]">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <span className="font-mono-code uppercase text-xs">No hay transacciones de venta registradas</span>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-[#14171e] transition-colors">
                    <td className="py-3 px-4 text-slate-500 dark:text-[#8e95a5] whitespace-nowrap font-mono-code text-[11px]">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono-code border ${
                        sale.origen === 'shopify' ? 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/30' :
                        sale.origen === 'mercadolibre' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        sale.origen === 'tiktok' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        sale.origen === 'amazon' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {sale.origen}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono-code font-bold text-slate-700 dark:text-slate-200">{sale.external_id}</td>
                    <td className="py-3 px-4 font-mono-code text-slate-800 dark:text-slate-100 font-semibold">{sale.sku}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-100 font-mono-code">{sale.cantidad}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-3 px-4 text-center font-mono-code text-slate-500 dark:text-[#8e95a5]">
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
