import { NextResponse } from 'next/server';

// Historial de ventas vacío por defecto hasta recibir órdenes reales de webhooks
let salesHistory: any[] = [];

export async function GET() {
  return NextResponse.json(salesHistory);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      salesHistory = body;
    } else if (body && typeof body === 'object') {
      salesHistory.unshift(body);
    }
    return NextResponse.json({ success: true, total: salesHistory.length });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al registrar venta' }, { status: 500 });
  }
}
