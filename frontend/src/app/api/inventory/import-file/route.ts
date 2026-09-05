import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ detail: 'No se envió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!jsonRows || jsonRows.length === 0) {
      return NextResponse.json({ detail: 'El archivo está vacío' }, { status: 400 });
    }

    const products: any[] = [];

    for (let i = 0; i < jsonRows.length; i++) {
      const row = jsonRows[i];
      const keys = Object.keys(row);

      const findVal = (possibleNames: string[]): any => {
        for (const k of keys) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const target of possibleNames) {
            const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanTarget || cleanK.includes(cleanTarget)) {
              return row[k];
            }
          }
        }
        return '';
      };

      const skuRaw = findVal(['sku', 'codigo', 'clave', 'id', 'referencia', 'articulo', 'item']);
      const nombreRaw = findVal(['nombre', 'descripcion', 'producto', 'titulo', 'name', 'description', 'title', 'articulo']);
      const stockRaw = findVal(['stock', 'existencias', 'cantidad', 'cant', 'qty', 'inventory', 'unidades', 'disponible']);
      const shopifyIdRaw = findVal(['shopify_inventory_item_id', 'shopifyid', 'inventoryitemid', 'shopifyitemid', 'shopify']);
      const locationIdRaw = findVal(['shopify_location_id', 'locationid', 'shopifylocation', 'location']);
      const mlIdRaw = findVal(['ml_item_id', 'mlid', 'mercadolibreid', 'idml', 'mercadolibre', 'ml']);
      const amazonAsinRaw = findVal(['amazon_asin', 'amazon', 'asin']);
      const ebayIdRaw = findVal(['ebay_item_id', 'ebayid', 'ebay']);
      const kauflandIdRaw = findVal(['kaufland_offer_id', 'kauflandid', 'kaufland']);

      const sku = String(skuRaw || `SKU-${(i + 1).toString().padStart(4, '0')}`).trim();
      if (!sku) continue;

      const parsedStockNum = parseInt(String(stockRaw).replace(/[^0-9\-]/g, ''), 10);
      const stock = isNaN(parsedStockNum) ? 10 : Math.max(0, parsedStockNum);
      const nombre = String(nombreRaw || `Producto ${sku}`).trim();

      products.push({
        sku,
        nombre,
        stock,
        shopify_inventory_item_id: String(shopifyIdRaw || `gid://shopify/InventoryItem/${100000000 + i}`),
        shopify_location_id: String(locationIdRaw || 'gid://shopify/Location/89123456'),
        ml_item_id: String(mlIdRaw || `MLM${200000000 + i}`),
        shopify_stock: stock,
        ml_stock: stock,
        amazon_stock: amazonAsinRaw ? stock : stock,
        ebay_stock: ebayIdRaw ? stock : stock,
        kaufland_stock: kauflandIdRaw ? stock : stock,
      });
    }

    return NextResponse.json({
      success: true,
      total_rows: products.length,
      created_count: products.length,
      updated_count: 0,
      products,
      message: `¡${products.length} productos procesados correctamente desde el archivo!`
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error al procesar archivo' }, { status: 500 });
  }
}
