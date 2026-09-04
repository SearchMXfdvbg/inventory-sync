import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    inventario_principal: 'shopify',
    active_channels: {
      sae: true,
      shopify: true,
      mercadolibre: false,
      tiktok: false,
      amazon: true,
      ebay: true,
      kaufland: true,
    },
    sae: { status: 'connected', enabled: true },
    shopify: { status: 'connected', domain: 'de-tech-store.myshopify.com', enabled: true },
    mercadolibre: { status: 'offline', site_id: 'MLM', enabled: false },
    tiktok: { status: 'offline', shop_id: '', enabled: false },
    amazon: { status: 'connected', marketplace_id: 'A1PA6795UKMFR9 (Alemania/DE)', enabled: true },
    ebay: { status: 'connected', marketplace_id: 'EBAY_DE (Alemania)', enabled: true },
    kaufland: { status: 'connected', storefront: 'de (Kaufland.de)', enabled: true }
  });
}
