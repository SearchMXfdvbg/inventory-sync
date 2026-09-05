'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  Layers, 
  Store, 
  Database, 
  ShoppingBag, 
  Video, 
  Globe2, 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ExternalLink,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { 
  getInventory, 
  getSettings, 
  Product, 
  SystemSettings, 
  importInventoryFile,
  downloadInventoryTemplate,
  exportProductsToExcel,
  isChannelConfigured,
  ImportInventoryResponse,
  syncAllProductsToChannels
} from '@/lib/api';
import FilterBar, { FilterBarCounts } from '@/components/FilterBar';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Filtros de estado
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'instock' | 'lowstock' | 'outofstock' | 'overstock' | 'desync' | 'local'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Selección múltiple para acciones en lote
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);

  // Modal de importación
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportInventoryResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronización Masiva
  const [isBulkSyncModalOpen, setIsBulkSyncModalOpen] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, percent: 0, statusText: '' });
  const [bulkResult, setBulkResult] = useState<{ updatedCount: number; channels: string[] } | null>(null);

  const handleStartBulkSync = async () => {
    setIsBulkSyncModalOpen(true);
    setIsBulkSyncing(true);
    setBulkResult(null);
    setBulkProgress({ current: 0, total: products.length, percent: 0, statusText: 'Iniciando sincronización por lotes...' });
    try {
      const res = await syncAllProductsToChannels((prog) => {
        setBulkProgress(prog);
      });
      setBulkResult(res);
      await fetchInventoryData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const [invData, settingsData] = await Promise.all([
        getInventory(),
        getSettings().catch(() => null)
      ]);
      const cleanInv = Array.isArray(invData) ? invData.filter(p => {
        const u = (p.sku || '').toUpperCase();
        return u && u !== 'SKU' && u !== 'CODIGO' && !u.includes('GENERADO') && !u.includes('PRODUCTOS UNICOS') && u.length <= 50;
      }) : [];
      setProducts(cleanInv);
      if (typeof window !== 'undefined' && Array.isArray(invData) && invData.length !== cleanInv.length) {
        localStorage.setItem('is_products', JSON.stringify(cleanInv));
      }
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error al obtener inventario', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Canales configurados realmente por el usuario
  const shopifyConnected = useMemo(() => isChannelConfigured('shopify', settings), [settings]);
  const amazonConnected = useMemo(() => isChannelConfigured('amazon', settings), [settings]);
  const ebayConnected = useMemo(() => isChannelConfigured('ebay', settings), [settings]);
  const kauflandConnected = useMemo(() => isChannelConfigured('kaufland', settings), [settings]);
  const mlConnected = useMemo(() => isChannelConfigured('mercadolibre', settings), [settings]);

  const activeChannelsCount = useMemo(() => {
    return [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected].filter(Boolean).length;
  }, [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected]);

  // Extraer categorías y marcas únicas del catálogo para los filtros
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.categoria && p.categoria.trim()) set.add(p.categoria.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.marca && p.marca.trim()) set.add(p.marca.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Conteos en vivo para las pestañas rápidas
  const counts: FilterBarCounts = useMemo(() => {
    return {
      total: products.length,
      inStock: products.filter(p => p.stock > 0).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
      outOfStock: products.filter(p => p.stock === 0).length,
      overStock: products.filter(p => p.stock > 100).length,
      desync: products.filter(p => p.sync_status === 'DESYNC').length,
      local: products.length
    };
  }, [products]);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (quickFilter !== 'all') count++;
    if (selectedCategory) count++;
    if (selectedBrand) count++;
    if (minStock) count++;
    if (maxStock) count++;
    return count;
  }, [searchQuery, quickFilter, selectedCategory, selectedBrand, minStock, maxStock]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setQuickFilter('all');
    setSelectedCategory('');
    setSelectedBrand('');
    setMinStock('');
    setMaxStock('');
    setCurrentPage(1);
  };

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Búsqueda universal
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchSku = (p.sku || '').toLowerCase().includes(query);
        const matchNombre = (p.nombre || '').toLowerCase().includes(query);
        const matchCat = (p.categoria || '').toLowerCase().includes(query);
        const matchMarca = (p.marca || '').toLowerCase().includes(query);
        const matchBarcode = (p.codigo_barras || '').toLowerCase().includes(query);
        if (!matchSku && !matchNombre && !matchCat && !matchMarca && !matchBarcode) {
          return false;
        }
      }

      // Filtro Rápido
      if (quickFilter === 'instock' && p.stock <= 0) return false;
      if (quickFilter === 'lowstock' && (p.stock <= 0 || p.stock >= 10)) return false;
      if (quickFilter === 'outofstock' && p.stock !== 0) return false;
      if (quickFilter === 'overstock' && p.stock <= 100) return false;
      if (quickFilter === 'desync' && p.sync_status !== 'DESYNC') return false;
      if (quickFilter === 'local' && activeChannelsCount > 0 && p.sync_status !== 'LOCAL_ONLY') return false;

      // Filtro por Categoría
      if (selectedCategory && p.categoria !== selectedCategory) return false;

      // Filtro por Marca
      if (selectedBrand && p.marca !== selectedBrand) return false;

      // Rango de Stock
      if (minStock !== '' && p.stock < Number(minStock)) return false;
      if (maxStock !== '' && p.stock > Number(maxStock)) return false;

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.nombre || '').localeCompare(b.nombre || '');
        case 'name_desc':
          return (b.nombre || '').localeCompare(a.nombre || '');
        case 'sku_asc':
          return (a.sku || '').localeCompare(b.sku || '');
        case 'sku_desc':
          return (b.sku || '').localeCompare(a.sku || '');
        case 'stock_desc':
          return b.stock - a.stock;
        case 'stock_asc':
          return a.stock - b.stock;
        case 'price_desc':
          return (b.precio || 0) - (a.precio || 0);
        case 'price_asc':
          return (a.precio || 0) - (b.precio || 0);
        default:
          return 0;
      }
    });
  }, [products, searchQuery, quickFilter, selectedCategory, selectedBrand, minStock, maxStock, sortBy, activeChannelsCount]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Manejo de Selección Múltiple
  const isAllPageSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedSkus.includes(p.sku));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageSkus = new Set(paginatedProducts.map(p => p.sku));
      setSelectedSkus(prev => prev.filter(sku => !pageSkus.has(sku)));
    } else {
      const pageSkus = paginatedProducts.map(p => p.sku);
      setSelectedSkus(prev => Array.from(new Set([...prev, ...pageSkus])));
    }
  };

  const toggleSelectProduct = (sku: string) => {
    setSelectedSkus(prev => 
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };

  const handleExportSelected = () => {
    const toExport = products.filter(p => selectedSkus.includes(p.sku));
    if (toExport.length === 0) return;
    exportProductsToExcel(toExport, `inventario_seleccion_${toExport.length}_items.xlsx`);
  };

  const handleExportAll = () => {
    exportProductsToExcel(filteredProducts, `inventario_completo_${filteredProducts.length}_items.xlsx`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportError(null);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await importInventoryFile(selectedFile);
      setImportResult(res);
      await fetchInventoryData();
    } catch (err: any) {
      setImportError(err.message || 'Error al procesar el archivo');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="table" />;
  }

  return (
    <div className="space-y-6">
      {/* Banner de Estado de Canales y Transparencia de Sincronización */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
            activeChannelsCount > 0 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' 
              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
          }`}>
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {activeChannelsCount > 0 
                  ? `Sincronización Multicanal Activa (${activeChannelsCount} Canales Conectados)` 
                  : 'Catálogo Maestro en Almacén Local / Archivo'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                activeChannelsCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}>
                {activeChannelsCount > 0 ? '🟢 Conectado en Vivo' : '⚪ Modo Almacén Central'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeChannelsCount > 0 
                ? 'El stock se actualiza automáticamente entre tu almacén y las plataformas conectadas.'
                : 'Tus productos están guardados localmente. Conecta tus credenciales de Shopify, Amazon, ML o eBay para sincronizar en tiempo real.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-xl transition-all shadow-sm"
          >
            <Zap size={14} className="text-blue-600 dark:text-blue-400" />
            <span>Configurar Conexiones</span>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros Pro */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        quickFilter={quickFilter}
        setQuickFilter={(val) => {
          setQuickFilter(val);
          setCurrentPage(1);
        }}
        counts={counts}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={(val) => {
          setSelectedCategory(val);
          setCurrentPage(1);
        }}
        brands={brands}
        selectedBrand={selectedBrand}
        setSelectedBrand={(val) => {
          setSelectedBrand(val);
          setCurrentPage(1);
        }}
        minStock={minStock}
        setMinStock={(val) => {
          setMinStock(val);
          setCurrentPage(1);
        }}
        maxStock={maxStock}
        setMaxStock={(val) => {
          setMaxStock(val);
          setCurrentPage(1);
        }}
        sortBy={sortBy}
        setSortBy={(val) => setSortBy(val)}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={(val) => {
          setItemsPerPage(val);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Barra de Acciones de Inventario (Exportar / Importar / Plantilla / Resumen) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>Mostrando <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> productos</span>
          {activeFiltersCount > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
              (Filtros aplicados)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Exportar la lista actual de productos con todos sus datos a Excel"
          >
            <Download size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Exportar Excel ({filteredProducts.length})</span>
          </button>
          
          <button
            onClick={downloadInventoryTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title="Descargar plantilla CSV para carga masiva"
          >
            <FileSpreadsheet size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Plantilla</span>
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              setImportError(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <UploadCloud size={14} />
            <span>Importar Excel / CSV</span>
          </button>

          <button
            onClick={handleStartBulkSync}
            disabled={isBulkSyncing || products.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Sincronizar todo el inventario central a todos los canales de venta conectados"
          >
            <Zap size={14} className="text-yellow-300 animate-pulse" />
            <span>Sincronizar Todo</span>
          </button>
        </div>
      </div>

      {/* Barra Flotante de Acciones en Lote (cuando hay ítems seleccionados) */}
      {selectedSkus.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-extrabold">
              {selectedSkus.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {selectedSkus.length === 1 ? '1 producto seleccionado' : `${selectedSkus.length} productos seleccionados`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg border border-slate-600 transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Exportar Selección</span>
            </button>
            <button
              onClick={() => setSelectedSkus([])}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Tabla Principal de Inventario */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">
                <th className="w-10 px-4 py-4 text-center">
                  <button 
                    onClick={toggleSelectAllPage}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {isAllPageSelected ? (
                      <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="px-5 py-4 font-semibold">Producto / Descripción</th>
                <th className="px-4 py-4 font-semibold">SKU / Marca</th>
                <th className="px-4 py-4 font-semibold">Stock Central (Local)</th>
                <th className="px-4 py-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Shopify</span>
                    <span className={`w-2 h-2 rounded-full ${shopifyConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} title={shopifyConnected ? 'Canal Conectado' : 'Canal Sin Configurar'} />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Amazon</span>
                    <span className={`w-2 h-2 rounded-full ${amazonConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} title={amazonConnected ? 'Canal Conectado' : 'Canal Sin Configurar'} />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>eBay</span>
                    <span className={`w-2 h-2 rounded-full ${ebayConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} title={ebayConnected ? 'Canal Conectado' : 'Canal Sin Configurar'} />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Kaufland</span>
                    <span className={`w-2 h-2 rounded-full ${kauflandConnected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} title={kauflandConnected ? 'Canal Conectado' : 'Canal Sin Configurar'} />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold">Estado Multicanal</th>
                <th className="px-4 py-4 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-sm text-slate-400 dark:text-slate-500 font-medium">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Layers size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No se encontraron productos</p>
                      <p className="text-xs text-slate-400">Intenta ajustar los filtros de búsqueda o restablecerlos.</p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Limpiar todos los filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isSelected = selectedSkus.includes(p.sku);
                  
                  // Determinar estado de sincronización real
                  let displayStatus = 'LOCAL_ONLY';
                  if (activeChannelsCount > 0) {
                    // Si hay canales activos, checar discrepancia
                    displayStatus = p.sync_status === 'DESYNC' ? 'DESYNC' : 'MATCH';
                  }

                  return (
                    <tr 
                      key={p.sku} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox de fila */}
                      <td className="w-10 px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggleSelectProduct(p.sku)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Producto y Categoría */}
                      <td className="px-5 py-3.5">
                        <div className="max-w-sm">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate" title={p.nombre}>
                            {p.nombre}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.categoria && (
                              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.2 rounded-md border border-blue-200/60 dark:border-blue-800/40">
                                {p.categoria}
                              </span>
                            )}
                            {p.precio !== undefined && (
                              <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                ${p.precio.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU y Marca */}
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block">{p.sku}</span>
                        {p.marca ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{p.marca}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Stock Central */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg ${
                          p.stock === 0
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                            : p.stock < 10
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {p.stock}
                        </span>
                      </td>

                      {/* Shopify */}
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {shopifyConnected ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.shopify_stock ?? p.stock}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Sin vincular</span>
                        )}
                      </td>

                      {/* Amazon */}
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {amazonConnected ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.amazon_stock ?? p.stock}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Sin vincular</span>
                        )}
                      </td>

                      {/* eBay */}
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {ebayConnected ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.ebay_stock ?? p.stock}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Sin vincular</span>
                        )}
                      </td>

                      {/* Kaufland */}
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {kauflandConnected ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{p.kaufland_stock ?? p.stock}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Sin vincular</span>
                        )}
                      </td>

                      {/* Sincronización */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={displayStatus} />
                      </td>

                      {/* Detalle */}
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/inventory/${p.sku}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <Eye size={15} /> Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-slate-50/70 dark:bg-slate-950/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} productos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                Anterior
              </button>
              
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
                Pág. {currentPage} de {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Importación de Excel / CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Importar Catálogo Maestro</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Carga tus productos desde Excel o CSV</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportResult(null); setImportError(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-5 space-y-4">
              {/* Dropzone / File Picker */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50/70 dark:bg-slate-950/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                />
                <UploadCloud size={36} className="mx-auto text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2.5 transition-colors" />
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB — Listo para importar</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Haz clic para seleccionar tu archivo</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Soporta formatos estándar .xlsx, .xls y .csv</p>
                  </div>
                )}
              </div>

              {/* Column notice */}
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 border border-slate-200/80 dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-200">Detección automática de columnas:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <p>• <strong>SKU</strong> / Código</p>
                  <p>• <strong>Nombre</strong> / Descripción</p>
                  <p>• <strong>Stock</strong> / Cantidad</p>
                  <p>• <strong>Categoría</strong> / Marca</p>
                  <p>• <strong>Precio</strong> / Costo</p>
                  <p>• <strong>Código de Barras</strong></p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">¿Deseas el formato modelo?</span>
                  <button 
                    onClick={downloadInventoryTemplate} 
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} /> Bajar plantilla
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {importError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl p-3 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="font-medium">{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl p-3 text-xs flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold">¡Importación Exitosa!</p>
                    <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">{importResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportResult(null); setImportError(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                disabled={importing}
              >
                Cerrar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || importing}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Importar Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Sincronización Masiva Total Multicanal */}
      {isBulkSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Zap size={22} className={isBulkSyncing ? "animate-bounce" : ""} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Sincronización Total Multicanal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sistema Central de Referencia &rarr; Todos los Canales Conectados
                  </p>
                </div>
              </div>
              {!isBulkSyncing && (
                <button
                  onClick={() => setIsBulkSyncModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Barra de Progreso */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="text-slate-600 dark:text-slate-300">
                  {bulkProgress.statusText || 'Procesando catálogo...'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                  {bulkProgress.percent}%
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${bulkProgress.percent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>SKUs: {bulkProgress.current} de {bulkProgress.total}</span>
                <span>Modo: Lotes Asíncronos (Saga Batch)</span>
              </div>
            </div>

            {/* Resumen de Canales */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Canales Impactados en esta Sincronización:
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${shopifyConnected ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <ShoppingBag size={14} />
                  <span>Shopify</span>
                </div>
                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${amazonConnected ? 'border-amber-200 bg-amber-50/40 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Globe2 size={14} />
                  <span>Amazon</span>
                </div>
                <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${mlConnected ? 'border-yellow-200 bg-yellow-50/40 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Store size={14} />
                  <span>Mercado Libre</span>
                </div>
              </div>
            </div>

            {/* Resultado Final */}
            {bulkResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>¡Sincronización masiva finalizada con éxito! Todos los productos están alineados con el Sistema Central de Referencia.</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBulkSyncModalOpen(false)}
                disabled={isBulkSyncing}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isBulkSyncing ? 'Sincronizando en Segundo Plano...' : 'Cerrar y Ver Resultados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

