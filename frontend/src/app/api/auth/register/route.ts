import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, tenant_id = 'empresa-a' } = body;

    if (!username || !password || !email) {
      return NextResponse.json(
        { detail: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    const token = `jwt_is_eu_${Buffer.from(username + ':' + Date.now()).toString('base64')}`;

    return NextResponse.json({
      message: 'Cuenta empresarial creada exitosamente',
      verification_required: false,
      email,
      access_token: token,
      token_type: 'bearer',
      user: {
        id: 1,
        username,
        email,
        role: 'admin',
        tenant_id,
        is_active: true,
        email_verified: true
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: 'Error al procesar registro' },
      { status: 500 }
    );
  }
}
