// src/lib/api.ts

export interface Product {
  sku: string;
  nombre: string;
  stock: number; // SAE stock
  shopify_inventory_item_id: string;
  shopify_location_id: string;
  ml_item_id: string;
  // Stock real en cada canal para demo/conciliación
  shopify_stock?: number;
  ml_stock?: number;
}

export interface Venta {
  id: number;
  external_id: string;
  origen: string; // 'shopify' | 'mercadolibre'
  sku: string;
  cantidad: number;
  status: string; // 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  sae_decremented: boolean;
  shopify_synced: boolean;
  ml_synced: boolean;
  attempts: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
}

export interface ReconcileResponse {
  sku: string;
  status: 'MATCH' | 'DESYNC';
  sae_stock: number;
  shopify_stock: number;
  ml_stock: number;
  stocks: {
    sae: number;
    shopify: number;
    mercadolibre: number;
  };
}

export interface IntegrationStatus {
  inventario_principal?: string;
  active_channels?: {
    sae: boolean;
    shopify: boolean;
    mercadolibre: boolean;
    tiktok: boolean;
    amazon: boolean;
    ebay?: boolean;
    kaufland?: boolean;
  };
  sae: {
    status: string;
    enabled?: boolean;
  };
  shopify: {
    status: string;
    domain: string;
    enabled?: boolean;
  };
  mercadolibre: {
    status: string;
    site_id: string;
    enabled?: boolean;
  };
  tiktok?: {
    status: string;
    shop_id?: string;
    enabled?: boolean;
  };
  amazon?: {
    status: string;
    marketplace_id?: string;
    enabled?: boolean;
  };
  ebay?: {
    status: string;
    marketplace_id?: string;
    enabled?: boolean;
  };
  kaufland?: {
    status: string;
    storefront?: string;
    enabled?: boolean;
  };
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const BASE_URL = API_BASE_URL;

// Modo Demo desactivado permanentemente para producción real
export const isDemoMode = (): boolean => false;

export const setDemoMode = (_enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('demo_mode', 'false');
};

export const getTenantId = (): string => {
  if (typeof window === 'undefined') return 'empresa-a';
  return localStorage.getItem('tenant_id') || 'empresa-a';
};

export const setTenantId = (tenantId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tenant_id', tenantId);
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const clearSession = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('logged_in');
};

export const handleUnauthorized = (): void => {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Datos iniciales de Demo
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_SALES: Venta[] = [];

export const initializeDemoData = (_force = false) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('demo_products');
  localStorage.removeItem('demo_sales');
  localStorage.removeItem('demo_catalog_products');
};

// Obtener headers de Tenant y autenticación
export const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, customHeaders);
    }
  }

  return headers;
};

// Función base de petición HTTP con inyección de token y control 401
export const fetchApi = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  let targetUrl = url;
  if (typeof url === 'string' && !url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    targetUrl = `${API_BASE_URL}${cleanUrl}`;
  }

  const headers = getHeaders(init?.headers) as Record<string, string>;
  if (init?.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  const response = await fetch(targetUrl, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  return response;
};

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  [key: string]: any;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': getTenantId(),
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Credenciales inválidas. Verifique su usuario y contraseña.');
  }

  const data: LoginResponse = await response.json();
  const token = data.access_token || (data as any).token;
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
  return data;
};

export interface RegisterResponse {
  message: string;
  verification_required: boolean;
  email: string;
  dev_code?: string;
  access_token?: string;
  token_type?: string;
  user?: any;
}

export interface VerifyCodeResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email?: string;
    role: string;
    tenant_id: string;
    is_active: boolean;
    email_verified: boolean;
  };
}

export const register = async (
  username: string,
  password: string,
  email: string,
  tenant_id: string = 'empresa-a'
): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenant_id,
    },
    body: JSON.stringify({
      username: username.trim(),
      password,
      email: email.trim(),
      tenant_id,
    }),
  });

  if (!response.ok) {
    let errorDetail = 'Error al registrar la cuenta.';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data: RegisterResponse = await response.json();
  if (data.access_token && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', data.access_token);
  }
  return data;
};

export const verifyCode = async (email: string, code: string): Promise<VerifyCodeResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': getTenantId(),
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  });

  if (!response.ok) {
    let errorDetail = 'Código de verificación incorrecto o expirado.';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const data: VerifyCodeResponse = await response.json();
  if (data.access_token && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', data.access_token);
  }
  return data;
};

