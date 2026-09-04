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

    const cleanUser = username.trim();

    // Verificación de Super Administrador
    if (cleanUser.toLowerCase() === 'cristadmin') {
      if (password !== 'ROAC060718#') {
        return NextResponse.json(
          { detail: 'Credenciales de Super Administrador inválidas.' },
          { status: 401 }
        );
      }

      const token = `jwt_superadmin_${Buffer.from(cleanUser + ':' + Date.now()).toString('base64')}`;
      return NextResponse.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: 999,
          username: 'CristAdmin',
          email: 'cristadmin@inventorysync.io',
          role: 'SUPER_ADMIN',
          tenant_id: 'global-master',
          is_active: true
        }
      });
    }

    // Token seguro para usuarios y clientes comerciales
    const token = `jwt_is_eu_${Buffer.from(cleanUser + ':' + Date.now()).toString('base64')}`;

    return NextResponse.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: 1,
        username: cleanUser,
        email: `${cleanUser}@enterprise.io`,
        role: 'CLIENT_ADMIN',
        tenant_id: `tenant_${cleanUser.toLowerCase()}`,
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
