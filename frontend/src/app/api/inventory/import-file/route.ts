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
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ detail: 'El archivo está vacío' }, { status: 400 });
    }

    let headerRowIndex = 0;
    let headerColumns: string[] = [];

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const nonNullCells = row.filter((c: any) => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonNullCells.length < 2) continue;

      const cleanCells = nonNullCells.map((c: any) => String(c).trim().toLowerCase());
      const hasSku = cleanCells.some(c => c === 'sku' || c === 'codigo' || c === 'código' || c === 'clave' || c === 'id' || c === 'referencia' || c === 'articulo' || c === 'artículo' || c === 'item' || c.startsWith('sku'));
      const hasName = cleanCells.some(c => c.includes('nom') || c.includes('prod') || c.includes('desc') || c.includes('titul'));
      const hasStock = cleanCells.some(c => c.includes('stock') || c.includes('exist') || c.includes('cant') || c.includes('qty'));

      if (hasSku && (hasName || hasStock)) {
        headerRowIndex = r;
        headerColumns = row.map((cell: any) => (cell !== null && cell !== undefined ? String(cell).trim() : ''));
        break;
      }
    }

    if (headerColumns.length === 0) {
      headerColumns = rawRows[0].map((cell: any) => (cell !== null && cell !== undefined ? String(cell).trim() : ''));
    }

    const findColumnIndex = (possibleNames: string[]): number => {
      for (let c = 0; c < headerColumns.length; c++) {
        const cleanHeader = headerColumns[c].toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const target of possibleNames) {
          const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanHeader === cleanTarget || cleanHeader.includes(cleanTarget)) {
            return c;
          }
        }
      }
      return -1;
    };

    const skuCol = findColumnIndex(['sku', 'codigo', 'clave', 'referencia', 'articulo', 'item', 'id']);
    const nombreCol = findColumnIndex(['nombredelproducto', 'nombre', 'descripcion', 'producto', 'titulo', 'name', 'description', 'title']);
    const stockCol = findColumnIndex(['stock', 'existencias', 'cantidad', 'cant', 'qty', 'inventory', 'unidades', 'disponible']);
    const shopifyIdCol = findColumnIndex(['shopify_inventory_item_id', 'shopifyid', 'inventoryitemid', 'shopifyitemid', 'shopify']);
    const locationIdCol = findColumnIndex(['shopify_location_id', 'locationid', 'shopifylocation', 'location']);
    const mlIdCol = findColumnIndex(['ml_item_id', 'mlid', 'mercadolibreid', 'idml', 'mercadolibre', 'ml']);
    const amazonCol = findColumnIndex(['amazon_asin', 'amazon', 'asin']);
    const ebayCol = findColumnIndex(['ebay_item_id', 'ebayid', 'ebay']);
    const kauflandCol = findColumnIndex(['kaufland_offer_id', 'kauflandid', 'kaufland']);

    const products: any[] = [];

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let skuRaw = '';
      if (skuCol >= 0 && row[skuCol] !== undefined && row[skuCol] !== null) {
        skuRaw = String(row[skuCol]).trim();
      } else if (row[0] !== undefined && row[0] !== null) {
        skuRaw = String(row[0]).trim();
      }

      if (!skuRaw) continue;
      const cleanSkuUpper = skuRaw.toUpperCase();
      if (
        cleanSkuUpper === 'SKU' || 
        cleanSkuUpper === 'CODIGO' || 
        cleanSkuUpper === 'CLAVE' || 
        cleanSkuUpper === 'ID' || 
        cleanSkuUpper.includes('GENERADO') || 
        cleanSkuUpper.includes('PRODUCTOS UNICOS') ||
        cleanSkuUpper.includes('FACTURACION') ||
        cleanSkuUpper.includes('CATALOGO') ||
        cleanSkuUpper.length > 40
      ) {
        continue;
      }

      let nombreRaw = '';
      if (nombreCol >= 0 && row[nombreCol] !== undefined && row[nombreCol] !== null && String(row[nombreCol]).trim()) {
        nombreRaw = String(row[nombreCol]).trim();
      } else {
        nombreRaw = `Producto ${skuRaw}`;
      }

      let stock = 0;
      if (stockCol >= 0 && row[stockCol] !== undefined && row[stockCol] !== null) {
        const valStr = String(row[stockCol]).replace(/,/g, '').trim();
        const parsedNum = parseInt(valStr, 10);
        if (!isNaN(parsedNum)) stock = Math.max(0, parsedNum);
      }

      const shopifyId = (shopifyIdCol >= 0 && row[shopifyIdCol]) ? String(row[shopifyIdCol]).trim() : `gid://shopify/InventoryItem/${100000000 + products.length}`;
      const locationId = (locationIdCol >= 0 && row[locationIdCol]) ? String(row[locationIdCol]).trim() : 'gid://shopify/Location/89123456';
      const mlId = (mlIdCol >= 0 && row[mlIdCol]) ? String(row[mlIdCol]).trim() : `MLM${200000000 + products.length}`;
      const amazonAsin = (amazonCol >= 0 && row[amazonCol]) ? String(row[amazonCol]).trim() : undefined;
      const ebayId = (ebayCol >= 0 && row[ebayCol]) ? String(row[ebayCol]).trim() : undefined;
      const kauflandId = (kauflandCol >= 0 && row[kauflandCol]) ? String(row[kauflandCol]).trim() : undefined;

      products.push({
        sku: skuRaw,
        nombre: nombreRaw,
        stock,
        shopify_inventory_item_id: shopifyId,
        shopify_location_id: locationId,
        ml_item_id: mlId,
        shopify_stock: stock,
        ml_stock: stock,
        amazon_stock: amazonAsin ? stock : stock,
        ebay_stock: ebayId ? stock : stock,
        kaufland_stock: kauflandId ? stock : stock,
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
