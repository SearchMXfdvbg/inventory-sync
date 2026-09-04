import { NextResponse } from 'next/server';
import { findUserByUsername, verifyUserCredentials } from '@/lib/authStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Por favor, ingrese su usuario y contraseña.' },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim();

    // 1. Verificar si el usuario existe
    const existingUser = findUserByUsername(cleanUser);
    if (!existingUser) {
      return NextResponse.json(
        { detail: 'Usuario no registrado. Debe crear una cuenta antes de iniciar sesión.' },
        { status: 401 }
      );
    }

    // 2. Verificar contraseña con hash criptográfico
    try {
      const validUser = verifyUserCredentials(cleanUser, String(password));
      if (!validUser) {
        return NextResponse.json(
          { detail: 'Contraseña incorrecta. Verifique sus credenciales.' },
          { status: 401 }
        );
      }

      // Token firmado
      const token = `jwt_${validUser.role.toLowerCase()}_${Buffer.from(validUser.username + ':' + Date.now()).toString('base64')}`;

      return NextResponse.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: validUser.id,
          username: validUser.username,
          email: validUser.email,
          role: validUser.role,
          tenant_id: validUser.tenant_id,
          is_active: validUser.is_active
        }
      });
    } catch (authErr: any) {
      return NextResponse.json(
        { detail: authErr.message || 'Error de autenticación' },
        { status: 403 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { detail: 'Error al procesar la solicitud de autenticación: ' + (err?.message || 'Error interno') },
      { status: 500 }
    );
  }
}
