import { NextResponse } from 'next/server';

let currentSettings = {
  DATABASE_URL: 'postgresql://master:••••••••@aws-eu-central-1.rds.amazonaws.com:5432/inventory_sync',
  SAE_DATA_PATH: 'data/productos.json',
  SAE_REPOSITORY_TYPE: 'database',
  SHOP_DOMAIN: 'de-tech-store.myshopify.com',
  SHOPIFY_ACCESS_TOKEN: 'shpat_••••••••••••••••••••••••••••••',
  SHOPIFY_API_VERSION: '2026-07',
  SHOPIFY_LOCATION_ID: 'gid://shopify/Location/89123456',
  SHOPIFY_API_SECRET: 'shpss_•••••••••••••••••••••••••••••',
  ML_ACCESS_TOKEN: '••••••••',
  ML_USER_ID: 123456789,
  ML_SITE_ID: 'MLM',
  INVENTARIO_PRINCIPAL: 'shopify',
  ENABLE_SAE: true,
  ENABLE_SHOPIFY: true,
  ENABLE_MERCADOLIBRE: false,
  ENABLE_TIKTOK: false,
  ENABLE_AMAZON: true,
  ENABLE_EBAY: true,
  ENABLE_KAUFLAND: true,
  AMAZON_SELLER_ID: 'A21XXXXXXXXXX',
  AMAZON_CLIENT_ID: 'amzn1.application-oa2-client.••••••••',
  AMAZON_CLIENT_SECRET: 'amzn1.oa2-cs.v1.••••••••••••••••',
  AMAZON_REFRESH_TOKEN: 'Atzr|••••••••••••••••••••••••••••',
  AMAZON_MARKETPLACE_ID: 'A1PA6795UKMFR9',
  EBAY_CLIENT_ID: 'EbayApp-••••••••••••••••',
  EBAY_CLIENT_SECRET: 'PRD-••••••••••••••••••••',
  EBAY_REFRESH_TOKEN: 'v^1.1#••••••••••••••••••',
  EBAY_MARKETPLACE_ID: 'EBAY_DE',
  KAUFLAND_CLIENT_KEY: 'KFL_CLI_••••••••••••••••',
  KAUFLAND_SECRET_KEY: 'KFL_SEC_••••••••••••••••',
  KAUFLAND_STOREFRONT: 'de'
};

export async function GET() {
  return NextResponse.json(currentSettings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    currentSettings = { ...currentSettings, ...body };
    return NextResponse.json({ message: 'Configuración actualizada y sincronizada en los servidores' });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al actualizar' }, { status: 500 });
  }
}
