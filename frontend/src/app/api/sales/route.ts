import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 1042,
      external_id: 'EBAY_DE_2984129841',
      origen: 'ebay',
      sku: 'DE-EL-7890-PRO',
      cantidad: 1,
      status: 'PROCESSED',
      sae_decremented: true,
      shopify_synced: true,
      ml_synced: true,
      amazon_synced: true,
      ebay_synced: true,
      kaufland_synced: true,
      attempts: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
    },
    {
      id: 1041,
      external_id: 'KAUFLAND_DE_8819231',
      origen: 'kaufland',
      sku: 'DE-HW-9912-WRK',
      cantidad: 2,
      status: 'PROCESSED',
      sae_decremented: true,
      shopify_synced: true,
      ml_synced: true,
      amazon_synced: true,
      ebay_synced: true,
      kaufland_synced: true,
      attempts: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: 1040,
      external_id: 'AMZ_EU_DE_302-9912831-1928312',
      origen: 'amazon',
      sku: 'DE-AP-1029-MBP',
      cantidad: 1,
      status: 'PROCESSED',
      sae_decremented: true,
      shopify_synced: true,
      ml_synced: true,
      amazon_synced: true,
      ebay_synced: true,
      kaufland_synced: true,
      attempts: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 95).toISOString()
    },
    {
      id: 1039,
      external_id: 'SHOPIFY_ORD_9918231',
      origen: 'shopify',
      sku: 'DE-AU-5510-LOG',
      cantidad: 4,
      status: 'PROCESSED',
      sae_decremented: true,
      shopify_synced: true,
      ml_synced: true,
      amazon_synced: true,
      ebay_synced: true,
      kaufland_synced: true,
      attempts: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      processed_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    }
  ]);
}
