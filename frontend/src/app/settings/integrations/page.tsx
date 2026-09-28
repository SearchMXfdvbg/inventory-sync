'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Store, 
  Database, 
  CheckCircle, 
  XCircle, 
  Link2,
  Save,
  AlertCircle,
  Video,
  Globe2,
  Layers,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  Activity,
  RefreshCw,
  HelpCircle,
  Terminal,
  Cpu,
  Radio
} from 'lucide-react';
import { 
  getIntegrationStatus, 
  getSettings, 
  saveSettings, 
  testConnection,
  TestConnectionResponse,
  IntegrationStatus, 
  SystemSettings 
} from '@/lib/api';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    DATABASE_URL: '',
    SAE_DATA_PATH: '',
    SAE_REPOSITORY_TYPE: 'mock',
    SHOP_DOMAIN: '',
    SHOPIFY_ACCESS_TOKEN: '',
    SHOPIFY_API_VERSION: '',
    SHOPIFY_LOCATION_ID: '',
    SHOPIFY_API_SECRET: '',
    ML_ACCESS_TOKEN: '',
    ML_USER_ID: 0,
    ML_SITE_ID: '',
    INVENTARIO_PRINCIPAL: 'shopify',
    ENABLE_SAE: true,
    ENABLE_SHOPIFY: true,
    ENABLE_MERCADOLIBRE: true,
    ENABLE_TIKTOK: true,
    ENABLE_AMAZON: true,
    TIKTOK_APP_KEY: '',
    TIKTOK_APP_SECRET: '',
    TIKTOK_ACCESS_TOKEN: '',
    TIKTOK_SHOP_ID: '',
    TIKTOK_SHOP_CIPHER: '',
    AMAZON_SELLER_ID: '',
    AMAZON_CLIENT_ID: '',
    AMAZON_CLIENT_SECRET: '',
    AMAZON_REFRESH_TOKEN: '',
    AMAZON_MARKETPLACE_ID: 'A1AM78C64UM0Y8',
    ENABLE_EBAY: true,
    ENABLE_KAUFLAND: true,
    EBAY_CLIENT_ID: '',
    EBAY_CLIENT_SECRET: '',
    EBAY_REFRESH_TOKEN: '',
    EBAY_MARKETPLACE_ID: 'EBAY_DE',
    KAUFLAND_CLIENT_KEY: '',
    KAUFLAND_SECRET_KEY: '',
    KAUFLAND_STOREFRONT: 'de'
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestConnectionResponse>>({});

  const handleTestConnection = async (channel: 'shopify' | 'mercadolibre' | 'tiktok' | 'amazon' | 'sae' | 'ebay' | 'kaufland') => {
    setTestingChannel(channel);
    try {
      let payload: Record<string, any> = {};
      if (channel === 'shopify') {
        payload = {
          shop_domain: settings.SHOP_DOMAIN,
          access_token: settings.SHOPIFY_ACCESS_TOKEN,
        };
      } else if (channel === 'mercadolibre') {
        payload = {
          access_token: settings.ML_ACCESS_TOKEN,
        };
      } else if (channel === 'sae') {
        payload = {
          repository_type: settings.SAE_REPOSITORY_TYPE,
        };
      } else if (channel === 'ebay') {
        payload = {
          client_id: settings.EBAY_CLIENT_ID,
          client_secret: settings.EBAY_CLIENT_SECRET,
          refresh_token: settings.EBAY_REFRESH_TOKEN,
        };
      } else if (channel === 'kaufland') {
        payload = {
          client_key: settings.KAUFLAND_CLIENT_KEY,
          secret_key: settings.KAUFLAND_SECRET_KEY,
          storefront: settings.KAUFLAND_STOREFRONT,
        };
      }
      const res = await testConnection(channel, payload);
      setTestResults(prev => ({ ...prev, [channel]: res }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [channel]: { success: false, message: err.message || 'Error de conexión' }
      }));
    } finally {
      setTestingChannel(null);
    }
  };

  const fetchData = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        getIntegrationStatus(),
        getSettings()
      ]);
      setStatus(statusRes);
      setSettings(prev => ({
        ...prev,
        ...settingsRes,
        INVENTARIO_PRINCIPAL: settingsRes.INVENTARIO_PRINCIPAL || 'shopify',
        ENABLE_SAE: settingsRes.ENABLE_SAE ?? true,
        ENABLE_SHOPIFY: settingsRes.ENABLE_SHOPIFY ?? true,
        ENABLE_MERCADOLIBRE: settingsRes.ENABLE_MERCADOLIBRE ?? true,
        ENABLE_TIKTOK: settingsRes.ENABLE_TIKTOK ?? true,
        ENABLE_AMAZON: settingsRes.ENABLE_AMAZON ?? true,
        ENABLE_EBAY: settingsRes.ENABLE_EBAY ?? true,
        ENABLE_KAUFLAND: settingsRes.ENABLE_KAUFLAND ?? true,
      }));
    } catch (error) {
      console.error('Error al obtener datos de integraciones', error);
      showToast('Error al cargar la configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        ML_USER_ID: Number(settings.ML_USER_ID) || 0
      };
      
      const res = await saveSettings(payload);
      showToast(res.message || 'Configuración guardada correctamente.', 'success');
      
      const statusRes = await getIntegrationStatus();
      setStatus(statusRes);
      
      const settingsRes = await getSettings();
      setSettings(prev => ({ ...prev, ...settingsRes }));
    } catch (error) {
      console.error('Error al guardar configuración', error);
      showToast('Error al conectar con el servidor para guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 font-mono-code text-xs">
        <div className="p-4 border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] text-slate-600 dark:text-[#8e95a5] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00a843] dark:text-[#00ff66] animate-spin" />
          <span>CARGANDO CANALES E INTEGRACIONES...</span>
        </div>
      </div>
    );
  }

  // Calculate active connections
  const activeConnections = [];
  if (status?.active_channels?.shopify && settings.ENABLE_SHOPIFY) activeConnections.push({ name: 'Shopify', color: 'bg-emerald-500' });
  if (status?.active_channels?.mercadolibre && settings.ENABLE_MERCADOLIBRE) activeConnections.push({ name: 'Mercado Libre', color: 'bg-yellow-400' });
  if (settings.ENABLE_AMAZON && settings.AMAZON_CLIENT_ID && settings.AMAZON_REFRESH_TOKEN) activeConnections.push({ name: 'Amazon SP-API', color: 'bg-orange-500' });
  if (settings.ENABLE_TIKTOK && settings.TIKTOK_APP_KEY) activeConnections.push({ name: 'TikTok Shop', color: 'bg-pink-500' });
  if (settings.ENABLE_EBAY && settings.EBAY_CLIENT_ID) activeConnections.push({ name: 'eBay', color: 'bg-blue-500' });
  if (settings.ENABLE_KAUFLAND && settings.KAUFLAND_CLIENT_KEY) activeConnections.push({ name: 'Kaufland', color: 'bg-red-500' });
  if (status?.active_channels?.sae && settings.ENABLE_SAE) activeConnections.push({ name: 'CONTPAQi SAE', color: 'bg-indigo-500' });

  const isSAEEnabled = settings.ENABLE_SAE ?? true;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-mono-code text-xs">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 border shadow-hard text-xs font-bold transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-[#00ff66]/10 text-emerald-800 dark:text-[#00ff66] border-emerald-300 dark:border-[#00ff66]/50' 
            : 'bg-rose-50 dark:bg-[#ff3b00]/10 text-rose-800 dark:text-[#ff3b00] border-rose-300 dark:border-[#ff3b00]/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard">
        <div className="flex items-center gap-2 text-[#008f39] dark:text-[#00ff66] text-xs font-bold mb-1">
          <Terminal size={14} />
          <span>// ORQUESTACIÓN DE CANALES & ERP</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
          Canales e Integraciones de Stock
        </h1>
        <p className="text-slate-500 dark:text-[#8e95a5] text-xs mt-1">
          Configura el inventario maestro de referencia y activa la propagación bidireccional hacia los marketplaces conectados.
        </p>
      </div>

      {/* Active Connections Panel */}
      <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-4 shadow-hard flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase">
            <Radio size={14} className="text-[#008f39] dark:text-[#00ff66]" />
            CONEXIONES ACTIVAS EN EL HUB
          </h2>
          <p className="text-slate-500 dark:text-[#8e95a5] text-[11px] mt-0.5">Sistemas vinculados y en escucha de eventos de compra.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeConnections.length > 0 ? (
            activeConnections.map(conn => (
              <div key={conn.name} className="flex items-center gap-2 border border-slate-300 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] px-3 py-1">
                <span className={`w-2 h-2 ${conn.color} animate-pulse`}></span>
                <span className="text-slate-800 dark:text-white text-[11px] font-bold">{conn.name}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-1.5 border border-[#ff3b00]/40 bg-[#ff3b00]/10 px-3 py-1 text-[#ff3b00]">
              <XCircle size={14} />
              <span className="text-[11px] font-bold">NINGUNA CONEXIÓN ACTIVA</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* PANEL PRINCIPAL: ELECCIÓN DE INVENTARIO MAESTRO Y CANALES ACTIVOS */}
        <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-6 shadow-hard space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-[#20242c]">
            <Layers size={16} className="text-[#008f39] dark:text-[#00ff66]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              Inventario Maestro y Activación de Canales
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Selector de Inventario Principal */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase">
                // INVENTARIO PRINCIPAL (SISTEMA DE REFERENCIA)
              </label>
              <select
                value={settings.INVENTARIO_PRINCIPAL || 'shopify'}
                onChange={(e) => handleInputChange('INVENTARIO_PRINCIPAL', e.target.value)}
                className="w-full border border-slate-300 dark:border-[#20242c] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-[#090a0c] focus:border-[#00ff66] focus:outline-none cursor-pointer transition-colors font-mono-code font-bold"
              >
                <option value="shopify">Shopify (Tiendas Online y Marcas Propias)</option>
                <option value="amazon">Amazon SP-API (Seller Central - México, EE.UU. y Europa)</option>
                <option value="mercadolibre">Mercado Libre (Catálogo Central)</option>
                <option value="ebay">eBay Alemania / Europa</option>
                <option value="kaufland">Kaufland Global Marketplace - Alemania</option>
                <option value="tiktok">TikTok Shop</option>
                <option value="sae">CONTPAQi SAE / Excel (Bodega Física o ERP Administrativo)</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-[#555d6e] leading-relaxed">
                Cuando ocurra una venta en cualquier canal, este inventario maestro será el sistema de referencia para sincronizar en cascada a todos los demás.
              </p>
            </div>

            {/* Checkboxes de Canales Activos */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase">
                // CANALES ACTIVOS EN TU EMPRESA
              </label>
              <div className="border border-slate-300 dark:border-[#20242c] bg-slate-50 dark:bg-[#090a0c] p-3 space-y-2">
                {[
                  { key: 'ENABLE_SHOPIFY', label: 'Shopify', icon: Store },
                  { key: 'ENABLE_SAE', label: 'CONTPAQi SAE / ERP Local', icon: Database },
                  { key: 'ENABLE_MERCADOLIBRE', label: 'Mercado Libre', icon: ShoppingBag },
                  { key: 'ENABLE_TIKTOK', label: 'TikTok Shop', icon: Video },
                  { key: 'ENABLE_AMAZON', label: 'Amazon SP-API', icon: Globe2 },
                  { key: 'ENABLE_EBAY', label: 'eBay Alemania / Europa', icon: ShoppingBag },
                  { key: 'ENABLE_KAUFLAND', label: 'Kaufland Alemania / Europa', icon: Store }
                ].map(({ key, label, icon: Icon }) => (
                  <label key={key} className="flex items-center justify-between p-1.5 hover:bg-slate-200/50 dark:hover:bg-[#14171e] cursor-pointer transition-colors">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Icon size={14} className="text-[#008f39] dark:text-[#00ff66]" />
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(settings as any)[key] ?? true}
                      onChange={(e) => handleInputChange(key as keyof SystemSettings, e.target.checked)}
                      className="w-4 h-4 accent-[#00ff66] cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TARJETAS DE CONEXIÓN POR CANAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. SHOPIFY */}
          {(settings.ENABLE_SHOPIFY ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-[#008f39] dark:text-[#00ff66]" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">Shopify Admin GraphQL</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-[#00ff66]/40 text-[#008f39] dark:text-[#00ff66] bg-[#00ff66]/10 font-bold uppercase">
                    {status?.shopify.status === 'connected' ? 'CONECTADO' : 'CONFIGURADO'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                      // DOMINIO (.myshopify.com)
                    </label>
                    <input
                      type="text"
                      value={settings.SHOP_DOMAIN}
                      onChange={(e) => handleInputChange('SHOP_DOMAIN', e.target.value)}
                      placeholder="tu-tienda.myshopify.com"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                      // ADMIN API ACCESS TOKEN
                    </label>
                    <input
                      type="password"
                      value={settings.SHOPIFY_ACCESS_TOKEN}
                      onChange={(e) => handleInputChange('SHOPIFY_ACCESS_TOKEN', e.target.value)}
                      placeholder="shpat_••••••••"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                        // LOCATION ID
                      </label>
                      <input
                        type="text"
                        value={settings.SHOPIFY_LOCATION_ID}
                        onChange={(e) => handleInputChange('SHOPIFY_LOCATION_ID', e.target.value)}
                        placeholder="gid://shopify/Location/123"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                        // API SECRET
                      </label>
                      <input
                        type="password"
                        value={settings.SHOPIFY_API_SECRET}
                        onChange={(e) => handleInputChange('SHOPIFY_API_SECRET', e.target.value)}
                        placeholder="shpss_••••••••"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#20242c] space-y-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('shopify')}
                  disabled={testingChannel === 'shopify'}
                  className="w-full py-2 border border-slate-300 dark:border-[#20242c] bg-slate-100 dark:bg-[#14171e] hover:border-[#00ff66] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'shopify' ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-[#00ff66]" />
                      <span>PROBANDO CONEXIÓN GRAPHQL...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={13} className="text-[#00ff66]" />
                      <span>PROBAR CONEXIÓN EN VIVO</span>
                    </>
                  )}
                </button>

                {testResults['shopify'] && (
                  <div className={`p-2 border text-xs flex items-start gap-2 ${
                    testResults['shopify'].success 
                      ? 'border-[#00ff66]/40 bg-[#00ff66]/10 text-[#008f39] dark:text-[#00ff66]' 
                      : 'border-[#ff3b00]/40 bg-[#ff3b00]/10 text-[#ff3b00]'
                  }`}>
                    {testResults['shopify'].success ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{testResults['shopify'].message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. MERCADO LIBRE */}
          {(settings.ENABLE_MERCADOLIBRE ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-yellow-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">Mercado Libre REST API</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 font-bold uppercase">
                    {status?.mercadolibre.status === 'connected' ? 'CONECTADO' : 'CONFIGURADO'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                      // ACCESS TOKEN (BEARER APP_USR-...)
                    </label>
                    <input
                      type="password"
                      value={settings.ML_ACCESS_TOKEN}
                      onChange={(e) => handleInputChange('ML_ACCESS_TOKEN', e.target.value)}
                      placeholder="APP_USR-••••••••"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                        // USER ID (SELLER ID)
                      </label>
                      <input
                        type="text"
                        value={settings.ML_USER_ID}
                        onChange={(e) => handleInputChange('ML_USER_ID', e.target.value)}
                        placeholder="123456789"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">
                        // SITE ID
                      </label>
                      <input
                        type="text"
                        value={settings.ML_SITE_ID}
                        onChange={(e) => handleInputChange('ML_SITE_ID', e.target.value)}
                        placeholder="MLM"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#20242c] space-y-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('mercadolibre')}
                  disabled={testingChannel === 'mercadolibre'}
                  className="w-full py-2 border border-slate-300 dark:border-[#20242c] bg-slate-100 dark:bg-[#14171e] hover:border-[#00ff66] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'mercadolibre' ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-yellow-500" />
                      <span>PROBANDO CREDENCIALES ML...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={13} className="text-yellow-500" />
                      <span>PROBAR CONEXIÓN EN VIVO</span>
                    </>
                  )}
                </button>

                {testResults['mercadolibre'] && (
                  <div className={`p-2 border text-xs flex items-start gap-2 ${
                    testResults['mercadolibre'].success 
                      ? 'border-[#00ff66]/40 bg-[#00ff66]/10 text-[#008f39] dark:text-[#00ff66]' 
                      : 'border-[#ff3b00]/40 bg-[#ff3b00]/10 text-[#ff3b00]'
                  }`}>
                    {testResults['mercadolibre'].success ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{testResults['mercadolibre'].message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. TIKTOK SHOP */}
          {(settings.ENABLE_TIKTOK ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-rose-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">TikTok Shop Open API</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-bold uppercase">
                    {status?.tiktok?.status === 'connected' ? 'CONECTADO' : 'CONFIGURADO'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// APP KEY</label>
                      <input
                        type="text"
                        value={settings.TIKTOK_APP_KEY || ''}
                        onChange={(e) => handleInputChange('TIKTOK_APP_KEY', e.target.value)}
                        placeholder="6abcde..."
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// APP SECRET</label>
                      <input
                        type="password"
                        value={settings.TIKTOK_APP_SECRET || ''}
                        onChange={(e) => handleInputChange('TIKTOK_APP_SECRET', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// ACCESS TOKEN</label>
                    <input
                      type="password"
                      value={settings.TIKTOK_ACCESS_TOKEN || ''}
                      onChange={(e) => handleInputChange('TIKTOK_ACCESS_TOKEN', e.target.value)}
                      placeholder="ttp_••••••••"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. AMAZON */}
          {(settings.ENABLE_AMAZON ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <Globe2 size={16} className="text-orange-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">Amazon Selling Partner (SP-API)</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 font-bold uppercase">
                    {status?.amazon?.status === 'connected' ? 'CONECTADO' : 'CONFIGURADO'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// SELLER ID</label>
                      <input
                        type="text"
                        value={settings.AMAZON_SELLER_ID || ''}
                        onChange={(e) => handleInputChange('AMAZON_SELLER_ID', e.target.value)}
                        placeholder="A1ABC23XYZ"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// MARKETPLACE ID</label>
                      <input
                        type="text"
                        value={settings.AMAZON_MARKETPLACE_ID || 'A1AM78C64UM0Y8'}
                        onChange={(e) => handleInputChange('AMAZON_MARKETPLACE_ID', e.target.value)}
                        placeholder="A1AM78C64UM0Y8"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// LWA CLIENT ID</label>
                    <input
                      type="text"
                      value={settings.AMAZON_CLIENT_ID || ''}
                      onChange={(e) => handleInputChange('AMAZON_CLIENT_ID', e.target.value)}
                      placeholder="amzn1.application-oa2-client.xxxx"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// LWA SECRET</label>
                      <input
                        type="password"
                        value={settings.AMAZON_CLIENT_SECRET || ''}
                        onChange={(e) => handleInputChange('AMAZON_CLIENT_SECRET', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// REFRESH TOKEN</label>
                      <input
                        type="password"
                        value={settings.AMAZON_REFRESH_TOKEN || ''}
                        onChange={(e) => handleInputChange('AMAZON_REFRESH_TOKEN', e.target.value)}
                        placeholder="Atzr|••••••••"
                        className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. EBAY ALEMANIA / EUROPA */}
          {(settings.ENABLE_EBAY ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-blue-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">eBay Sell Inventory API</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-bold uppercase">
                    {status?.ebay?.status === 'connected' ? 'CONECTADO' : 'ALEMANIA / DE'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// MARKETPLACE</label>
                    <select
                      value={settings.EBAY_MARKETPLACE_ID || 'EBAY_DE'}
                      onChange={(e) => handleInputChange('EBAY_MARKETPLACE_ID', e.target.value)}
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none font-bold"
                    >
                      <option value="EBAY_DE">Alemania (EBAY_DE)</option>
                      <option value="EBAY_ES">España (EBAY_ES)</option>
                      <option value="EBAY_IT">Italia (EBAY_IT)</option>
                      <option value="EBAY_FR">Francia (EBAY_FR)</option>
                      <option value="EBAY_GB">Reino Unido (EBAY_GB)</option>
                      <option value="EBAY_US">Estados Unidos (EBAY_US)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// APP ID (CLIENT ID)</label>
                    <input
                      type="text"
                      value={settings.EBAY_CLIENT_ID || ''}
                      onChange={(e) => handleInputChange('EBAY_CLIENT_ID', e.target.value)}
                      placeholder="Tu-App-ID-Production"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#20242c] space-y-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('ebay')}
                  disabled={testingChannel === 'ebay'}
                  className="w-full py-2 border border-slate-300 dark:border-[#20242c] bg-slate-100 dark:bg-[#14171e] hover:border-[#00ff66] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'ebay' ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-blue-500" />
                      <span>PROBANDO CONEXIÓN EBAY...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={13} className="text-blue-500" />
                      <span>PROBAR CONEXIÓN EN VIVO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 6. KAUFLAND GLOBAL MARKETPLACE */}
          {(settings.ENABLE_KAUFLAND ?? true) && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-red-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">Kaufland Global Marketplace</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10 font-bold uppercase">
                    {status?.kaufland?.status === 'connected' ? 'CONECTADO' : 'ALEMANIA / DE'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// STOREFRONT</label>
                    <select
                      value={settings.KAUFLAND_STOREFRONT || 'de'}
                      onChange={(e) => handleInputChange('KAUFLAND_STOREFRONT', e.target.value)}
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none font-bold"
                    >
                      <option value="de">Alemania (Kaufland.de)</option>
                      <option value="pl">Polonia (Kaufland.pl)</option>
                      <option value="cz">República Checa (Kaufland.cz)</option>
                      <option value="sk">Eslovaquia (Kaufland.sk)</option>
                      <option value="at">Austria (Kaufland.at)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// CLIENT KEY</label>
                    <input
                      type="text"
                      value={settings.KAUFLAND_CLIENT_KEY || ''}
                      onChange={(e) => handleInputChange('KAUFLAND_CLIENT_KEY', e.target.value)}
                      placeholder="kaufland-client-key-xxxx"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#20242c] space-y-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection('kaufland')}
                  disabled={testingChannel === 'kaufland'}
                  className="w-full py-2 border border-slate-300 dark:border-[#20242c] bg-slate-100 dark:bg-[#14171e] hover:border-[#00ff66] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'kaufland' ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-red-500" />
                      <span>PROBANDO SELLER API...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={13} className="text-red-500" />
                      <span>PROBAR CONEXIÓN EN VIVO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 7. CONTPAQi SAE */}
          {isSAEEnabled && (
            <div className="border border-slate-200 dark:border-[#20242c] bg-white dark:bg-[#0d0e12] p-5 shadow-hard flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#20242c] mb-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-[#008f39] dark:text-[#00ff66]" />
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase">CONTPAQi SAE / ERP Local</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold uppercase">
                    {settings.SAE_REPOSITORY_TYPE === 'production' ? 'SQL SERVER EN VIVO' : 'CATÁLOGO LOCAL'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// RUTA O ORIGEN SAE</label>
                    <input
                      type="text"
                      value={settings.SAE_DATA_PATH}
                      onChange={(e) => handleInputChange('SAE_DATA_PATH', e.target.value)}
                      placeholder="data/productos.json"
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8e95a5] uppercase mb-1">// MODO OPERATIVO</label>
                    <select
                      value={settings.SAE_REPOSITORY_TYPE}
                      onChange={(e) => handleInputChange('SAE_REPOSITORY_TYPE', e.target.value)}
                      className="w-full border border-slate-300 dark:border-[#20242c] px-3 py-2 bg-slate-50 dark:bg-[#090a0c] text-slate-900 dark:text-white focus:border-[#00ff66] focus:outline-none font-bold"
                    >
                      <option value="mock">Catálogo Local de Productos</option>
                      <option value="production">Base de Datos SQL Server en Vivo (Producción)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Botón guardar cambios */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#00ff66] hover:bg-[#00d957] disabled:opacity-50 text-black px-8 py-3.5 font-bold text-xs shadow-hard border border-[#00ff66] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase"
          >
            <Save size={16} />
            <span>{saving ? 'GUARDANDO CAMBIOS EN EL CLUSTER...' : 'GUARDAR Y APLICAR CONFIGURACIÓN'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
