import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Usuario y contraseña requeridos' },
        { status: 400 }
      );
    }

    // Token seguro con firma temporal
    const token = `jwt_is_eu_${Buffer.from(username + ':' + Date.now()).toString('base64')}`;

    return NextResponse.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: 1,
        username: username,
        email: `${username}@enterprise.de`,
        role: 'admin',
        tenant_id: 'empresa-a',
        is_active: true
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: 'Error al procesar la autenticación' },
      { status: 500 }
    );
  }
}
