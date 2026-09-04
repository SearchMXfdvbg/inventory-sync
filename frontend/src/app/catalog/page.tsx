'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Layers, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Scale,
  Box,
  Tag,
  Check,
  Info,
  Zap
} from 'lucide-react';
import { 
  getCatalogProducts, 
  bulkUpdateCatalog, 
  CatalogProduct, 
  BulkCatalogUpdateRequest 
} from '@/lib/api';

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk Edit Form State
  const [brand, setBrand] = useState('Haros');
  const [length, setLength] = useState('15');
  const [width, setWidth] = useState('10');
  const [height, setHeight] = useState('3');
  const [weight, setWeight] = useState('150');
  const [weightUnit, setWeightUnit] = useState('GRAMS');
  const [warrantyType, setWarrantyType] = useState('Garantía del vendedor');
  const [warrantyPeriod, setWarrantyPeriod] = useState('30 días');
  const [targetAudience, setTargetAudience] = useState('Adultos');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getCatalogProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle selection
  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Quick Presets
  const applyPreset = (type: 'joyeria' | 'ropa' | 'estandar') => {
    if (type === 'joyeria') {
      setLength('15');
      setWidth('10');
      setHeight('3');
      setWeight('150');
      setWarrantyPeriod('30 días');
      setTargetAudience('Adultos');
    } else if (type === 'ropa') {
      setLength('35');
      setWidth('25');
      setHeight('5');
      setWeight('300');
      setWarrantyPeriod('30 días');
      setTargetAudience('Unisex');
    } else if (type === 'estandar') {
      setLength('25');
      setWidth('20');
      setHeight('15');
      setWeight('500');
      setWarrantyPeriod('60 días');
      setTargetAudience('Adultos');
    }
  };

  // Bulk Apply Attributes
  const handleBulkApply = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);

    const payload: BulkCatalogUpdateRequest = {
      product_ids: selectedIds,
      brand: brand || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      weight_unit: weightUnit,
      length: length ? parseFloat(length) : undefined,
      width: width ? parseFloat(width) : undefined,
      height: height ? parseFloat(height) : undefined,
      warranty_type: warrantyType || undefined,
      warranty_period: warrantyPeriod || undefined,
      target_audience: targetAudience || undefined,
    };

    try {
      const res = await bulkUpdateCatalog(payload);
      showToast(res.message || `¡${selectedIds.length} productos actualizados con éxito para TikTok Shop!`);
      setSelectedIds([]);
      await loadProducts();
    } catch (err: any) {
      showToast(`Error al actualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Auto-Fix Inteligente TikTok: Ajusta dimensiones al tope de 99cm, normaliza peso a 150g y aplica garantía
  const handleAutoFixTikTok = async () => {
    const targets = selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    if (targets.length === 0) return;
    setSaving(true);

    const payload: BulkCatalogUpdateRequest = {
      product_ids: targets,
      brand: brand || 'Haros',
      weight: 150,
      weight_unit: 'GRAMS',
      length: 99,
      width: 50,
      height: 25,
      warranty_type: 'Garantía del vendedor',
      warranty_period: '30 días',
      target_audience: 'Adultos',
    };

    try {
      const res = await bulkUpdateCatalog(payload);
      showToast(res.message || `⚡ ¡Auto-Fix aplicado a ${targets.length} productos! Listos para TikTok Shop.`);
      setSelectedIds([]);
      await loadProducts();
    } catch (err: any) {
      showToast(`Error al aplicar Auto-Fix: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Export CSV for TikTok Shop Seller Center
  const handleExportTikTokCSV = () => {
    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Brand',
      'Package Weight (g)',
      'Package Length (cm)',
      'Package Width (cm)',
      'Package Height (cm)',
      'Warranty Type',
      'Warranty Period',
      'TikTok Status'
    ];

    const rows = filteredProducts.map((p) => {
      const sku = p.variants?.[0]?.sku || 'SIN_SKU';
      return [
        `"${p.id}"`,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${sku}"`,
        `"${p.vendor || 'Haros'}"`,
        p.weight || 150,
        p.length || 15,
        p.width || 10,
        p.height || 3,
        `"${p.warranty ? p.warranty.split(' - ')[0] : 'Garantía del vendedor'}"`,
        `"${p.warranty ? p.warranty.split(' - ')[1] || '30 días' : '30 días'}"`,
        p.tiktok_ready ? 'Listo para publicar' : 'Pendiente'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tiktok_shop_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Plantilla CSV para TikTok Shop descargada con éxito');
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.variants?.[0]?.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ready') return p.tiktok_ready;
    if (statusFilter === 'pending') return !p.tiktok_ready;
    return true;
  });

  const totalCount = products.length;
  const readyCount = products.filter((p) => p.tiktok_ready).length;
  const pendingCount = totalCount - readyCount;
  const complianceRate = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catálogo y Preparador TikTok Shop</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Inyecta especificaciones obligatorias (medidas, peso, garantía, marca) en lote sin tener que entrar producto por producto.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors border border-slate-200 shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span>Recargar</span>
          </button>
          <button
            onClick={handleExportTikTokCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Exportar CSV TikTok</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Productos</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Catálogo de Shopify</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Package size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Listos para TikTok</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{readyCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Con medidas y peso</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pendientes de Medidas</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Faltan especificaciones</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Cumplimiento TikTok</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{complianceRate}%</h3>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Layers size={22} />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center border border-blue-100 shadow-sm">
              {selectedIds.length}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedIds.length > 0 
                  ? `${selectedIds.length} producto${selectedIds.length > 1 ? 's' : ''} seleccionado${selectedIds.length > 1 ? 's' : ''} para edición en lote`
                  : 'Edición y Asignación Masiva de Especificaciones'}
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona productos en la tabla y asigna medidas, peso y garantía de un solo golpe.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">Plantillas rápidas:</span>
            <button
              onClick={handleAutoFixTikTok}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Zap size={13} />
              <span>⚡ Auto-Fix TikTok (Tope 99cm)</span>
            </button>
            <button
              onClick={() => applyPreset('joyeria')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              ✨ Joyería / Accesorios
            </button>
            <button
              onClick={() => applyPreset('ropa')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              👕 Ropa / Textil
            </button>
            <button
              onClick={() => applyPreset('estandar')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              📦 Caja Estándar
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-blue-600" />
              Marca / Vendor
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ej. Haros"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Scale size={13} className="text-blue-600" />
              Peso (gramos)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="ej. 150"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Box size={13} className="text-blue-600" />
              Largo (cm)
            </label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="ej. 15"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Box size={13} className="text-blue-600" />
              Ancho (cm)
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="ej. 10"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Box size={13} className="text-blue-600" />
              Alto (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="ej. 3"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-600" />
              Garantía
            </label>
            <input
              type="text"
              value={warrantyPeriod}
              onChange={(e) => setWarrantyPeriod(e.target.value)}
              placeholder="ej. 30 días"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Action Button Row */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={15} className="text-blue-600" />
            <span>Al aplicar, se actualizarán las variantes en Shopify y se inyectarán los campos requeridos por TikTok Shop.</span>
          </div>

          <button
            onClick={handleBulkApply}
            disabled={saving || selectedIds.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedIds.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-98'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Aplicando a {selectedIds.length} productos...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Aplicar en Lote a ({selectedIds.length}) seleccionados</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, SKU o marca..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Listos ({readyCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 font-semibold">Producto</th>
                <th className="py-4 px-4 font-semibold">SKU / Precio</th>
                <th className="py-4 px-4 font-semibold">Marca</th>
                <th className="py-4 px-4 font-semibold">Peso</th>
                <th className="py-4 px-4 font-semibold">Dimensiones (cm)</th>
                <th className="py-4 px-4 font-semibold">Garantía</th>
                <th className="py-4 px-4 font-semibold text-center">Estado TikTok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span className="text-sm">Cargando catálogo de productos...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Catálogo Vacío</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No hay productos registrados aún. Conecta tu tienda Shopify en Configuración para sincronizar tus productos reales.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const firstVariant = p.variants?.[0] || {};
                  const sku = firstVariant.sku || 'Sin SKU';
                  const price = firstVariant.price ? `$${firstVariant.price}` : '--';
                  const dimensions = (p.length && p.width && p.height) 
                    ? `${p.length} × ${p.width} × ${p.height}` 
                    : '--';
                  const weightDisplay = p.weight && p.weight > 0 
                    ? `${p.weight} ${p.weight_unit || 'g'}` 
                    : '--';

                  const cleanTitle = p.title.replace(/\s*\(Demo\)/gi, '').replace(/-Demo/gi, '').replace(/\s+Demo/gi, '');

                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={cleanTitle}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <Package size={18} />
                            </div>
                          )}
                          <div className="max-w-xs sm:max-w-md truncate">
                            <p className="font-semibold text-slate-900 truncate text-sm">{cleanTitle}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.tags.slice(0, 2).map((t, idx) => (
                                <span key={idx} className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded border border-slate-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <p className="text-xs font-mono font-semibold text-slate-800">{sku}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{price}</p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-700 font-medium">{p.vendor || 'Haros'}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`text-xs font-medium ${p.weight && p.weight > 0 ? 'text-slate-800' : 'text-amber-600 font-semibold'}`}>
                          {weightDisplay}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`text-xs font-medium ${dimensions !== '--' ? 'text-slate-800' : 'text-amber-600 font-semibold'}`}>
                          {dimensions}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 truncate max-w-[140px] block" title={p.warranty || ''}>
                          {p.warranty || '--'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {p.tiktok_ready ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={13} />
                            Listo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={13} />
                            Faltan datos
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
