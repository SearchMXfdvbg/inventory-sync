import { NextResponse } from 'next/server';
import { registerNewUser } from '@/lib/authStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, tenant_id = 'empresa-a' } = body;

    if (!username || !password || !email) {
      return NextResponse.json(
        { detail: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { detail: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    try {
      const newUser = registerNewUser(username, password, email, tenant_id);
      const token = `jwt_${newUser.role.toLowerCase()}_${Buffer.from(newUser.username + ':' + Date.now()).toString('base64')}`;

      return NextResponse.json({
        message: 'Cuenta creada exitosamente',
        verification_required: false,
        email: newUser.email,
        access_token: token,
        token_type: 'bearer',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          tenant_id: newUser.tenant_id,
          is_active: newUser.is_active
        }
      });
    } catch (regErr: any) {
      return NextResponse.json(
        { detail: regErr.message || 'El usuario ya existe.' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { detail: 'Error al procesar el registro.' },
      { status: 500 }
    );
  }
}
