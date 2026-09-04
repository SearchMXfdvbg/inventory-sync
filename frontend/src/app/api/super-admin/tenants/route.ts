import { NextResponse } from 'next/server';
import { getAllTenants, updateTenantStatus, updateTenantDetails, deleteTenant, registerNewUser, syncTenantsBatch } from '@/lib/authStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const list = getAllTenants();
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a batch sync from client
    if (body.action === 'sync' && Array.isArray(body.tenants)) {
      const syncedList = syncTenantsBatch(body.tenants);
      return NextResponse.json({ success: true, tenants: syncedList });
    }

    const username = body.name || body.owner || `cliente_${Date.now().toString().slice(-4)}`;
    const email = body.email || `${username.toLowerCase().replace(/\s+/g, '_')}@empresa.com`;
    const password = body.password || 'ClienteSeguro2026#';
    const plan = body.plan || 'Plan Básico (<200 SKUs)';
    const maxSkus = body.maxSkus || 200;
    const commission_rate = body.commission_rate || '25%';
    const channels = body.channels || ['Shopify', 'Mercado Libre'];

    const newUser = registerNewUser(username, password, email, 'empresa-a', plan, maxSkus, commission_rate, channels);
    const newTenant = {
      id: `TNT-${newUser.id.toString().padStart(3, '0')}`,
      name: newUser.username,
      owner: body.owner || newUser.username,
      email: newUser.email,
      plan: newUser.plan || plan,
      maxSkus: newUser.maxSkus || maxSkus,
      activeSkus: 0,
      channels: newUser.channels || channels,
      status: (newUser.is_active ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED',
      commission_rate: newUser.commission_rate || commission_rate,
      created_at: newUser.created_at,
      last_sync: 'En Línea'
    };

    return NextResponse.json({ success: true, tenant: newTenant, all: getAllTenants() });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error al crear perfil de cliente' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body.id || body.username || body.name;
    if (id) {
      const updated = updateTenantDetails(id, body);
      if (updated) {
        return NextResponse.json({ success: true, message: 'Perfil de cliente actualizado con éxito', all: getAllTenants() });
      }
    }
    return NextResponse.json({ detail: 'Cliente no encontrado' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      const deleted = deleteTenant(id);
      if (deleted) {
        return NextResponse.json({ success: true, message: 'Perfil de cliente eliminado' });
      }
    }
    return NextResponse.json({ detail: 'Cliente no encontrado' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ detail: 'Error al eliminar cliente' }, { status: 500 });
  }
}