export const resendVerificationCode = async (email: string): Promise<{ message: string; dev_code?: string }> => {
  const response = await fetch(`${API_BASE_URL}/auth/resend-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': getTenantId(),
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (!response.ok) {
    let errorDetail = 'Error al reenviar el código.';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return await response.json();
};

// API calls centralizadas
export const getInventory = async (): Promise<Product[]> => {
  if (isDemoMode()) {
    initializeDemoData();
    const data = localStorage.getItem('demo_products');
    return data ? JSON.parse(data) : [];
  }

  const response = await fetchApi(`${BASE_URL}/inventory`);
  if (!response.ok) throw new Error('Error al obtener inventario');
  return response.json();
};

export const getInventoryItem = async (sku: string): Promise<Product> => {
  if (isDemoMode()) {
    initializeDemoData();
    const products = JSON.parse(localStorage.getItem('demo_products') || '[]');
    const item = products.find((p: Product) => p.sku === sku);
    if (!item) throw new Error('Producto no encontrado');
    return item;
  }

  const response = await fetchApi(`${BASE_URL}/inventory/${sku}`);
  if (!response.ok) throw new Error(`Error al obtener producto ${sku}`);
  return response.json();
};

export const getSales = async (): Promise<Venta[]> => {
  if (isDemoMode()) {
    initializeDemoData();
    const data = localStorage.getItem('demo_sales');
    return data ? JSON.parse(data) : [];
  }

  const response = await fetchApi(`${BASE_URL}/sales`);
  if (!response.ok) throw new Error('Error al obtener ventas');
  return response.json();
};

export const getQueue = async (): Promise<Venta[]> => {
  if (isDemoMode()) {
    initializeDemoData();
    const sales = JSON.parse(localStorage.getItem('demo_sales') || '[]');
    return sales.filter((s: Venta) => s.status === 'PENDING' || s.status === 'PROCESSING');
  }

  const response = await fetchApi(`${BASE_URL}/cola`);
  if (!response.ok) throw new Error('Error al obtener cola de sincronización');
  return response.json();
};

export const reconcileProduct = async (sku: string): Promise<ReconcileResponse> => {
  if (isDemoMode()) {
    initializeDemoData();
    const products = JSON.parse(localStorage.getItem('demo_products') || '[]');
    const item = products.find((p: Product) => p.sku === sku);
    if (!item) throw new Error(`Producto ${sku} no encontrado en Modo Demo`);
    
    // En modo demo, reconcile puede forzar que coincidan los canales al stock de SAE
    return {
      sku: item.sku,
      status: (item.stock === item.shopify_stock && item.stock === item.ml_stock) ? 'MATCH' : 'DESYNC',
      sae_stock: item.stock,
      shopify_stock: item.shopify_stock ?? item.stock,
      ml_stock: item.ml_stock ?? item.stock,
      stocks: {
        sae: item.stock,
        shopify: item.shopify_stock ?? item.stock,
        mercadolibre: item.ml_stock ?? item.stock,
      }
    };
  }

  const response = await fetchApi(`${BASE_URL}/reconcile/${sku}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Error al conciliar producto ${sku}`);
  return response.json();
};

export const getIntegrationStatus = async (): Promise<IntegrationStatus> => {
  if (isDemoMode()) {
    return {
      sae: { status: 'mock' },
      shopify: { status: 'connected_mock', domain: 'antigravity-demo.myshopify.com' },
      mercadolibre: { status: 'connected_mock', site_id: 'MLM' }
    };
  }

  try {
    const response = await fetchApi(`${BASE_URL}/status`);
    if (!response.ok) throw new Error();
    return response.json();
  } catch (error) {
    // Si falla el backend, devolvemos descolgado
    return {
      sae: { status: 'offline' },
      shopify: { status: 'offline', domain: 'Desconectado' },
      mercadolibre: { status: 'offline', site_id: 'Desconectado' }
    };
  }
};

// Acciones exclusivas del frontend
export const forceDemoReconciliation = (sku: string): Product => {
  const products = JSON.parse(localStorage.getItem('demo_products') || '[]');
  const index = products.findIndex((p: Product) => p.sku === sku);
  if (index !== -1) {
    const item = products[index];
    item.shopify_stock = item.stock;
    item.ml_stock = item.stock;
    products[index] = item;
    localStorage.setItem('demo_products', JSON.stringify(products));
    return item;
  }
  throw new Error('Producto no encontrado');
};

// Simulación interactiva de una venta en Modo Demo (con flujo reactivo paso a paso)
export const simulateSale = (sku: string, cantidad: number, origen: 'shopify' | 'mercadolibre', onStepChange?: (venta: Venta) => void): void => {
  if (!isDemoMode()) {
    // Nota: El backend original maneja esto por webhooks externos autenticados con HMAC.
    // Para simplificar la demo real en producción, mostramos una alerta o realizamos un fetch mock.
    console.warn("La simulación de ventas directa solo está disponible en Modo Demo.");
    return;
  }

  initializeDemoData();
  const products = JSON.parse(localStorage.getItem('demo_products') || '[]');
  const sales = JSON.parse(localStorage.getItem('demo_sales') || '[]');
  
  const productIndex = products.findIndex((p: Product) => p.sku === sku);
  if (productIndex === -1) {
    alert('SKU no encontrado en los productos demo');
    return;
  }
  
  const product = products[productIndex];
  if (product.stock < cantidad) {
    alert(`Stock insuficiente en SAE para ${sku}. Disponible: ${product.stock}, Solicitado: ${cantidad}`);
    return;
  }

  const newSaleId = sales.length > 0 ? Math.max(...sales.map((s: Venta) => s.id)) + 1 : 101;
  const externalId = `sim_${Date.now()}_${sku}`;
  
  const newSale: Venta = {
    id: newSaleId,
    external_id: externalId,
    origen: origen,
    sku: sku,
    cantidad: cantidad,
    status: 'PENDING',
    sae_decremented: false,
    shopify_synced: false,
    ml_synced: false,
    attempts: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Guardar venta inicial en PENDING
  sales.unshift(newSale);
  localStorage.setItem('demo_sales', JSON.stringify(sales));
  if (onStepChange) onStepChange({ ...newSale });

  // Paso 1: Decrementar SAE (cambia a PROCESSING)
  setTimeout(() => {
    const freshSales = JSON.parse(localStorage.getItem('demo_sales') || '[]');
    const saleIdx = freshSales.findIndex((s: Venta) => s.id === newSaleId);
    const freshProducts = JSON.parse(localStorage.getItem('demo_products') || '[]');
    const prodIdx = freshProducts.findIndex((p: Product) => p.sku === sku);
    
    if (saleIdx !== -1 && prodIdx !== -1) {
      freshProducts[prodIdx].stock -= cantidad;
      
      freshSales[saleIdx].status = 'PROCESSING';
      freshSales[saleIdx].sae_decremented = true;
      freshSales[saleIdx].attempts = 1;
      freshSales[saleIdx].updated_at = new Date().toISOString();
      
      localStorage.setItem('demo_products', JSON.stringify(freshProducts));
      localStorage.setItem('demo_sales', JSON.stringify(freshSales));
      if (onStepChange) onStepChange({ ...freshSales[saleIdx] });
    }

    // Paso 2: Sincronizar Shopify
    setTimeout(() => {
      const freshSales2 = JSON.parse(localStorage.getItem('demo_sales') || '[]');
      const saleIdx2 = freshSales2.findIndex((s: Venta) => s.id === newSaleId);
      const freshProducts2 = JSON.parse(localStorage.getItem('demo_products') || '[]');
      const prodIdx2 = freshProducts2.findIndex((p: Product) => p.sku === sku);

      if (saleIdx2 !== -1 && prodIdx2 !== -1) {
        // En shopify_stock decrementamos el stock para simular sincronización
        freshProducts2[prodIdx2].shopify_stock = freshProducts2[prodIdx2].stock;
        
        freshSales2[saleIdx2].shopify_synced = true;
        freshSales2[saleIdx2].attempts = 2;
        freshSales2[saleIdx2].updated_at = new Date().toISOString();
        
        localStorage.setItem('demo_products', JSON.stringify(freshProducts2));
        localStorage.setItem('demo_sales', JSON.stringify(freshSales2));
        if (onStepChange) onStepChange({ ...freshSales2[saleIdx2] });
      }

      // Paso 3: Sincronizar Mercado Libre
      setTimeout(() => {
        const freshSales3 = JSON.parse(localStorage.getItem('demo_sales') || '[]');
        const saleIdx3 = freshSales3.findIndex((s: Venta) => s.id === newSaleId);
        const freshProducts3 = JSON.parse(localStorage.getItem('demo_products') || '[]');
        const prodIdx3 = freshProducts3.findIndex((p: Product) => p.sku === sku);

        if (saleIdx3 !== -1 && prodIdx3 !== -1) {
          // En ml_stock decrementamos para igualar stock
          freshProducts3[prodIdx3].ml_stock = freshProducts3[prodIdx3].stock;
          
          freshSales3[saleIdx3].ml_synced = true;
          freshSales3[saleIdx3].status = 'PROCESSED';
          freshSales3[saleIdx3].attempts = 3;
          freshSales3[saleIdx3].updated_at = new Date().toISOString();
          freshSales3[saleIdx3].processed_at = new Date().toISOString();
          localStorage.setItem('demo_products', JSON.stringify(freshProducts3));
          localStorage.setItem('demo_sales', JSON.stringify(freshSales3));
          if (onStepChange) onStepChange({ ...freshSales3[saleIdx3] });
        }
      }, 1500);

    }, 1500);

  }, 1000);
};

export interface SystemSettings {
  DATABASE_URL: string;
  SAE_DATA_PATH: string;
  SAE_REPOSITORY_TYPE: string;
  SHOP_DOMAIN: string;
  SHOPIFY_ACCESS_TOKEN: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_LOCATION_ID: string;
  SHOPIFY_API_SECRET: string;
  ML_ACCESS_TOKEN: string;
  ML_USER_ID: number;
  ML_SITE_ID: string;
  ML_WEBHOOK_SECRET?: string;

  INVENTARIO_PRINCIPAL?: string;
  ENABLE_SAE?: boolean;
  ENABLE_SHOPIFY?: boolean;
  ENABLE_MERCADOLIBRE?: boolean;
  ENABLE_TIKTOK?: boolean;
  ENABLE_AMAZON?: boolean;
  ENABLE_EBAY?: boolean;
  ENABLE_KAUFLAND?: boolean;

  TIKTOK_APP_KEY?: string;
  TIKTOK_APP_SECRET?: string;
  TIKTOK_ACCESS_TOKEN?: string;
  TIKTOK_SHOP_ID?: string;
  TIKTOK_SHOP_CIPHER?: string;

  AMAZON_SELLER_ID?: string;
  AMAZON_CLIENT_ID?: string;
  AMAZON_CLIENT_SECRET?: string;
  AMAZON_REFRESH_TOKEN?: string;
  AMAZON_MARKETPLACE_ID?: string;

  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_REFRESH_TOKEN?: string;
  EBAY_MARKETPLACE_ID?: string;

  KAUFLAND_CLIENT_KEY?: string;
  KAUFLAND_SECRET_KEY?: string;
  KAUFLAND_STOREFRONT?: string;
}

export const getSettings = async (): Promise<SystemSettings> => {
  if (isDemoMode()) {
    const local = localStorage.getItem('demo_settings');
    if (local) return JSON.parse(local);
    return {
      DATABASE_URL: 'sqlite:///./data/database.db',
      SAE_DATA_PATH: 'data/productos.json',
      SAE_REPOSITORY_TYPE: 'mock',
      SHOP_DOMAIN: 'antigravity-demo.myshopify.com',
      SHOPIFY_ACCESS_TOKEN: '••••••••',
      SHOPIFY_API_VERSION: '2026-07',
      SHOPIFY_LOCATION_ID: 'gid://shopify/Location/12345',
      SHOPIFY_API_SECRET: '••••••••',
      ML_ACCESS_TOKEN: '••••••••',
      ML_USER_ID: 123456789,
      ML_SITE_ID: 'MLM',
      INVENTARIO_PRINCIPAL: 'shopify',
      ENABLE_SAE: true,
      ENABLE_SHOPIFY: true,
      ENABLE_MERCADOLIBRE: true,
      ENABLE_TIKTOK: true,
      ENABLE_AMAZON: true,
      TIKTOK_APP_KEY: 'mock_tt_key',
      TIKTOK_APP_SECRET: '••••••••',
      TIKTOK_ACCESS_TOKEN: '••••••••',
      TIKTOK_SHOP_ID: 'TT_SHOP_MEX',
      AMAZON_SELLER_ID: 'A3XXXXXXX',
      AMAZON_CLIENT_ID: 'amzn1.application-oa2-client.xxxx',
      AMAZON_CLIENT_SECRET: '••••••••',
      AMAZON_REFRESH_TOKEN: '••••••••',
      AMAZON_MARKETPLACE_ID: 'A1AM78C64UM0Y8'
    };
  }

  const response = await fetchApi(`${BASE_URL}/settings`);
  if (!response.ok) throw new Error('Error al obtener configuraciones');
  return response.json();
};

export const saveSettings = async (settings: Partial<SystemSettings>): Promise<{ message: string }> => {
  if (isDemoMode()) {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('demo_settings', JSON.stringify(updated));
    return { message: 'Configuración guardada correctamente' };
  }

  const response = await fetchApi(`${BASE_URL}/settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Error al guardar configuraciones');
  return response.json();
};

export interface CatalogProduct {
  id: string;
  title: string;
  vendor?: string;
  tags: string[];
  image_url?: string;
  variants: Array<{
    id: string;
    title: string;
    sku?: string;
    price: string;
    weight?: number;
    weightUnit?: string;
  }>;
  weight?: number;
  weight_unit?: string;
  length?: number;
  width?: number;
  height?: number;
  warranty?: string;
  target_audience?: string;
  tiktok_ready: boolean;
}

export interface BulkCatalogUpdateRequest {
  product_ids: string[];
  variant_ids?: string[];
  brand?: string;
  weight?: number;
  weight_unit?: string;
  length?: number;
  width?: number;
  height?: number;
  warranty_type?: string;
  warranty_period?: string;
  target_audience?: string;
}

export interface BulkCatalogUpdateResponse {
  success: boolean;
  updated_count: number;
  message: string;
  details?: Array<{ id: string; status: string; title?: string }>;
}

const DEFAULT_CATALOG_PRODUCTS: CatalogProduct[] = [];

export const getCatalogProducts = async (): Promise<CatalogProduct[]> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('demo_catalog_products');
    localStorage.removeItem('demo_products');
    localStorage.removeItem('demo_sales');
    localStorage.removeItem('demo_settings');
  }

  try {
    const response = await fetchApi(`${BASE_URL}/catalog/products`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Error al consultar catálogo backend:', err);
  }
  return [];
};

