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
  Info,
  Pencil,
  Check,
  Loader2
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
  syncAllProductsToChannels,
  updateProductStock
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

  // Toast Notificaciones
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Edición rápida de stock en línea (inline edit anti-estúpidos)
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isSavingStock, setIsSavingStock] = useState<boolean>(false);

  const handleStartEditStock = (p: Product) => {
    setEditingSku(p.sku);
    setEditingValue(p.stock.toString());
  };

  const handleCancelEditStock = () => {
    setEditingSku(null);
    setEditingValue('');
  };

  const handleSaveStock = async (sku: string) => {
    const trimmed = editingValue.trim();
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 0) {
      showToast('error', 'El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    setIsSavingStock(true);
    try {
      await updateProductStock(sku, parsed);
      
      // Actualizar estado local inmediatamente
      setProducts(prev => prev.map(p => {
        if (p.sku === sku) {
          return {
            ...p,
            stock: parsed,
            shopify_stock: shopifyConnected ? parsed : p.shopify_stock,
            ml_stock: mlConnected ? parsed : p.ml_stock
          };
        }
        return p;
      }));

      showToast('success', `✓ ${sku}: Stock actualizado a ${parsed} en BD y sincronizado en Shopify.`);
      setEditingSku(null);
    } catch (err: any) {
      console.error(err);
      showToast('error', `Error al actualizar ${sku}: ${err.message || 'Fallo de conexión'}`);
    } finally {
      setIsSavingStock(false);
    }
  };

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
    // Auto-refresh cada 30 segundos para reflejar cambios del .exe de escritorio
    const interval = setInterval(() => {
      fetchInventoryData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Canales configurados realmente por el usuario
  const shopifyConnected = useMemo(() => isChannelConfigured('shopify', settings), [settings]);
  const amazonConnected = useMemo(() => isChannelConfigured('amazon', settings), [settings]);
  const ebayConnected = useMemo(() => isChannelConfigured('ebay', settings), [settings]);
  const kauflandConnected = useMemo(() => isChannelConfigured('kaufland', settings), [settings]);
  const mlConnected = useMemo(() => isChannelConfigured('mercadolibre', settings), [settings]);
  const tiktokConnected = useMemo(() => isChannelConfigured('tiktok', settings), [settings]);
  const saeConnected = useMemo(() => isChannelConfigured('sae', settings), [settings]);

  // Canales activos / habilitados en la empresa (solo mostrar en la tabla si están seleccionados o conectados)
  const showShopify = useMemo(() => settings ? Boolean(settings.ENABLE_SHOPIFY || shopifyConnected) : true, [settings, shopifyConnected]);
  const showML = useMemo(() => settings ? Boolean(settings.ENABLE_MERCADOLIBRE || mlConnected) : true, [settings, mlConnected]);
  const showAmazon = useMemo(() => settings ? Boolean(settings.ENABLE_AMAZON || amazonConnected) : false, [settings, amazonConnected]);
  const showEbay = useMemo(() => settings ? Boolean(settings.ENABLE_EBAY || ebayConnected) : false, [settings, ebayConnected]);
  const showKaufland = useMemo(() => settings ? Boolean(settings.ENABLE_KAUFLAND || kauflandConnected) : false, [settings, kauflandConnected]);
  const showTiktok = useMemo(() => settings ? Boolean(settings.ENABLE_TIKTOK || tiktokConnected) : false, [settings, tiktokConnected]);
  const showSae = useMemo(() => settings ? Boolean(settings.ENABLE_SAE || saeConnected) : false, [settings, saeConnected]);

  const activeChannelsCount = useMemo(() => {
    return [showShopify && shopifyConnected, showAmazon && amazonConnected, showEbay && ebayConnected, showKaufland && kauflandConnected, showML && mlConnected, showTiktok && tiktokConnected, showSae && saeConnected].filter(Boolean).length;
  }, [showShopify, shopifyConnected, showAmazon, amazonConnected, showEbay, ebayConnected, showKaufland, kauflandConnected, showML, mlConnected, showTiktok, tiktokConnected, showSae, saeConnected]);

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
    <div className="space-y-5">
      {/* Banner de Estado de Canales */}
      <div className="bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-hard transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 border flex items-center justify-center ${
            activeChannelsCount > 0 
              ? 'border-[#00ff66]/40 text-[#00ff66] bg-[#00ff66]/5' 
              : 'border-slate-300 dark:border-[#20242c] text-slate-500 dark:text-[#8e95a5]'
          }`}>
            <Layers size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest font-mono text-slate-800 dark:text-white">
                {activeChannelsCount > 0 
                  ? `SYNC_MULTICANAL — ${activeChannelsCount} CANALES ACTIVOS` 
                  : 'ALMACÉN_LOCAL — SIN CANALES ACTIVOS'}
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest font-mono border ${
                activeChannelsCount > 0
                  ? 'text-[#00ff66] border-[#00ff66]/40 bg-[#00ff66]/5'
                  : 'text-[#8e95a5] border-[#20242c] bg-transparent'
              }`}>
                {activeChannelsCount > 0 ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8e95a5] mt-0.5 font-mono">
              {activeChannelsCount > 0 
                ? 'Stock sincronizado automáticamente con todas las plataformas conectadas.'
                : 'Catálogo local. Conecta credenciales de Shopify / Amazon / ML / eBay para activar sync.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-mono uppercase tracking-wider text-[#00ff66] border border-[#00ff66]/40 hover:bg-[#00ff66]/10 transition-colors shadow-hard"
          >
            <Zap size={13} />
            <span>Configurar Canales</span>
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

      {/* Barra de Acciones de Inventario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#8e95a5] font-mono">
          <span>MOSTRANDO <strong className="text-slate-700 dark:text-white">{filteredProducts.length}</strong> / <strong className="text-slate-700 dark:text-white">{products.length}</strong> PRODUCTOS</span>
          {activeFiltersCount > 0 && (
            <span className="text-[#ff3b00] font-bold border border-[#ff3b00]/40 bg-[#ff3b00]/5 px-2 py-0.5 text-[10px] font-mono uppercase">
              {activeFiltersCount} FILTROS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold font-mono text-slate-700 dark:text-[#8e95a5] bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] hover:border-slate-400 dark:hover:border-[#8e95a5] transition-colors cursor-pointer disabled:opacity-40"
            title="Exportar productos a Excel"
          >
            <Download size={13} />
            <span>EXPORTAR ({filteredProducts.length})</span>
          </button>
          
          <button
            onClick={downloadInventoryTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold font-mono text-slate-700 dark:text-[#8e95a5] bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] hover:border-slate-400 dark:hover:border-[#8e95a5] transition-colors cursor-pointer"
            title="Descargar plantilla CSV"
          >
            <FileSpreadsheet size={13} />
            <span>PLANTILLA</span>
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              setImportError(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold font-mono uppercase text-slate-800 dark:text-black bg-white dark:bg-[#8e95a5] border border-slate-300 dark:border-[#8e95a5] hover:bg-slate-100 dark:hover:bg-[#a0a8b5] transition-colors shadow-hard cursor-pointer"
          >
            <UploadCloud size={13} />
            <span>IMPORTAR</span>
          </button>

          <button
            onClick={handleStartBulkSync}
            disabled={isBulkSyncing || products.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black font-mono uppercase text-black bg-[#00ff66] border border-[#00ff66] hover:bg-[#00e55a] transition-colors shadow-hard cursor-pointer disabled:opacity-50"
            title="Sincronizar todo el inventario a los canales conectados"
          >
            <Zap size={13} />
            <span>SYNC_ALL</span>
          </button>
        </div>
      </div>

      {/* Barra Flotante de Acciones en Lote */}
      {selectedSkus.length > 0 && (
        <div className="bg-[#0d0e12] dark:bg-[#0d0e12] border border-[#20242c] text-white p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-hard animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 border border-[#00ff66]/60 bg-[#00ff66]/10 flex items-center justify-center text-xs font-extrabold font-mono text-[#00ff66]">
              {selectedSkus.length}
            </span>
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#8e95a5]">
              {selectedSkus.length === 1 ? '1 PRODUCTO SELECCIONADO' : `${selectedSkus.length} PRODUCTOS SELECCIONADOS`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold font-mono text-[#8e95a5] bg-transparent border border-[#20242c] hover:border-[#8e95a5] hover:text-white transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>EXPORTAR SELECCIÓN</span>
            </button>
            <button
              onClick={() => setSelectedSkus([])}
              className="px-2.5 py-1.5 text-xs font-semibold font-mono text-[#8e95a5] hover:text-white transition-colors cursor-pointer"
            >
              DESELECCIONAR
            </button>
          </div>
        </div>
      )}

      {/* Tabla Principal de Inventario */}
      <div className="bg-white dark:bg-[#0d0e12] border border-slate-200 dark:border-[#20242c] shadow-hard overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] text-slate-500 dark:text-[#8e95a5] text-[10px] font-bold uppercase tracking-widest font-mono">
                <th className="w-10 px-4 py-3 text-center">
                  <button 
                    onClick={toggleSelectAllPage}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-[#00ff66] transition-colors"
                  >
                    {isAllPageSelected ? (
                      <CheckSquare size={15} className="text-[#00ff66]" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3">Producto / Descripción</th>
                <th className="px-4 py-3">SKU / Marca</th>
                <th className="px-4 py-3">Stock Central</th>

                {showSae && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>CONTPAQi SAE</span>
                      <span className={`w-1.5 h-1.5 ${saeConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={saeConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showShopify && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Shopify</span>
                      <span className={`w-1.5 h-1.5 ${shopifyConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={shopifyConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showML && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Mercado Libre</span>
                      <span className={`w-1.5 h-1.5 ${mlConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={mlConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showAmazon && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Amazon</span>
                      <span className={`w-1.5 h-1.5 ${amazonConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={amazonConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showEbay && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>eBay</span>
                      <span className={`w-1.5 h-1.5 ${ebayConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={ebayConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showKaufland && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Kaufland</span>
                      <span className={`w-1.5 h-1.5 ${kauflandConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={kauflandConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                {showTiktok && (
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>TikTok Shop</span>
                      <span className={`w-1.5 h-1.5 ${tiktokConnected ? 'bg-[#00ff66]' : 'bg-[#20242c]'}`} title={tiktokConnected ? 'Conectado' : 'Sin configurar'} />
                    </div>
                  </th>
                )}

                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">—</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#20242c]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-sm text-slate-400 dark:text-[#8e95a5] font-medium">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <Layers size={28} className="mx-auto text-slate-300 dark:text-[#20242c] mb-1" />
                      <p className="font-bold font-mono uppercase text-xs tracking-widest text-slate-700 dark:text-[#8e95a5]">Sin resultados</p>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-[#8e95a5]/60">Ajusta los filtros de búsqueda.</p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 text-xs font-bold font-mono text-[#ff3b00] hover:underline cursor-pointer"
                        >
                          LIMPIAR FILTROS
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isSelected = selectedSkus.includes(p.sku);
                  
                  let displayStatus = 'LOCAL_ONLY';
                  if (activeChannelsCount > 0) {
                    displayStatus = p.sync_status === 'DESYNC' ? 'DESYNC' : 'MATCH';
                  }

                  return (
                    <tr 
                      key={p.sku} 
                      className={`hover:bg-slate-50 dark:hover:bg-[#111318] transition-colors ${
                        isSelected ? 'bg-[#00ff66]/5 dark:bg-[#00ff66]/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSelectProduct(p.sku)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-[#00ff66] transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={15} className="text-[#00ff66]" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </td>

                      {/* Producto y Categoría */}
                      <td className="px-5 py-3">
                        <div className="max-w-sm">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate" title={p.nombre}>
                            {p.nombre}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.categoria && (
                              <span className="text-[10px] font-bold font-mono uppercase text-slate-500 dark:text-[#8e95a5] px-1.5 py-0.5 border border-slate-200 dark:border-[#20242c]">
                                {p.categoria}
                              </span>
                            )}
                            {p.precio !== undefined && (
                              <span className="text-[11px] font-mono font-semibold text-[#00ff66]">
                                ${p.precio.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU y Marca */}
                      <td className="px-4 py-3 text-xs">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block">{p.sku}</span>
                        {p.marca ? (
                          <span className="text-[11px] text-slate-500 dark:text-[#8e95a5] block">{p.marca}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Stock Central (Editable en Línea) */}
                      <td className="px-4 py-3">
                        {editingSku === p.sku ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min="0"
                              autoFocus
                              disabled={isSavingStock}
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveStock(p.sku);
                                if (e.key === 'Escape') handleCancelEditStock();
                              }}
                              className="w-16 px-2 py-1 text-sm font-bold font-mono text-center bg-slate-900 border-2 border-[#00ff66] text-white rounded focus:outline-none shadow-lg"
                            />
                            {isSavingStock ? (
                              <Loader2 size={16} className="animate-spin text-[#00ff66]" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveStock(p.sku)}
                                  title="Guardar cambio (Enter)"
                                  className="p-1 bg-[#00ff66] hover:bg-[#00d957] text-black rounded font-bold transition-all shadow cursor-pointer"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditStock}
                                  title="Cancelar (Esc)"
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-all cursor-pointer"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEditStock(p)}
                            title="Haz clic para modificar el stock"
                            className="group flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
                          >
                            <span className={`text-sm font-bold font-mono px-2 py-0.5 border rounded transition-all group-hover:border-[#00ff66] group-hover:shadow-[0_0_8px_rgba(0,255,102,0.3)] ${
                              p.stock === 0
                                ? 'text-[#ff3b00] border-[#ff3b00]/40 bg-[#ff3b00]/5'
                                : p.stock < 10
                                ? 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20'
                                : 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#20242c] bg-slate-50 dark:bg-[#111318]'
                            }`}>
                              {p.stock}
                            </span>
                            <Pencil size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-[#00ff66] transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* CONTPAQi SAE */}
                      {showSae && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {saeConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Shopify */}
                      {showShopify && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {shopifyConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.shopify_stock ?? p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Mercado Libre */}
                      {showML && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {mlConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.ml_stock ?? p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Amazon */}
                      {showAmazon && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {amazonConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.amazon_stock ?? p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* eBay */}
                      {showEbay && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {ebayConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.ebay_stock ?? p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Kaufland */}
                      {showKaufland && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {kauflandConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.kaufland_stock ?? p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* TikTok Shop */}
                      {showTiktok && (
                        <td className="px-4 py-3 text-xs font-mono">
                          {tiktokConnected ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.stock}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-[#8e95a5]/50 text-[11px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <StatusBadge status={displayStatus} />
                      </td>

                      {/* Detalle */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory/${p.sku}`}
                          className="p-1.5 border border-transparent hover:border-[#20242c] text-slate-500 dark:text-[#8e95a5] hover:text-slate-700 dark:hover:text-white transition-colors inline-flex items-center gap-1 text-xs font-mono"
                        >
                          <Eye size={14} />
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
          <div className="bg-slate-50 dark:bg-[#090a0c] px-6 py-3 border-t border-slate-100 dark:border-[#20242c] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#8e95a5]">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} / {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-[#20242c] text-xs font-mono text-slate-700 dark:text-[#8e95a5] hover:border-slate-400 dark:hover:border-[#8e95a5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← ANTERIOR
              </button>
              
              <div className="text-[11px] font-bold font-mono text-slate-600 dark:text-[#8e95a5] px-2">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-[#20242c] text-xs font-mono text-slate-700 dark:text-[#8e95a5] hover:border-slate-400 dark:hover:border-[#8e95a5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                SIGUIENTE →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Importación */}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold">
                {showShopify && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${shopifyConnected ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <ShoppingBag size={14} />
                    <span>Shopify</span>
                  </div>
                )}
                {showML && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${mlConnected ? 'border-yellow-200 bg-yellow-50/40 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Store size={14} />
                    <span>Mercado Libre</span>
                  </div>
                )}
                {showAmazon && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${amazonConnected ? 'border-amber-200 bg-amber-50/40 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Globe2 size={14} />
                    <span>Amazon</span>
                  </div>
                )}
                {showEbay && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${ebayConnected ? 'border-blue-200 bg-blue-50/40 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Store size={14} />
                    <span>eBay</span>
                  </div>
                )}
                {showKaufland && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${kauflandConnected ? 'border-red-200 bg-red-50/40 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Store size={14} />
                    <span>Kaufland</span>
                  </div>
                )}
                {showTiktok && (
                  <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${tiktokConnected ? 'border-pink-200 bg-pink-50/40 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300' : 'border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Video size={14} />
                    <span>TikTok Shop</span>
                  </div>
                )}
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

      {/* Toast Notificación Instantánea */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-mono text-xs font-bold border transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-slate-900 border-[#00ff66] text-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.25)]' 
            : 'bg-red-950 border-red-500 text-red-200 shadow-xl'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}

