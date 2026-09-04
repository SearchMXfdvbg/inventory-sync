import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      sku: 'DE-EL-7890-PRO',
      nombre: 'Sony Alpha 7 IV Vollformat-Kamera (ILCE-7M4)',
      stock: 45,
      shopify_inventory_item_id: 'gid://shopify/InventoryItem/458921478',
      shopify_location_id: 'gid://shopify/Location/89123456',
      ml_item_id: 'MLM982314567',
      shopify_stock: 45,
      ml_stock: 45,
      amazon_stock: 45,
      ebay_stock: 45,
      kaufland_stock: 45
    },
    {
      sku: 'DE-IT-4421-SRV',
      nombre: 'Dell PowerEdge R750 Server 2x Xeon Silver 4314 64GB',
      stock: 18,
      shopify_inventory_item_id: 'gid://shopify/InventoryItem/458921479',
      shopify_location_id: 'gid://shopify/Location/89123456',
      ml_item_id: 'MLM982314568',
      shopify_stock: 18,
      ml_stock: 18,
      amazon_stock: 18,
      ebay_stock: 18,
      kaufland_stock: 18
    },
    {
      sku: 'DE-HW-9912-WRK',
      nombre: 'Bosch Professional Akku-Bohrschrauber GSR 18V-110 C',
      stock: 120,
      shopify_inventory_item_id: 'gid://shopify/InventoryItem/458921480',
      shopify_location_id: 'gid://shopify/Location/89123456',
      ml_item_id: 'MLM982314569',
      shopify_stock: 120,
      ml_stock: 120,
      amazon_stock: 120,
      ebay_stock: 120,
      kaufland_stock: 120
    },
    {
      sku: 'DE-AP-1029-MBP',
      nombre: 'Apple MacBook Pro 16" M3 Max 36GB / 1TB SSD Space Black',
      stock: 28,
      shopify_inventory_item_id: 'gid://shopify/InventoryItem/458921481',
      shopify_location_id: 'gid://shopify/Location/89123456',
      ml_item_id: 'MLM982314570',
      shopify_stock: 28,
      ml_stock: 28,
      amazon_stock: 28,
      ebay_stock: 28,
      kaufland_stock: 28
    },
    {
      sku: 'DE-AU-5510-LOG',
      nombre: 'Logitech MX Master 3S Wireless Performance Mouse',
      stock: 350,
      shopify_inventory_item_id: 'gid://shopify/InventoryItem/458921482',
      shopify_location_id: 'gid://shopify/Location/89123456',
      ml_item_id: 'MLM982314571',
      shopify_stock: 350,
      ml_stock: 350,
      amazon_stock: 350,
      ebay_stock: 350,
      kaufland_stock: 350
    }
  ]);
}
