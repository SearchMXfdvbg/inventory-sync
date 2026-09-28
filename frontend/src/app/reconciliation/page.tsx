'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertTriangle, CheckCircle2, Database, ShoppingCart } from 'lucide-react';
import { getInventory, Product } from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface ReconcileItem extends Product {
  status: 'MATCH' | 'DESYNC';
  sae_stock: number;
  shopify_stock: number;
  ml_stock: number;
}

export default function ReconciliationPage() {
  const [items, setItems] = useState<ReconcileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const products = await getInventory();
      
      // Simular datos de conciliación
      const reconciledItems: ReconcileItem[] = products.map(product => ({
        ...product,
        status: 'MATCH' as 'MATCH', // En una implementación real, esto vendría de la API
        sae_stock: product.stock,
        shopify_stock: product.shopify_stock ?? product.stock,
        ml_stock: product.ml_stock ?? product.stock,
      }));
      
      setItems(reconciledItems);
    } catch (error: any) {
      console.error('Error al cargar inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter(item => 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: 'MATCH' | 'DESYNC') => {
    switch (status) {
      case 'MATCH':
        return <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />;
      case 'DESYNC':
        return <AlertTriangle className="w-4 h-4 text-[#ff3b00]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-[#555d6e]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-mono-code">CONCILIACIÓN DE INVENTARIOS</h1>
        <button 
          onClick={loadData}
          className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> EJECUTAR CONCILIACIÓN
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
            placeholder="Buscar por SKU o nombre..."
            className="w-full pl-8 pr-3 py-2 bg-[#090a0c] border border-[#20242c] font-mono-code text-xs text-[#a1a7b5] focus:outline-none focus:border-[#00ff66]"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 mb-2 px-4 font-mono-code text-[10px] text-[#555d6e] uppercase tracking-widest">
        <div className="col-span-2">SKU</div>
        <div className="col-span-4">Nombre</div>
        <div className="col-span-1 text-center">SAE</div>
        <div className="col-span-1 text-center">Shopify</div>
        <div className="col-span-1 text-center">Mercado Libre</div>
        <div className="col-span-2 text-center">Estado</div>
        <div className="col-span-1 text-center">Acciones</div>
      </div>

      {/* Product Rows */}
      <div className="border border-[#20242c] bg-[#0d0e12] shadow-hard">
        {loading ? (
          <div className="p-8 text-center text-[#555d6e]">
            <LoadingSkeleton />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-[#555d6e]">No hay productos para conciliar</div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.sku}
              className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-[#20242c] last:border-b-0 hover:bg-[#14171e]/50 transition-colors"
            >
              <div className="col-span-2 font-mono-code text-xs truncate">{item.sku}</div>
              <div className="col-span-4 font-mono-code text-xs truncate">{item.nombre}</div>
              <div className="col-span-1 text-center font-mono-code text-xs">{item.sae_stock}</div>
              <div className="col-span-1 text-center font-mono-code text-xs">{item.shopify_stock}</div>
              <div className="col-span-1 text-center font-mono-code text-xs">{item.ml_stock}</div>
              <div className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {getStatusIcon(item.status)}
                  <span className="font-mono-code text-xs">
                    {item.status === 'MATCH' ? 'Sincronizado' : 'Desincronizado'}
                  </span>
                </div>
              </div>
              <div className="col-span-1 text-center">
                <button className="text-[#8e95a5] hover:text-white">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}