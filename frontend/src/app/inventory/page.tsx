'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  RefreshCw 
} from 'lucide-react';
import { 
  getInventory, 
  getSettings, 
  Product, 
  SystemSettings, 
  isDemoMode,
  importInventoryFile,
  downloadInventoryTemplate,
  ImportInventoryResponse
} from '@/lib/api';
import FilterBar from '@/components/FilterBar';
import StatusBadge from '@/components/StatusBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStockBajo, setFilterStockBajo] = useState(false);
  const [filterDesincronizado, setFilterDesincronizado] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estados del modal de importación
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportInventoryResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInventoryData = async () => {
    try {
      const [invData, settingsData] = await Promise.all([
        getInventory(),
        getSettings().catch(() => null)
      ]);
      setProducts(invData);
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
      // Recargar inventario para mostrar los productos nuevos
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

  const enableSAE = settings?.ENABLE_SAE ?? true;
  const enableShopify = settings?.ENABLE_SHOPIFY ?? true;
  const enableML = settings?.ENABLE_MERCADOLIBRE ?? false;
  const enableTikTok = settings?.ENABLE_TIKTOK ?? false;
  const enableAmazon = settings?.ENABLE_AMAZON ?? true;
  const enableEbay = settings?.ENABLE_EBAY ?? true;
  const enableKaufland = settings?.ENABLE_KAUFLAND ?? true;
  const masterInv = settings?.INVENTARIO_PRINCIPAL || 'shopify';

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStockBajo = filterStockBajo ? p.stock < 5 : true;
    const matchesDesync = filterDesincronizado ? false : true;

    return matchesSearch && matchesStockBajo && matchesDesync;
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicador de Inventario Principal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Layers size={16} className="text-blue-600 dark:text-blue-400" />
          <span>Inventario Maestro (Fuente de Verdad):</span>
          <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60 uppercase font-bold text-[11px]">
            {masterInv === 'shopify' ? '🛍️ Shopify' : masterInv === 'ebay' ? '🏷️ eBay Alemania' : masterInv === 'kaufland' ? '🛒 Kaufland DE' : masterInv === 'amazon' ? '📦 Amazon EU' : masterInv === 'sae' ? '🖥️ Almacén Central' : '📦 Canal Maestro'}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">● 5 Canales Activos</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <FilterBar
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            filterStockBajo={filterStockBajo}
            setFilterStockBajo={(val) => {
              setFilterStockBajo(val);
              setCurrentPage(1);
            }}
            filterDesincronizado={filterDesincronizado}
            setFilterDesincronizado={(val) => {
              setFilterDesincronizado(val);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <button
            onClick={downloadInventoryTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Descargar plantilla modelo CSV compatible con Excel"
          >
            <Download size={15} className="text-slate-500 dark:text-slate-400" />
            <span>Plantilla Excel</span>
          </button>
          <button
            onClick={() => {
              setSelectedFile(null);
              setImportError(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <UploadCloud size={15} />
            <span>Importar Excel / CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">
                <th className="px-6 py-4 font-semibold">Producto</th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                {enableShopify && (
                  <th className="px-6 py-4 font-semibold">
                    Stock Shopify {masterInv === 'shopify' && '⭐'}
                  </th>
                )}
                {enableEbay && (
                  <th className="px-6 py-4 font-semibold">
                    Stock eBay DE {masterInv === 'ebay' && '⭐'}
                  </th>
                )}
                {enableKaufland && (
                  <th className="px-6 py-4 font-semibold">
                    Stock Kaufland {masterInv === 'kaufland' && '⭐'}
                  </th>
                )}
                {enableAmazon && (
                  <th className="px-6 py-4 font-semibold">
                    Stock Amazon EU {masterInv === 'amazon' && '⭐'}
                  </th>
                )}
                <th className="px-6 py-4 font-semibold">Sincronización</th>
                <th className="px-6 py-4 font-semibold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400 dark:text-slate-500 font-medium">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  return (
                    <tr key={p.sku} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-xs">{p.nombre}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{p.sku}</td>

                      {/* Columna Shopify */}
                      {enableShopify && (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {p.shopify_stock ?? p.stock}
                        </td>
                      )}

                      {/* Columna eBay DE */}
                      {enableEbay && (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {p.ebay_stock ?? p.stock}
                        </td>
                      )}

                      {/* Columna Kaufland */}
                      {enableKaufland && (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {p.kaufland_stock ?? p.stock}
                        </td>
                      )}

                      {/* Columna Amazon */}
                      {enableAmazon && (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {p.amazon_stock ?? p.stock}
                        </td>
                      )}

                      <td className="px-6 py-4">
                        <StatusBadge status={'MATCH'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/inventory/${p.sku}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <Eye size={16} /> Ver Detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-slate-50/50 dark:bg-slate-950/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} productos
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Importar Inventario</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Carga tus productos desde Excel o CSV</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportResult(null); setImportError(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                <p className="text-slate-500 dark:text-slate-400">• <strong>SKU</strong> / Código / Clave / ID</p>
                <p className="text-slate-500 dark:text-slate-400">• <strong>Nombre</strong> / Descripción / Producto</p>
                <p className="text-slate-500 dark:text-slate-400">• <strong>Stock</strong> / Existencias / Cantidad</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">¿Deseas el formato oficial?</span>
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
    </div>
  );
}
