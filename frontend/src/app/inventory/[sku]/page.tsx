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
  Search
} from 'lucide-react';
import Link from 'next/link';
import { getInventoryItem, Product } from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface ProductDetail extends Product {
  sync_status: 'MATCH' | 'DESYNC' | 'PENDING' | 'LOCAL_ONLY' | 'UNLINKED';
}

export default function ProductDetailPage() {
  const { sku } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulación de carga de datos
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        // En una implementación real, aquí llamaríamos a la API
        // const productData = await getInventoryItem(sku as string);
        
        // Simulación de datos
        setTimeout(() => {
          setProduct({
            sku: sku as string,
            nombre: 'Tarjeta Gráfica NVIDIA RTX 4090 24GB',
            stock: 1,
            categoria: 'Componentes',
            subcategoria: 'Tarjetas Gráficas',
            marca: 'NVIDIA',
            precio: 1299.0,
            costo: 850.0,
            margen: 34.4,
            codigo_barras: '1234567890128',
            estado: 'Activo',
            shopify_inventory_item_id: 'gid://shopify/InventoryItem/123456789',
            ml_item_id: 'MLM123456789',
            sync_status: 'MATCH'
          } as ProductDetail);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error loading product:', error);
        setLoading(false);
      }
    };

    if (sku) {
      loadProduct();
    }
  }, [sku]);

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
              <div className="text-[10px] text-[#8e95a5] uppercase">Stock Central</div>
              <div className="text-xl font-bold text-white mt-1">{product.stock}</div>
              <div className="text-[10px] text-[#555d6e]">Unidades disponibles</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Precio Venta</div>
              <div className="text-xl font-bold text-white mt-1">${product.precio?.toFixed(2)}</div>
              <div className="text-[10px] text-[#555d6e]">USD</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Margen Bruto</div>
              <div className="text-xl font-bold text-white mt-1">{product.margen}%</div>
              <div className="text-[10px] text-[#555d6e]">Porcentaje de ganancia</div>
            </div>
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <div className="text-[10px] text-[#8e95a5] uppercase">Estado Sincronización</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Info */}
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <h2 className="text-sm font-bold mb-3 font-mono-code">Información Básica</h2>
              <div className="space-y-2 text-xs">
                <div><span className="text-[#8e95a5]">Nombre:</span> {product.nombre}</div>
                <div><span className="text-[#8e95a5]">Categoría:</span> {product.categoria}</div>
                <div><span className="text-[#8e95a5]">Subcategoría:</span> {product.subcategoria}</div>
                <div><span className="text-[#8e95a5]">Marca:</span> {product.marca}</div>
                <div><span className="text-[#8e95a5]">Código de Barras:</span> {product.codigo_barras}</div>
                <div><span className="text-[#8e95a5]">Estado:</span> {product.estado}</div>
              </div>
            </div>

            {/* Channel Links */}
            <div className="border border-[#20242c] bg-[#0d0e12] p-4 shadow-hard">
              <h2 className="text-sm font-bold mb-3 font-mono-code">Vinculación Multicanal</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8e95a5]">Shopify ID:</span>
                  <span className="truncate max-w-[120px]">{product.shopify_inventory_item_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e95a5]">Mercado Libre ID:</span>
                  <span className="truncate max-w-[120px]">{product.ml_item_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> VER HISTORIAL DE MOVIMIENTOS
            </button>
            <button className="px-4 py-2 border border-[#20242c] bg-[#12141a] hover:bg-[#1a1e27] text-[#8e95a5] font-mono-code text-xs flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> FORZAR SINCRONIZACIÓN
            </button>
          </div>
        </>
      )}
    </div>
  );
}