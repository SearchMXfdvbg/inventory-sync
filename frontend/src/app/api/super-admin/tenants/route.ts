import { NextResponse } from 'next/server';
import { getAllTenants, updateTenantStatus, deleteTenant, registerNewUser } from '@/lib/authStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const list = getAllTenants();
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = body.name || body.owner || `cliente_${Date.now().toString().slice(-4)}`;
    const email = body.email || `${username.toLowerCase().replace(/\s+/g, '_')}@empresa.com`;
    const password = body.password || 'ClienteSeguro2026#';

    const newUser = registerNewUser(username, password, email, 'empresa-a');
    const newTenant = {
      id: `TNT-${newUser.id.toString().padStart(3, '0')}`,
      name: newUser.username,
      owner: body.owner || newUser.username,
      email: newUser.email,
      plan: body.plan || 'Plan Básico (<200 SKUs)',
      maxSkus: body.maxSkus || 200,
      activeSkus: 0,
      channels: body.channels || ['Shopify', 'Mercado Libre'],
      status: 'ACTIVE' as const,
      commission_rate: body.commission_rate || '25%',
      created_at: newUser.created_at,
      last_sync: 'En Línea'
    };

    return NextResponse.json({ success: true, tenant: newTenant });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Error al crear perfil de cliente' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    if (id && status) {
      const updated = updateTenantStatus(id, status);
      if (updated) {
        return NextResponse.json({ success: true, message: `Estado actualizado a ${status}` });
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

