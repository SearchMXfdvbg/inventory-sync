'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  GitCompare, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  ShoppingBag, 
  Store, 
  Globe2,
  Loader2,
  Zap,
  Info,
  Clock,
  ShieldCheck,
  Edit3,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  PauseCircle,
  PlayCircle,
  History,
  Check,
  X,
  Radio,
  Wifi,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { 
  getInventory, 
  getSettings,
  reconcileProduct, 
  Product, 
  SystemSettings,
  ReconcileResponse,
  isChannelConfigured,
  updateCentralStock,
  reconcileSingleChannel,
  resolveStockConflict,
  getChannelRule,
  saveChannelRule,
  ChannelRule,
  isSyncAutomationPaused,
  setSyncAutomationPaused,
  getAuditLogsForSku,
  AuditLogEntry,
  testConnection,
  exportDifferencesToExcel
} from '@/lib/api';
import Toast, { ToastProps } from '@/components/Toast';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [reconcileData, setReconcileData] = useState<ReconcileResponse | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  // Filtro de lista de productos (Todos vs Solo Desincronizados)
  const [skuFilterTab, setSkuFilterTab] = useState<'all' | 'desync' | 'synced'>('all');

  // Emergency Pause (Kill-switch)
  const [isPaused, setIsPaused] = useState(false);

  // Modales
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [editStockReason, setEditStockReason] = useState('Llegada de mercancía / Ajuste de bodega');
  const [savingStock, setSavingStock] = useState(false);

  // Modal Regla de Canal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRuleChannel, setSelectedRuleChannel] = useState<string>('amazon');
  const [currentRule, setCurrentRule] = useState<ChannelRule>({ channel: 'amazon', mode: 'percentage', value: 90, active: true });

  // Modal Historial / Logs
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modal Resolver Conflicto Manual
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictMasterSource, setConflictMasterSource] = useState<string>('sae');
  const [conflictCustomStock, setConflictCustomStock] = useState<number>(0);
  const [conflictReason, setConflictReason] = useState('Resolución manual de discrepancia de stock');
  const [resolvingConflict, setResolvingConflict] = useState(false);

  // Probar Conexión por canal
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadInitialData = async () => {
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
      if (settingsData) setSettings(settingsData);
      setIsPaused(isSyncAutomationPaused());

      if (cleanInv.length > 0) {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const paramSku = params.get('sku');
          if (paramSku && cleanInv.some(p => p.sku === paramSku)) {
            setSelectedSku(paramSku);
          } else {
            setSelectedSku(cleanInv[0].sku);
          }
        } else {
          setSelectedSku(cleanInv[0].sku);
        }
      }
    } catch (error) {
      addToast('Error al cargar catálogo de productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Canales realmente conectados
  const shopifyConnected = useMemo(() => isChannelConfigured('shopify', settings), [settings]);
  const amazonConnected = useMemo(() => isChannelConfigured('amazon', settings), [settings]);
  const ebayConnected = useMemo(() => isChannelConfigured('ebay', settings), [settings]);
  const kauflandConnected = useMemo(() => isChannelConfigured('kaufland', settings), [settings]);
  const mlConnected = useMemo(() => isChannelConfigured('mercadolibre', settings), [settings]);

  const activeChannelsCount = useMemo(() => {
    return [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected].filter(Boolean).length;
  }, [shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected]);

  // Lista de desincronizados
  const desyncedProducts = useMemo(() => {
    return products.filter(p => {
      const s = p.stock;
      return (
        (shopifyConnected && p.shopify_stock !== undefined && p.shopify_stock !== s) ||
        (amazonConnected && p.amazon_stock !== undefined && p.amazon_stock !== s) ||
        (ebayConnected && p.ebay_stock !== undefined && p.ebay_stock !== s) ||
        (kauflandConnected && p.kaufland_stock !== undefined && p.kaufland_stock !== s) ||
        (mlConnected && p.ml_stock !== undefined && p.ml_stock !== s)
      );
    });
  }, [products, shopifyConnected, amazonConnected, ebayConnected, kauflandConnected, mlConnected]);

  const displayedSkusList = useMemo(() => {
    if (skuFilterTab === 'desync') return desyncedProducts;
    if (skuFilterTab === 'synced') {
      const desyncSet = new Set(desyncedProducts.map(p => p.sku));
      return products.filter(p => !desyncSet.has(p.sku));
    }
    return products;
  }, [products, desyncedProducts, skuFilterTab]);

  const handleReconcileCheck = async (sku: string) => {
    if (!sku) return;
    setReconciling(true);
    try {
      const res = await reconcileProduct(sku);
      setReconcileData(res);
      setLastCheckTime(new Date());
      if (activeChannelsCount === 0) {
        addToast(`El producto ${sku} está guardado en Almacén Local. No hay tiendas externas conectadas aún.`, 'info');
      } else if (res.status === 'MATCH') {
        addToast(`El producto ${sku} está correctamente sincronizado en todos los canales activos.`, 'success');
      } else {
        addToast(`Diferencia de stock detectada en el SKU ${sku}.`, 'warning');
      }
    } catch (error: any) {
      addToast(error.message || 'Error al ejecutar conciliación', 'error');
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (selectedSku) {
      handleReconcileCheck(selectedSku);
    }
  }, [selectedSku]);

  const selectedProduct = products.find(p => p.sku === selectedSku);
  const saeStock = selectedProduct?.stock ?? reconcileData?.sae_stock ?? 0;

  // 1. Pausar / Reanudar Conciliación (Emergency Kill-Switch)
  const handleToggleEmergencyPause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    setSyncAutomationPaused(nextState);
    if (nextState) {
      addToast('🛑 Conciliación automática PAUSADA. No se enviarán actualizaciones de stock a los canales.', 'warning');
    } else {
      addToast('🟢 Conciliación automática REANUDADA exitosamente.', 'success');
    }
  };

  // 2. Exportar Reporte de Diferencias Excel
  const handleExportDifferences = () => {
    try {
      exportDifferencesToExcel(products, `reporte_diferencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
      addToast('Reporte de diferencias de stock exportado exitosamente a Excel.', 'success');
    } catch (err: any) {
      addToast('Error al exportar reporte Excel.', 'error');
    }
  };

  // 3. Abrir Modal de Edición de Stock Central
  const handleOpenEditCentralStock = () => {
    if (!selectedProduct) return;
    setEditStockValue(selectedProduct.stock);
    setEditStockReason('Llegada de mercancía / Ajuste de bodega');
    setIsEditStockOpen(true);
  };

  const handleSaveCentralStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSavingStock(true);
    try {
      const updated = await updateCentralStock(selectedProduct.sku, Number(editStockValue), editStockReason);
      setProducts(prev => prev.map(p => p.sku === updated.sku ? updated : p));
      setIsEditStockOpen(false);
      await handleReconcileCheck(selectedProduct.sku);
      addToast(`Stock Central de ${selectedProduct.sku} actualizado a ${editStockValue} piezas.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Error al actualizar stock central', 'error');
    } finally {
      setSavingStock(false);
    }
  };

  // 4. Probar Conexión por Canal
  const handleTestChannel = async (channel: string) => {
    setTestingChannel(channel);
    try {
      const res = await testConnection(channel);
      if (res.success) {
        addToast(`✅ Conexión con ${channel.toUpperCase()} verificada con éxito (${res.details?.endpoint_ping_ms || 24}ms).`, 'success');
      } else {
        addToast(`❌ Falló la prueba de conexión con ${channel.toUpperCase()}: ${res.message}`, 'error');
      }
    } catch (err: any) {
      addToast(`Error al probar ${channel.toUpperCase()}`, 'error');
    } finally {
      setTestingChannel(null);
    }
  };

  // 5. Abrir Modal de Regla de Canal
  const handleOpenRuleModal = (channel: string) => {
    setSelectedRuleChannel(channel);
    const rule = getChannelRule(channel);
    setCurrentRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    saveChannelRule(selectedRuleChannel, currentRule);
    setIsRuleModalOpen(false);
    addToast(`Regla para ${selectedRuleChannel.toUpperCase()} guardada: ${currentRule.mode === 'percentage' ? `${currentRule.value}% del stock central` : `Buffer fijo de -${currentRule.value} unidades`}.`, 'success');
  };

  // 6. Conciliar Solo Este Canal
  const handleReconcileSingleChannel = async (channel: string) => {
    if (!selectedSku) return;
    try {
      const updated = await reconcileSingleChannel(selectedSku, channel);
      setProducts(prev => prev.map(p => p.sku === updated.sku ? updated : p));
      await handleReconcileCheck(selectedSku);
      addToast(`Canal ${channel.toUpperCase()} conciliado exitosamente con stock central (${updated.stock} uds).`, 'success');
    } catch (err: any) {
      addToast(`Error al conciliar ${channel.toUpperCase()}`, 'error');
    }
  };

  // 7. Abrir Historial / Logs
  const handleOpenLogs = () => {
    if (!selectedSku) return;
    const logs = getAuditLogsForSku(selectedSku);
    setAuditLogs(logs);
    setIsLogsModalOpen(true);
  };

  // 8. Abrir Modal de Resolver Conflicto Manual
  const handleOpenConflictModal = () => {
    if (!selectedProduct) return;
    setConflictMasterSource('sae');
    setConflictCustomStock(selectedProduct.stock);
    setConflictReason('Resolución manual de discrepancia multicanal');
    setIsConflictModalOpen(true);
  };

  const handleApplyConflictResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setResolvingConflict(true);
    try {
      const updated = await resolveStockConflict(selectedProduct.sku, conflictMasterSource, Number(conflictCustomStock), conflictReason);
      setProducts(prev => prev.map(p => p.sku === updated.sku ? updated : p));
      setIsConflictModalOpen(false);
      await handleReconcileCheck(selectedProduct.sku);
      addToast(`Conflicto resuelto: Todos los canales alineados a ${conflictCustomStock} unidades (Fuente: ${conflictMasterSource.toUpperCase()}).`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Error al resolver conflicto', 'error');
    } finally {
      setResolvingConflict(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="detail" />;
  }

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} />
        ))}
      </div>

      {/* TOP CONTROLS: Emergency Kill-Switch + Exportar Reporte + Estado de Canales */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${isPaused ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'} shrink-0`}>
            {isPaused ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Panel de Conciliación y Control de Stock</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                isPaused 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900' 
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}>
                {isPaused ? '🛑 Sincronización Pausada' : '🟢 Sincronización Automática Activa'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isPaused 
                ? 'El sistema está en pausa de emergencia. No se propagarán cambios automáticos a ningún canal.'
                : 'Audita, ajusta el inventario físico central y resuelve discrepancias de stock canal por canal.'}
            </p>
          </div>
        </div>

        {/* Botones Globales */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Botón de Pánico: Pausar Conciliación */}
          <button
            onClick={handleToggleEmergencyPause}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isPaused 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
            }`}
            title="Botón de Pánico / Kill-Switch"
          >
            {isPaused ? <PlayCircle size={15} /> : <ShieldAlert size={15} />}
            <span>{isPaused ? 'Reanudar Sincronización' : 'Pausar Sincronización Automática'}</span>
          </button>

          {/* Exportar Reporte de Diferencias */}
          <button
            onClick={handleExportDifferences}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Exportar Diferencias ({desyncedProducts.length})</span>
          </button>
        </div>
      </div>

      {/* Banner si 0 canales conectados */}
      {activeChannelsCount === 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Modo Almacén Central (Catálogo Base)</p>
              <p className="text-blue-700 dark:text-blue-300">
                Actualmente no tienes tiendas externas conectadas (Shopify, Amazon, ML). La conciliación verifica tu base de datos central.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            <Zap size={13} />
            <span>Vincular Canales de Venta</span>
          </Link>
        </div>
      )}

      {/* SELECTOR DE PRODUCTO Y FILTROS RÁPIDOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        {/* Pestañas de Filtro Rápido */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkuFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                skuFilterTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({products.length})
            </button>

            <button
              onClick={() => setSkuFilterTab('desync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                skuFilterTab === 'desync'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Con Diferencias ({desyncedProducts.length})</span>
            </button>

            <button
              onClick={() => setSkuFilterTab('synced')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                skuFilterTab === 'synced'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sincronizados ({products.length - desyncedProducts.length})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {displayedSkusList.length} productos en lista
          </span>
        </div>

        {/* Dropdown Selector + Botón Único de Conciliar Ahora */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search size={16} />
            </span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-semibold font-mono shadow-inner"
            >
              {displayedSkusList.length === 0 ? (
                <option value="" disabled>No hay productos en esta categoría...</option>
              ) : (
                displayedSkusList.map((p) => {
                  const isDesynced = desyncedProducts.some(d => d.sku === p.sku);
                  return (
                    <option key={p.sku} value={p.sku}>
                      {isDesynced ? '⚠️ ' : '🟢 '}{p.sku} — {p.nombre} (Stock Central: {p.stock} pzas)
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleReconcileCheck(selectedSku)}
            disabled={reconciling || !selectedSku}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          >
            {reconciling ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <GitCompare size={15} />
            )}
            <span>Conciliar Ahora</span>
          </button>
        </div>
      </div>

      {reconcileData ? (
        <div className="space-y-6">
          {/* MAPA COMPARATIVO DE STOCK DE 6 CANALES CON BOTONES ACCIONABLES */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Mapa Comparativo de Stock</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedProduct?.nombre || selectedSku} (SKU: {selectedSku})</p>
              </div>

              <div className="flex items-center gap-3">
                {activeChannelsCount === 0 ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full font-mono">
                    <ShieldCheck size={14} className="text-blue-500" /> Almacén Local
                  </span>
                ) : reconcileData.status === 'MATCH' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full font-mono">
                    <CheckCircle size={14} /> Sincronizado en Vivo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-3 py-1 rounded-full animate-pulse font-mono">
                    <AlertTriangle size={14} /> Diferencia Detectada
                  </span>
                )}
              </div>
            </div>

            {/* GRID DE 6 CANALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              {/* 1. Almacén Central (Fuente Core) + Botón LÁPIZ EDITAR */}
              <div className="flex flex-col justify-between border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 rounded-2xl p-4 shadow-xs relative group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                      <Database size={20} />
                    </div>
                    <button
                      onClick={handleOpenEditCentralStock}
                      className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      title="Editar Stock Físico Central"
                    >
                      <Edit3 size={13} />
                      <span>Editar</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block font-mono">
                    Central (SAE / Excel)
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {saeStock}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Fuente Maestra (Física)</span>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-900/40">
                  <button
                    onClick={handleOpenEditCentralStock}
                    className="w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Edit3 size={12} />
                    <span>Ajustar Stock</span>
                  </button>
                </div>
              </div>

              {/* 2. Shopify */}
              <div className={`flex flex-col justify-between border rounded-2xl p-4 shadow-xs transition-all ${
                shopifyConnected 
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${shopifyConnected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      <ShoppingBag size={20} />
                    </div>
                    {shopifyConnected && (
                      <button
                        onClick={() => handleOpenRuleModal('shopify')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Configurar regla de stock para Shopify"
                      >
                        <Sliders size={14} />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Shopify
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {shopifyConnected ? (selectedProduct?.shopify_stock ?? saeStock) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {shopifyConnected ? '🟢 Conectado' : '⚪ Sin conectar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                  {shopifyConnected ? (
                    <>
                      <button
                        onClick={() => handleReconcileSingleChannel('shopify')}
                        className="w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Conciliar solo este</span>
                      </button>
                      <button
                        onClick={() => handleTestChannel('shopify')}
                        disabled={testingChannel === 'shopify'}
                        className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        {testingChannel === 'shopify' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        <span>Probar Conexión</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/settings/integrations"
                      className="w-full text-center py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>

              {/* 3. Amazon EU */}
              <div className={`flex flex-col justify-between border rounded-2xl p-4 shadow-xs transition-all ${
                amazonConnected 
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${amazonConnected ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      <Globe2 size={20} />
                    </div>
                    {amazonConnected && (
                      <button
                        onClick={() => handleOpenRuleModal('amazon')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Configurar regla de stock para Amazon (ej: 90%)"
                      >
                        <Sliders size={14} />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Amazon EU
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {amazonConnected ? (selectedProduct?.amazon_stock ?? saeStock) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {amazonConnected ? '🟢 Conectado' : '⚪ Sin conectar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                  {amazonConnected ? (
                    <>
                      <button
                        onClick={() => handleReconcileSingleChannel('amazon')}
                        className="w-full text-center py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Conciliar solo este</span>
                      </button>
                      <button
                        onClick={() => handleTestChannel('amazon')}
                        disabled={testingChannel === 'amazon'}
                        className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        {testingChannel === 'amazon' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        <span>Probar Conexión</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/settings/integrations"
                      className="w-full text-center py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>

              {/* 4. eBay DE */}
              <div className={`flex flex-col justify-between border rounded-2xl p-4 shadow-xs transition-all ${
                ebayConnected 
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${ebayConnected ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      <Store size={20} />
                    </div>
                    {ebayConnected && (
                      <button
                        onClick={() => handleOpenRuleModal('ebay')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Configurar regla de stock para eBay"
                      >
                        <Sliders size={14} />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    eBay DE
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {ebayConnected ? (selectedProduct?.ebay_stock ?? saeStock) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {ebayConnected ? '🟢 Conectado' : '⚪ Sin conectar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                  {ebayConnected ? (
                    <>
                      <button
                        onClick={() => handleReconcileSingleChannel('ebay')}
                        className="w-full text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Conciliar solo este</span>
                      </button>
                      <button
                        onClick={() => handleTestChannel('ebay')}
                        disabled={testingChannel === 'ebay'}
                        className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        {testingChannel === 'ebay' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        <span>Probar Conexión</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/settings/integrations"
                      className="w-full text-center py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>

              {/* 5. Kaufland DE */}
              <div className={`flex flex-col justify-between border rounded-2xl p-4 shadow-xs transition-all ${
                kauflandConnected 
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${kauflandConnected ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      <Store size={20} />
                    </div>
                    {kauflandConnected && (
                      <button
                        onClick={() => handleOpenRuleModal('kaufland')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Configurar regla de stock para Kaufland"
                      >
                        <Sliders size={14} />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Kaufland DE
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {kauflandConnected ? (selectedProduct?.kaufland_stock ?? saeStock) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {kauflandConnected ? '🟢 Conectado' : '⚪ Sin conectar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                  {kauflandConnected ? (
                    <>
                      <button
                        onClick={() => handleReconcileSingleChannel('kaufland')}
                        className="w-full text-center py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Conciliar solo este</span>
                      </button>
                      <button
                        onClick={() => handleTestChannel('kaufland')}
                        disabled={testingChannel === 'kaufland'}
                        className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        {testingChannel === 'kaufland' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        <span>Probar Conexión</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/settings/integrations"
                      className="w-full text-center py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>

              {/* 6. Mercado Libre */}
              <div className={`flex flex-col justify-between border rounded-2xl p-4 shadow-xs transition-all ${
                mlConnected 
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${mlConnected ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      <Store size={20} />
                    </div>
                    {mlConnected && (
                      <button
                        onClick={() => handleOpenRuleModal('mercadolibre')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Configurar regla de stock para Mercado Libre"
                      >
                        <Sliders size={14} />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Mercado Libre
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {mlConnected ? (selectedProduct?.ml_stock ?? saeStock) : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {mlConnected ? '🟢 Conectado' : '⚪ Sin conectar'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                  {mlConnected ? (
                    <>
                      <button
                        onClick={() => handleReconcileSingleChannel('mercadolibre')}
                        className="w-full text-center py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Conciliar solo este</span>
                      </button>
                      <button
                        onClick={() => handleTestChannel('mercadolibre')}
                        disabled={testingChannel === 'mercadolibre'}
                        className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        {testingChannel === 'mercadolibre' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        <span>Probar Conexión</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/settings/integrations"
                      className="w-full text-center py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* BARRA INFERIOR DE ACCIONES: Ver Historial / Logs y Resolver Conflicto Manual */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Clock size={14} />
                <span>Última comprobación: {lastCheckTime.toLocaleString()}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOpenLogs}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
                >
                  <History size={14} className="text-blue-500" />
                  <span>Ver Historial / Logs</span>
                </button>

                <button
                  onClick={handleOpenConflictModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  <Zap size={14} />
                  <span>Resolver Conflicto Manual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px] transition-colors">
          <GitCompare size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-4">Seleccione un SKU para iniciar la conciliación.</p>
          {selectedSku && (
            <button
              type="button"
              onClick={() => handleReconcileCheck(selectedSku)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <GitCompare size={12} />
              <span>Conciliar Ahora</span>
            </button>
          )}
        </div>
      )}

      {/* ================= MODALES DE ACCIÓN ================= */}

      {/* 1. Modal Editar Stock Físico Central */}
      {isEditStockOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ajustar Stock Físico Central</h3>
                  <p className="text-[11px] text-slate-400">{selectedProduct.nombre} ({selectedProduct.sku})</p>
                </div>
              </div>
              <button onClick={() => setIsEditStockOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCentralStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nuevo Stock Físico (Unidades en Almacén)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editStockValue}
                  onChange={(e) => setEditStockValue(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Stock actual: <strong className="font-mono">{selectedProduct.stock} uds</strong>. Si llegó mercancía o hubo merma, ajusta aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Motivo del Movimiento (Auditoría)
                </label>
                <select
                  value={editStockReason}
                  onChange={(e) => setEditStockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="Llegada de mercancía / Proveedor">📦 Recepción de Mercancía / Proveedor</option>
                  <option value="Conteo físico / Ajuste de inventario">📋 Ajuste por Conteo Físico / Inventario</option>
                  <option value="Merma o producto dañado">⚠️ Merma / Producto Dañado</option>
                  <option value="Devolución de cliente">↩️ Devolución de Cliente</option>
                  <option value="Ajuste manual de bodega">🔧 Ajuste Manual de Bodega</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditStockOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStock}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {savingStock ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Guardar y Replicar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Configurar Regla de Canal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Regla de Stock: {selectedRuleChannel.toUpperCase()}</h3>
                  <p className="text-[11px] text-slate-400">Personaliza la política de publicación para este marketplace</p>
                </div>
              </div>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Tipo de Regla
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentRule(prev => ({ ...prev, mode: 'percentage' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      currentRule.mode === 'percentage'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block">Porcentaje (%)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Ej: Publicar solo el 90%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentRule(prev => ({ ...prev, mode: 'fixed_buffer' }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      currentRule.mode === 'fixed_buffer'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block">Buffer Fijo (-uds)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Ej: Reservar -2 unidades</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {currentRule.mode === 'percentage' ? 'Porcentaje de Stock a Enviar (%)' : 'Unidades de Reserva Fija (Buffer)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={currentRule.mode === 'percentage' ? 10 : 0}
                    max={currentRule.mode === 'percentage' ? 100 : 50}
                    value={currentRule.value}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, value: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  />
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {currentRule.mode === 'percentage' ? '%' : 'pzas'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {currentRule.mode === 'percentage'
                    ? `Si Almacén Central tiene 100 piezas, a ${selectedRuleChannel.toUpperCase()} se publicarán ${Math.floor(100 * (currentRule.value / 100))} piezas.`
                    : `Si Almacén Central tiene 10 piezas, a ${selectedRuleChannel.toUpperCase()} se publicarán ${Math.max(0, 10 - currentRule.value)} piezas.`}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={13} />
                  <span>Guardar Regla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Historial de Auditoría / Logs */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registro de Auditoría & Trazabilidad</h3>
                  <p className="text-[11px] text-slate-400">SKU: {selectedSku} — {selectedProduct?.nombre}</p>
                </div>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">No hay eventos de auditoría registrados para este SKU aún.</p>
                  <p className="text-[11px]">Cualquier ajuste manual, venta o sincronización generará un log aquí.</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 mt-1">
                      <span>Stock previo: <strong>{log.previousStock}</strong></span>
                      <span>→</span>
                      <span>Nuevo stock: <strong className="text-blue-600">{log.newStock}</strong></span>
                      <span>• Origen: <strong>{log.source}</strong></span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1 border-t border-slate-200/40 dark:border-slate-800/60 mt-1">
                        Motivo: {log.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Resolver Conflicto Manual */}
      {isConflictModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resolver Conflicto de Stock Manualmente</h3>
                  <p className="text-[11px] text-slate-400">SKU: {selectedSku} — Selecciona qué fuente prevalece</p>
                </div>
              </div>
              <button onClick={() => setIsConflictModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyConflictResolution} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cuando hay una discrepancia entre almacén central y tiendas externas (ej. una tienda vendió offline), elige cuál stock debe ser el <strong>Inventario Maestro de Referencia</strong> para sobreescribir a todos los canales.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Selecciona la Fuente Ganadora:
                </label>

                {/* Opción SAE */}
                <label
                  onClick={() => {
                    setConflictMasterSource('sae');
                    setConflictCustomStock(selectedProduct.stock);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    conflictMasterSource === 'sae' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Database size={16} className="text-blue-600" />
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Almacén Central (SAE)</span>
                      <span className="text-[10px] text-slate-400">Stock físico en bodega</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-600">{selectedProduct.stock} uds</span>
                </label>

                {/* Opción Shopify */}
                {shopifyConnected && (
                  <label
                    onClick={() => {
                      setConflictMasterSource('shopify');
                      setConflictCustomStock(selectedProduct.shopify_stock ?? selectedProduct.stock);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      conflictMasterSource === 'shopify' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag size={16} className="text-emerald-600" />
                      <div>
                        <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Shopify</span>
                        <span className="text-[10px] text-slate-400">Stock reportado por Shopify</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-600">{selectedProduct.shopify_stock ?? selectedProduct.stock} uds</span>
                  </label>
                )}

                {/* Opción Amazon */}
                {amazonConnected && (
                  <label
                    onClick={() => {
                      setConflictMasterSource('amazon');
                      setConflictCustomStock(selectedProduct.amazon_stock ?? selectedProduct.stock);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      conflictMasterSource === 'amazon' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe2 size={16} className="text-amber-600" />
                      <div>
                        <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">Amazon EU</span>
                        <span className="text-[10px] text-slate-400">Stock en Seller Central</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-amber-600">{selectedProduct.amazon_stock ?? selectedProduct.stock} uds</span>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Stock Final que se Aplicará a Todo el Sistema:
                </label>
                <input
                  type="number"
                  min="0"
                  value={conflictCustomStock}
                  onChange={(e) => setConflictCustomStock(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConflictModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolvingConflict}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {resolvingConflict ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Aplicar Resolución</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


