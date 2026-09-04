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
  HelpCircle
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
      
      // Actualizar estado local
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
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  const isSAEEnabled = settings.ENABLE_SAE ?? true;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Canales e Integraciones de Stock</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configura tu inventario principal (Shopify o SAE) y activa los canales donde vendes en tiempo real.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg shadow-blue-500/20 transition-all self-start md:self-auto"
        >
          <Save size={16} />
          <span>{saving ? 'Guardando...' : 'Guardar Todo'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* PANEL PRINCIPAL: ELECCIÓN DE INVENTARIO MAESTRO Y CANALES ACTIVOS */}
        <div className="bg-white border-2 border-blue-100 shadow-sm rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inventario Principal y Canales Activos</h2>
              <p className="text-xs text-slate-500">
                Define qué sistema manda sobre el stock y oculta los canales que no utilices en tu empresa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Selector de Inventario Principal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Inventario Principal (Fuente de la Verdad)
              </label>
              <select
                value={settings.INVENTARIO_PRINCIPAL || 'shopify'}
                onChange={(e) => handleInputChange('INVENTARIO_PRINCIPAL', e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
              >
                <option value="shopify">🛍️ Shopify (Tiendas Online y Marcas Propias)</option>
                <option value="amazon">📦 Amazon SP-API (Seller Central - México, EE.UU. y Europa)</option>
                <option value="mercadolibre">🟡 Mercado Libre (Catálogo Central)</option>
                <option value="ebay">🇩🇪 eBay (eBay Alemania / Europa)</option>
                <option value="kaufland">🔴 Kaufland (Kaufland Global Marketplace - Alemania)</option>
                <option value="tiktok">🎵 TikTok Shop (Catálogo TikTok Shop)</option>
                <option value="sae">🖥️ CONTPAQi SAE / Excel (Bodega Física o ERP Administrativo)</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Cuando caiga una venta en cualquier canal, este inventario maestro será la fuente de la verdad para actualizar en cascada a todos los demás.
              </p>
            </div>

            {/* Checkboxes de Canales Activos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Canales que usas en tu negocio
              </label>
              <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Store size={16} className="text-emerald-600" />
                    Shopify
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_SHOPIFY ?? true}
                    onChange={(e) => handleInputChange('ENABLE_SHOPIFY', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Database size={16} className="text-blue-600" />
                    CONTPAQi SAE (Desmarcar para ocultar)
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_SAE ?? true}
                    onChange={(e) => handleInputChange('ENABLE_SAE', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-amber-500" />
                    Mercado Libre
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_MERCADOLIBRE ?? true}
                    onChange={(e) => handleInputChange('ENABLE_MERCADOLIBRE', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Video size={16} className="text-rose-500" />
                    TikTok Shop
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_TIKTOK ?? true}
                    onChange={(e) => handleInputChange('ENABLE_TIKTOK', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Globe2 size={16} className="text-amber-600" />
                    Amazon SP-API
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_AMAZON ?? true}
                    onChange={(e) => handleInputChange('ENABLE_AMAZON', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-blue-500" />
                    eBay Alemania / Europa
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_EBAY ?? true}
                    onChange={(e) => handleInputChange('ENABLE_EBAY', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Store size={16} className="text-red-600" />
                    Kaufland Alemania / Europa
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.ENABLE_KAUFLAND ?? true}
                    onChange={(e) => handleInputChange('ENABLE_KAUFLAND', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETAS DE CONEXIÓN POR CANAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. SHOPIFY */}
          {(settings.ENABLE_SHOPIFY ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Shopify</h3>
                      <p className="text-xs text-slate-500">Admin GraphQL API (2026-07)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {status?.shopify.status === 'connected' ? 'Conectado' : 'Activo'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Dominio de la Tienda (.myshopify.com)</label>
                    <input
                      type="text"
                      value={settings.SHOP_DOMAIN}
                      onChange={(e) => handleInputChange('SHOP_DOMAIN', e.target.value)}
                      placeholder="tu-tienda.myshopify.com"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Admin API Access Token</label>
                    <input
                      type="password"
                      value={settings.SHOPIFY_ACCESS_TOKEN}
                      onChange={(e) => handleInputChange('SHOPIFY_ACCESS_TOKEN', e.target.value)}
                      placeholder="shpat_••••••••"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Location ID</label>
                      <input
                        type="text"
                        value={settings.SHOPIFY_LOCATION_ID}
                        onChange={(e) => handleInputChange('SHOPIFY_LOCATION_ID', e.target.value)}
                        placeholder="gid://shopify/Location/123"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">API Secret (Webhooks)</label>
                      <input
                        type="password"
                        value={settings.SHOPIFY_API_SECRET}
                        onChange={(e) => handleInputChange('SHOPIFY_API_SECRET', e.target.value)}
                        placeholder="shpss_••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('shopify')}
                        disabled={testingChannel === 'shopify'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {testingChannel === 'shopify' ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Probando...</span>
                          </>
                        ) : (
                          <>
                            <Activity size={13} />
                            <span>Probar Conexión en Vivo</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testResults['shopify'] && (
                      <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        testResults['shopify'].success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        {testResults['shopify'].success ? (
                          <CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                        ) : (
                          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                        )}
                        <span>{testResults['shopify'].message}</span>
                      </div>
                    )}
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en Shopify?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. Dominio:</strong> El subdominio oficial que termina en <code>.myshopify.com</code> (ej: <code>tu-tienda.myshopify.com</code>).</p>
                      <p><strong>2. Access Token:</strong> En tu Shopify Admin ve a <em>Configuración</em> &gt; <em>Apps y canales de venta</em> &gt; <em>Desarrollar apps</em> &gt; <em>Crear una app</em> (nombre: InventorySync). En configuración de API marca los permisos de <code>read_products, write_products, read_inventory, write_inventory, read_orders</code>. Dale <em>Instalar app</em> y copia el token que inicia con <code>shpat_...</code>.</p>
                      <p><strong>3. Location ID:</strong> En <em>Configuración</em> &gt; <em>Ubicaciones</em>, haz clic en tu almacén o tienda principal. El ID es el número al final de la URL en tu navegador (ej: <code>gid://shopify/Location/83942019</code>).</p>
                      <p><strong>4. API Secret:</strong> En la misma app que creaste, en la sección de credenciales copia el Secreto de API (inicia con <code>shpss_...</code>).</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 2. MERCADO LIBRE */}
          {(settings.ENABLE_MERCADOLIBRE ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Mercado Libre</h3>
                      <p className="text-xs text-slate-500">REST API & Webhooks</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {status?.mercadolibre.status === 'connected' ? 'Conectado' : 'Activo'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Access Token (Bearer APP_USR-...)</label>
                    <input
                      type="password"
                      value={settings.ML_ACCESS_TOKEN}
                      onChange={(e) => handleInputChange('ML_ACCESS_TOKEN', e.target.value)}
                      placeholder="APP_USR-••••••••"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">User ID (Seller ID)</label>
                      <input
                        type="text"
                        value={settings.ML_USER_ID}
                        onChange={(e) => handleInputChange('ML_USER_ID', e.target.value)}
                        placeholder="123456789"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Site ID</label>
                      <input
                        type="text"
                        value={settings.ML_SITE_ID}
                        onChange={(e) => handleInputChange('ML_SITE_ID', e.target.value)}
                        placeholder="MLM"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('mercadolibre')}
                        disabled={testingChannel === 'mercadolibre'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {testingChannel === 'mercadolibre' ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Probando...</span>
                          </>
                        ) : (
                          <>
                            <Activity size={13} />
                            <span>Probar Conexión en Vivo</span>
                          </>
                        )}
                      </button>
                    </div>

                    {testResults['mercadolibre'] && (
                      <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        testResults['mercadolibre'].success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        {testResults['mercadolibre'].success ? (
                          <CheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                        ) : (
                          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                        )}
                        <span>{testResults['mercadolibre'].message}</span>
                      </div>
                    )}
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en Mercado Libre?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. Access Token:</strong> Entra a <a href="https://developers.mercadolibre.com.mx" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">developers.mercadolibre.com.mx</a> con la cuenta del vendedor &gt; <em>Mis aplicaciones</em> &gt; <em>Crear aplicación</em>. En autenticación genera tu Access Token (inicia con <code>APP_USR-...</code>).</p>
                      <p><strong>2. User ID:</strong> Es tu número de cuenta de vendedor. Al dar clic en <em>Probar Conexión en Vivo</em> el sistema lo detecta y autocompleta automáticamente.</p>
                      <p><strong>3. Site ID:</strong> Escribe <code>MLM</code> para México, <code>MLA</code> para Argentina o <code>MCO</code> para Colombia.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 3. TIKTOK SHOP */}
          {(settings.ENABLE_TIKTOK ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Video size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">TikTok Shop</h3>
                      <p className="text-xs text-slate-500">Partner Open API (202309)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {status?.tiktok?.status === 'connected' ? 'Conectado' : 'Activo'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">App Key</label>
                      <input
                        type="text"
                        value={settings.TIKTOK_APP_KEY || ''}
                        onChange={(e) => handleInputChange('TIKTOK_APP_KEY', e.target.value)}
                        placeholder="6abcde123..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">App Secret</label>
                      <input
                        type="password"
                        value={settings.TIKTOK_APP_SECRET || ''}
                        onChange={(e) => handleInputChange('TIKTOK_APP_SECRET', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Access Token</label>
                    <input
                      type="password"
                      value={settings.TIKTOK_ACCESS_TOKEN || ''}
                      onChange={(e) => handleInputChange('TIKTOK_ACCESS_TOKEN', e.target.value)}
                      placeholder="ttp_••••••••"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Shop ID / Cipher</label>
                      <input
                        type="text"
                        value={settings.TIKTOK_SHOP_ID || ''}
                        onChange={(e) => handleInputChange('TIKTOK_SHOP_ID', e.target.value)}
                        placeholder="7495812..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Webhook Secret</label>
                      <input
                        type="password"
                        value={settings.TIKTOK_SHOP_CIPHER || ''}
                        onChange={(e) => handleInputChange('TIKTOK_SHOP_CIPHER', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en TikTok Shop?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. App Key & App Secret:</strong> Entra a <a href="https://partner.tiktokshop.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">partner.tiktokshop.com</a> &gt; <em>App Management</em> &gt; <em>Create App</em> (categoría ERP / Inventory). Obtén tus claves API de desarrollador.</p>
                      <p><strong>2. Shop ID / Code:</strong> En tu TikTok Shop Seller Center, ve a <em>My Account</em> &gt; <em>Account Settings</em> y copia tu código de tienda.</p>
                      <p><strong>3. Access Token:</strong> En Partner Center, autoriza tu propia tienda desde <em>Authorization Management</em> para generar el token permanente.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 4. AMAZON */}
          {(settings.ENABLE_AMAZON ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Globe2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Amazon SP-API</h3>
                      <p className="text-xs text-slate-500">Listings Items & FBA Inventory</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {status?.amazon?.status === 'connected' ? 'Conectado' : 'Activo'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Seller ID / Merchant</label>
                      <input
                        type="text"
                        value={settings.AMAZON_SELLER_ID || ''}
                        onChange={(e) => handleInputChange('AMAZON_SELLER_ID', e.target.value)}
                        placeholder="A1ABC23XYZ"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Marketplace ID</label>
                      <input
                        type="text"
                        value={settings.AMAZON_MARKETPLACE_ID || 'A1AM78C64UM0Y8'}
                        onChange={(e) => handleInputChange('AMAZON_MARKETPLACE_ID', e.target.value)}
                        placeholder="A1AM78C64UM0Y8 (México)"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">LWA Client ID</label>
                    <input
                      type="text"
                      value={settings.AMAZON_CLIENT_ID || ''}
                      onChange={(e) => handleInputChange('AMAZON_CLIENT_ID', e.target.value)}
                      placeholder="amzn1.application-oa2-client.xxxx"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">LWA Client Secret</label>
                      <input
                        type="password"
                        value={settings.AMAZON_CLIENT_SECRET || ''}
                        onChange={(e) => handleInputChange('AMAZON_CLIENT_SECRET', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">LWA Refresh Token</label>
                      <input
                        type="password"
                        value={settings.AMAZON_REFRESH_TOKEN || ''}
                        onChange={(e) => handleInputChange('AMAZON_REFRESH_TOKEN', e.target.value)}
                        placeholder="Atzr|••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en Amazon Seller Central?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. Seller ID:</strong> En <a href="https://sellercentral-europe.amazon.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">sellercentral-europe.amazon.com</a> &gt; <em>Settings</em> &gt; <em>Account Info</em> &gt; <em>Merchant Token</em>.</p>
                      <p><strong>2. LWA Client ID & Secret:</strong> En <em>Apps & Services</em> &gt; <em>Develop Apps</em>, genera las claves de Login with Amazon (LWA).</p>
                      <p><strong>3. Marketplace IDs Europa:</strong> Alemania: <code>A1PA6795UKMFR9</code>, España: <code>A1RKKUPIHCS9HS</code>, Italia: <code>APJ6JRA9NG5V4</code>, Francia: <code>A13V1IB3VIYZZH</code>, UK: <code>A1F83G8C2ARO7P</code>, México: <code>A1AM78C64UM0Y8</code>.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 5. EBAY ALEMANIA / EUROPA (EBAY SELL INVENTORY API) */}
          {(settings.ENABLE_EBAY ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">eBay Alemania / Europa</h3>
                      <p className="text-xs text-slate-500">Sell Inventory API (OAuth2)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {status?.ebay?.status === 'connected' ? 'Conectado' : 'Alemania / DE'}
                  </span>
                </div>

                {/* Botón Probar Conexión en Vivo */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('ebay')}
                    disabled={testingChannel === 'ebay'}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
                  >
                    {testingChannel === 'ebay' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-blue-600" />
                        <span>Verificando con eBay Developer Portal...</span>
                      </>
                    ) : (
                      <>
                        <Activity size={14} className="text-blue-600" />
                        <span>Probar Conexión en Vivo con eBay</span>
                      </>
                    )}
                  </button>

                  {testResults['ebay'] && (
                    <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                      testResults['ebay'].success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {testResults['ebay'].success ? (
                        <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{testResults['ebay'].success ? 'Conexión Exitosa' : 'Fallo de Conexión'}</p>
                        <p className="text-[11px] mt-0.5">{testResults['ebay'].message}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">eBay Marketplace</label>
                    <select
                      value={settings.EBAY_MARKETPLACE_ID || 'EBAY_DE'}
                      onChange={(e) => handleInputChange('EBAY_MARKETPLACE_ID', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white font-semibold cursor-pointer"
                    >
                      <option value="EBAY_DE">🇩🇪 eBay Alemania (EBAY_DE)</option>
                      <option value="EBAY_ES">🇪🇸 eBay España (EBAY_ES)</option>
                      <option value="EBAY_IT">🇮🇹 eBay Italia (EBAY_IT)</option>
                      <option value="EBAY_FR">🇫🇷 eBay Francia (EBAY_FR)</option>
                      <option value="EBAY_GB">🇬🇧 eBay Reino Unido (EBAY_GB)</option>
                      <option value="EBAY_US">🇺🇸 eBay Estados Unidos (EBAY_US)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">App ID (Client ID)</label>
                    <input
                      type="text"
                      value={settings.EBAY_CLIENT_ID || ''}
                      onChange={(e) => handleInputChange('EBAY_CLIENT_ID', e.target.value)}
                      placeholder="Tu-App-ID-Production"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Cert ID (Client Secret)</label>
                      <input
                        type="password"
                        value={settings.EBAY_CLIENT_SECRET || ''}
                        onChange={(e) => handleInputChange('EBAY_CLIENT_SECRET', e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">OAuth2 Refresh Token</label>
                      <input
                        type="password"
                        value={settings.EBAY_REFRESH_TOKEN || ''}
                        onChange={(e) => handleInputChange('EBAY_REFRESH_TOKEN', e.target.value)}
                        placeholder="v^1.1#i^1#••••••••"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en eBay Developer Portal?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. Portal de Desarrollador:</strong> Ingresa a <a href="https://developer.ebay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">developer.ebay.com</a> con tu cuenta de vendedor de eBay.</p>
                      <p><strong>2. Production Keyset:</strong> Ve a <em>Application Keys</em> y genera tu juego de llaves de Producción (App ID y Cert ID).</p>
                      <p><strong>3. User Token (OAuth2):</strong> En <em>User Tokens</em>, selecciona el ámbito <code>https://api.ebay.com/oauth/api_scope/sell.inventory</code> y autoriza tu cuenta para obtener el <strong>Refresh Token</strong> permanente.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 6. KAUFLAND GLOBAL MARKETPLACE (ALEMANIA / DE) */}
          {(settings.ENABLE_KAUFLAND ?? true) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                      <Store size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Kaufland Global Marketplace</h3>
                      <p className="text-xs text-slate-500">Seller API v2 (Alemania / Kaufland.de)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                    {status?.kaufland?.status === 'connected' ? 'Conectado' : 'Alemania / DE'}
                  </span>
                </div>

                {/* Botón Probar Conexión en Vivo */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => handleTestConnection('kaufland')}
                    disabled={testingChannel === 'kaufland'}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
                  >
                    {testingChannel === 'kaufland' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-red-600" />
                        <span>Verificando con Kaufland Seller API...</span>
                      </>
                    ) : (
                      <>
                        <Activity size={14} className="text-red-600" />
                        <span>Probar Conexión en Vivo con Kaufland</span>
                      </>
                    )}
                  </button>

                  {testResults['kaufland'] && (
                    <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                      testResults['kaufland'].success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {testResults['kaufland'].success ? (
                        <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{testResults['kaufland'].success ? 'Conexión Exitosa' : 'Fallo de Conexión'}</p>
                        <p className="text-[11px] mt-0.5">{testResults['kaufland'].message}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">País / Storefront de Kaufland</label>
                    <select
                      value={settings.KAUFLAND_STOREFRONT || 'de'}
                      onChange={(e) => handleInputChange('KAUFLAND_STOREFRONT', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white font-semibold cursor-pointer"
                    >
                      <option value="de">🇩🇪 Alemania (Kaufland.de)</option>
                      <option value="pl">🇵🇱 Polonia (Kaufland.pl)</option>
                      <option value="cz">🇨🇿 República Checa (Kaufland.cz)</option>
                      <option value="sk">🇸🇰 Eslovaquia (Kaufland.sk)</option>
                      <option value="at">🇦🇹 Austria (Kaufland.at)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Client Key de Kaufland</label>
                    <input
                      type="text"
                      value={settings.KAUFLAND_CLIENT_KEY || ''}
                      onChange={(e) => handleInputChange('KAUFLAND_CLIENT_KEY', e.target.value)}
                      placeholder="kaufland-client-key-xxxx"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Secret Key de Kaufland</label>
                    <input
                      type="password"
                      value={settings.KAUFLAND_SECRET_KEY || ''}
                      onChange={(e) => handleInputChange('KAUFLAND_SECRET_KEY', e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-red-700 hover:text-red-800 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo extraer estas credenciales en Kaufland Seller Portal?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>1. Panel de Vendedor:</strong> Ingresa a <a href="https://sellerportal.kaufland.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">sellerportal.kaufland.de</a>.</p>
                      <p><strong>2. Menú de Configuración:</strong> Ve a <em>Shop-Einstellungen</em> (Configuración de la tienda) &gt; <em>API</em>.</p>
                      <p><strong>3. Generar Claves:</strong> Haz clic en <em>Neue API-Schlüssel generieren</em> para copiar tu <strong>Client Key</strong> y tu <strong>Secret Key</strong>.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* 7. CONTPAQi SAE (SOLO SI ENABLE_SAE ESTÁ MARCADO) */}
          {isSAEEnabled && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">CONTPAQi SAE</h3>
                      <p className="text-xs text-slate-500">Base de datos ERP / Catálogo Local</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {settings.SAE_REPOSITORY_TYPE === 'production' ? 'SQL Server' : 'Catálogo Local'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Ruta de Catálogo / Archivo SAE</label>
                    <input
                      type="text"
                      value={settings.SAE_DATA_PATH}
                      onChange={(e) => handleInputChange('SAE_DATA_PATH', e.target.value)}
                      placeholder="data/productos.json"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Modo de Operación</label>
                    <select
                      value={settings.SAE_REPOSITORY_TYPE}
                      onChange={(e) => handleInputChange('SAE_REPOSITORY_TYPE', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-slate-50 focus:bg-white"
                    >
                      <option value="mock">Catálogo Local de Productos</option>
                      <option value="production">Base de Datos SQL Server en Vivo (Producción)</option>
                    </select>
                  </div>

                  {/* Mini tutorial interactivo */}
                  <details className="mt-3 group bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 transition-all">
                    <summary className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 select-none">
                      <HelpCircle size={14} />
                      <span>¿Cómo conectar tus productos de CONTPAQi / SAE?</span>
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-600">
                      <p><strong>Opción 1 (Recomendada / Sin instalaciones):</strong> En tu sistema CONTPAQi / SAE ve a <em>Inventarios</em> &gt; <em>Reporte de Existencias</em> &gt; <em>Exportar a Excel</em>. Luego ve a la pantalla de <strong>Inventario</strong> en esta plataforma y súbelo con el botón <em>Importar Excel / CSV</em>.</p>
                      <p><strong>Opción 2 (SQL Server Local):</strong> Si deseas conexión automática permanente a la base de datos de tu servidor local, selecciona <em>Base de Datos SQL Server en Vivo</em> e ingresa tu cadena de conexión ODBC.</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Botón flotante o fijo para guardar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save size={18} />
            <span>{saving ? 'Guardando cambios...' : 'Guardar y Aplicar Configuración'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
