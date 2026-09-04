import { NextResponse } from 'next/server';

// Catálogo real vacío por defecto hasta que el cliente importe sus productos o conecte sus tiendas
let inventoryCatalog: any[] = [];

export async function GET() {
  return NextResponse.json(inventoryCatalog);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      inventoryCatalog = body;
    } else if (body && typeof body === 'object') {
      inventoryCatalog.push(body);
    }
    return NextResponse.json({ success: true, total: inventoryCatalog.length });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al actualizar catálogo' }, { status: 500 });
  }
}
