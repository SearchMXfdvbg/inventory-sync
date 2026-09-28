'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  getSales, 
  Venta 
} from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Venta[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const salesData = await getSales();
      setSales(salesData);
    } catch (error: any) {
      console.error('Error al cargar transacciones:', error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-[#ff3b00]" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-[#f59e0b]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-[#555d6e]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">ÓRDENES DE VENTA</h1>
        <button 
          onClick={loadData}
          className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> ACTUALIZAR VENTAS
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 border border-[#20242c] bg-[#0d0e12] shadow-hard">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555d6e]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID de orden o SKU..."
            className="w-full pl-8 pr-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          >
            <option value="all">Todos los Orígenes</option>
            <option value="shopify">Shopify</option>
            <option value="mercadolibre">Mercado Libre</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="amazon">Amazon SP-API</option>
            <option value="ebay">eBay</option>
            <option value="kaufland">Kaufland</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          >
            <option value="all">Todos los Estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="PROCESSED">Procesado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 mb-2 px-4 font-mono-code text-[10px] text-[#555d6e] uppercase tracking-widest">
        <div className="col-span-2">Fecha</div>
        <div className="col-span-2">Canal</div>
        <div className="col-span-3">ID Externo</div>
        <div className="col-span-2">SKU</div>
        <div className="col-span-1 text-center">Cantidad</div>
        <div className="col-span-1 text-center">Estado</div>
        <div className="col-span-1 text-center">Reintentos</div>
      </div>

      {/* Sales Rows */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        {loading ? (
          <div className="p-8 text-center text-[#555d6e]">Cargando órdenes de venta...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-[#555d6e]">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No hay órdenes de venta registradas
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0 hover:bg-[#14171e]/50 transition-colors"
            >
              <div className="col-span-2 font-mono-code text-xs">
                {new Date(sale.created_at).toLocaleDateString()}
              </div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 font-mono-code text-[10px] uppercase ${
                  sale.origen === 'shopify' ? 'bg-emerald-500/20 text-emerald-400' :
                  sale.origen === 'mercadolibre' ? 'bg-yellow-500/20 text-yellow-400' :
                  sale.origen === 'tiktok' ? 'bg-pink-500/20 text-pink-400' :
                  sale.origen === 'amazon' ? 'bg-orange-500/20 text-orange-400' :
                  sale.origen === 'ebay' ? 'bg-blue-500/20 text-blue-400' :
                  sale.origen === 'kaufland' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {sale.origen}
                </span>
              </div>
              <div className="col-span-3 font-mono-code text-xs truncate">{sale.external_id}</div>
              <div className="col-span-2 font-mono-code text-xs">{sale.sku}</div>
              <div className="col-span-1 text-center font-mono-code text-xs">{sale.cantidad}</div>
              <div className="col-span-1 text-center">
                <div className="flex items-center justify-center gap-1">
                  {getStatusIcon(sale.status)}
                  <span className="font-mono-code text-xs capitalize">{sale.status.toLowerCase()}</span>
                </div>
              </div>
              <div className="col-span-1 text-center font-mono-code text-xs text-[#8e95a5]">
                {sale.attempts} / 5
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}