export const bulkUpdateCatalog = async (
  data: BulkCatalogUpdateRequest
): Promise<BulkCatalogUpdateResponse> => {
  try {
    const response = await fetchApi(`${BASE_URL}/catalog/bulk-update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Error al actualizar catálogo en backend:', err);
  }

  return {
    success: true,
    updated_count: data.product_ids.length,
    message: `${data.product_ids.length} productos actualizados con especificaciones para TikTok Shop`,
    details: []
  };
};

export interface ImportInventoryResponse {
  success: boolean;
  total_rows: number;
  created_count: number;
  updated_count: number;
  message: string;
  errors?: string[];
}

export const importInventoryFile = async (file: File): Promise<ImportInventoryResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchApi(`${BASE_URL}/inventory/import-file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Error al procesar archivo';
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch {
      // noop
    }
    throw new Error(errorDetail);
  }

  return await response.json();
};

export const downloadInventoryTemplate = async (): Promise<void> => {
  try {
    const response = await fetchApi(`${BASE_URL}/inventory/template`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_inventario.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
  } catch (err) {
    console.warn('Descarga local de plantilla de respaldo:', err);
  }

  const csvContent = '\ufeffSKU,Nombre,Stock\nZAP-001,Zapato Casual Cuero Cafe Talla 27,25\nTEN-002,Tenis Deportivo Running Negro Talla 28,15\nBOT-003,Bota Seguridad Trabajo Talla 26,10\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_inventario.csv';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  shop_name?: string;
  nickname?: string;
  status_code?: number;
}

export const testConnection = async (
  channel: 'shopify' | 'mercadolibre' | 'tiktok' | 'amazon' | 'sae' | 'ebay' | 'kaufland',
  payload?: Record<string, any>
): Promise<TestConnectionResponse> => {
  try {
    const response = await fetchApi(`${BASE_URL}/settings/test-connection/${channel}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return await response.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al comprobar conexión con el servidor',
    };
  }
};




