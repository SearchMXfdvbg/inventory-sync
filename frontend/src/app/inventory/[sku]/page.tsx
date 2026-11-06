'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Trash2,
  Activity,
  Database,
  ShoppingCart,
  Package,
  Search,
  Store,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { getInventoryItem, syncInventoryFromTiendanube, Product } from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface ProductDetail extends Product {
  sync_status: 'MATCH' | 'DESYNC' | 'PENDING' | 'LOCAL_ONLY' | 'UNLINKED';
}

export default function ProductDetailPage() {
  const { sku } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingTN, setSyncingTN] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProduct = async () => {
    if (!sku) return;
    try {
      setLoading(true);
      const productData = await getInventoryItem(sku as string);
      setProduct({
        ...productData,
        sync_status: (productData.sync_status as any) || 'MATCH'
      });
    } catch (error: any) {
      console.error('Error loading product:', error);
      showToast(error.message || 'Error al cargar el producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [sku]);

  const handleSyncTiendanube = async () => {
    setSyncingTN(true);
    try {
      showToast('Sincronizando catálogo con Tiendanube...', 'success');
      const res = await syncInventoryFromTiendanube();
      showToast(res.message || 'Sincronizado con Tiendanube', 'success');
      await loadProduct();
    } catch (err: any) {
      showToast(`Error al sincronizar con Tiendanube: ${err.message || err}`, 'error');
    } finally {
      setSyncingTN(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
        <div className="text-center py-12 text-[#555d6e]">Producto no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#ededed] p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 border shadow-hard text-xs font-bold transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-[#00ff66]/10 text-emerald-800 dark:text-[#00ff66] border-emerald-300 dark:border-[#00ff66]/50' 
            : 'bg-rose-50 dark:bg-[#ff3b00]/10 text-rose-800 dark:text-[#ff3b00] border-rose-300 dark:border-[#ff3b00]/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Back Button */}
      <div className="mb-6">
        <Link href="/inventory" className="flex items-center gap-2 text-[#8e95a5] hover:text-white font-mono-code text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> REGRESAR AL INVENTARIO
        </Link>
      </div>

      {product && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold font-mono-code">{product.sku}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncTiendanube}
                disabled={syncingTN}
                className="px-3 py-2 border border-[#0050C3]/40 bg-[#0050C3]/10 hover:bg-[#0050C3]/20 text-[#3884ff] font-mono-code text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {syncingTN ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Store className="w-3.5 h-3.5 text-[#3884ff]" />}
                <span>{syncingTN ? 'SINCRONIZANDO...' : 'SYNC TIENDANUBE'}</span>
              </button>
              <button className="px-3 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5" /> EDITAR
              </button>
              <button className="px-3 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> ELIMINAR
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Existencias en Almacén</div>
              <div className="text-xl font-bold text-white mt-1">{product.stock}</div>
              <div className="text-[10px] text-[#555d6e]">Unidades físicas centrales</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Precio Venta</div>
              <div className="text-xl font-bold text-white mt-1">{product.precio !== undefined ? `$${product.precio.toFixed(2)}` : '—'}</div>
              <div className="text-[10px] text-[#555d6e]">Moneda local</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Margen Bruto</div>
              <div className="text-xl font-bold text-white mt-1">{product.margen !== undefined ? `${product.margen}%` : '—'}</div>
              <div className="text-[10px] text-[#555d6e]">Porcentaje de ganancia</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Estado de Sincronización</div>
              <div className="flex items-center gap-2 mt-1">
                {product.sync_status === 'MATCH' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#ff3b00]" />
                )}
                <span className="text-xs">
                  {product.sync_status === 'MATCH' ? 'Sincronizado' : 'Desincronizado'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Basic Info */}
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <h2 className="text-sm font-bold mb-3 font-mono-code">Información Básica</h2>
              <div className="space-y-2 text-xs">
                <div><span className="text-[#8e95a5]">Nombre:</span> {product.nombre}</div>
                <div><span className="text-[#8e95a5]">Categoría:</span> {product.categoria || 'Sin categoría'}</div>
                <div><span className="text-[#8e95a5]">Subcategoría:</span> {product.subcategoria || '—'}</div>
                <div><span className="text-[#8e95a5]">Marca:</span> {product.marca || '—'}</div>
                <div><span className="text-[#8e95a5]">Código de Barras:</span> {product.codigo_barras || '—'}</div>
                <div><span className="text-[#8e95a5]">Estado:</span> {product.estado || 'Activo'}</div>
              </div>
            </div>

            {/* Channel Links */}
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <h2 className="text-sm font-bold mb-3 font-mono-code">Vinculación Multicanal</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#8e95a5]">Shopify ID:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-200" title={product.shopify_inventory_item_id}>{product.shopify_inventory_item_id || 'No vinculado'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#8e95a5]">Mercado Libre ID:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-200" title={product.ml_item_id}>{product.ml_item_id || 'No vinculado'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#8e95a5]">Amazon ASIN:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-200" title={product.amazon_asin}>{product.amazon_asin || 'No vinculado'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#0050C3] dark:text-[#3884ff] font-bold">Tiendanube ID:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-[#3884ff]" title={product.tiendanube_variant_id}>{product.tiendanube_variant_id || 'No vinculado'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#8e95a5]">eBay ID:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-200" title={product.ebay_item_id}>{product.ebay_item_id || 'No vinculado'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#8e95a5]">Kaufland ID:</span>
                  <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-200" title={product.kaufland_offer_id}>{product.kaufland_offer_id || 'No vinculado'}</span>
                </div>
              </div>
            </div>

            {/* Stock by Channel */}
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <h2 className="text-sm font-bold mb-3 font-mono-code">Existencias por Canal</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8e95a5]">Stock Central (Físico):</span>
                  <span className="font-bold font-mono text-[#00ff66]">{product.stock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8e95a5]">Stock Shopify:</span>
                  <span className="font-bold font-mono">{product.shopify_stock ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8e95a5]">Stock Mercado Libre:</span>
                  <span className="font-bold font-mono">{product.ml_stock ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#3884ff] font-bold">Stock Tiendanube:</span>
                  <span className="font-bold font-mono text-[#3884ff]">{product.tiendanube_stock ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8e95a5]">Stock Amazon:</span>
                  <span className="font-bold font-mono">{product.amazon_stock ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8e95a5]">Stock eBay:</span>
                  <span className="font-bold font-mono">{product.ebay_stock ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> HISTORIAL DE MOVIMIENTOS
            </button>
            <Link
              href={`/reconciliation?sku=${encodeURIComponent(product.sku)}`}
              className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#00ff66] font-mono-code text-xs flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> AUDITAR EN CONCILIACIÓN
            </Link>
          </div>
        </>
      )}
    </div>
  );
}