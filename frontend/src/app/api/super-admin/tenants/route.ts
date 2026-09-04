import { NextResponse } from 'next/server';

let tenantsList = [
  {
    id: 'TNT-DE-001',
    name: 'TechStore Germany GmbH',
    owner: 'Hans Weber / Iván Martínez',
    email: 'h.weber@techstore-de.com',
    plan: 'Enterprise (39,000 SKUs)',
    maxSkus: 50000,
    activeSkus: 39420,
    channels: ['Shopify', 'Amazon DE', 'eBay DE', 'Kaufland'],
    status: 'ACTIVE',
    commission_rate: '25%',
    created_at: '2026-09-01T10:00:00Z',
    last_sync: 'Hace 2 minutos'
  },
  {
    id: 'TNT-MX-002',
    name: 'Distribuidora Electrónica MX',
    owner: 'Roberto Méndez',
    email: 'roberto@distribuidora-mx.com',
    plan: 'Plan Básico (<200 SKUs)',
    maxSkus: 200,
    activeSkus: 145,
    channels: ['Mercado Libre', 'Shopify', 'TikTok Shop'],
    status: 'ACTIVE',
    commission_rate: '20%',
    created_at: '2026-09-03T14:30:00Z',
    last_sync: 'Hace 5 minutos'
  }
];

export async function GET() {
  return NextResponse.json(tenantsList);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newTenant = {
      id: `TNT-${Date.now().toString().slice(-4)}`,
      name: body.name || 'Nuevo Cliente Comercial',
      owner: body.owner || 'Administrador Comercial',
      email: body.email || 'contacto@empresa.com',
      plan: body.plan || 'Plan Pro',
      maxSkus: body.maxSkus || 200,
      activeSkus: 0,
      channels: body.channels || ['Shopify'],
      status: 'ACTIVE',
      commission_rate: body.commission_rate || '25%',
      created_at: new Date().toISOString(),
      last_sync: 'Recién Creado'
    };
    tenantsList.unshift(newTenant);
    return NextResponse.json({ success: true, tenant: newTenant });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al crear perfil de cliente' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, plan, maxSkus, commission_rate } = body;
    const idx = tenantsList.findIndex(t => t.id === id);
    if (idx !== -1) {
      if (status) tenantsList[idx].status = status;
      if (plan) tenantsList[idx].plan = plan;
      if (maxSkus) tenantsList[idx].maxSkus = maxSkus;
      if (commission_rate) tenantsList[idx].commission_rate = commission_rate;
      return NextResponse.json({ success: true, tenant: tenantsList[idx] });
    }
    return NextResponse.json({ detail: 'Tenant no encontrado' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    tenantsList = tenantsList.filter(t => t.id !== id);
    return NextResponse.json({ success: true, message: 'Perfil de cliente eliminado' });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al eliminar' }, { status: 500 });
  }
}
