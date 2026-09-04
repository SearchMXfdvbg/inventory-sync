import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

import httpx
from config import settings

logger = logging.getLogger("inventory_sync.email")

def generate_verification_code() -> str:
    """Genera un código numérico aleatorio de 6 dígitos."""
    return f"{secrets.randbelow(900000) + 100000}"


def build_verification_email_html(code: str, username: str = "") -> str:
    """Construye una plantilla HTML moderna con el branding corporativo de InventorySync."""
    name_display = f", <strong>{username}</strong>" if username else ""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Código de Verificación - InventorySync</title>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 30px 15px;
          color: #1e293b;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
        .header {{
          background-color: #2563eb;
          padding: 28px 24px;
          text-align: center;
        }}
        .logo-box {{
          display: inline-block;
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 800;
          font-size: 20px;
          width: 44px;
          height: 44px;
          line-height: 44px;
          border-radius: 10px;
          margin-bottom: 8px;
        }}
        .header h1 {{
          color: #ffffff;
          font-size: 20px;
          margin: 0;
          font-weight: 700;
        }}
        .content {{
          padding: 32px 28px;
          text-align: center;
        }}
        .content p {{
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }}
        .code-box {{
          background-color: #eff6ff;
          border: 2px dashed #3b82f6;
          border-radius: 12px;
          padding: 18px 24px;
          margin: 24px 0;
          display: inline-block;
        }}
        .code {{
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #1d4ed8;
          font-family: 'Courier New', monospace;
        }}
        .expiry {{
          font-size: 13px;
          color: #64748b;
          margin-top: 8px;
        }}
        .footer {{
          border-top: 1px solid #f1f5f9;
          padding: 20px 28px;
          background-color: #f8fafc;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-box">IS</div>
          <h1>InventorySync</h1>
        </div>
        <div class="content">
          <h2>Verifica tu correo electrónico</h2>
          <p>Hola{name_display}. Gracias por registrarte en InventorySync. Usa el siguiente código de seguridad de 6 dígitos para verificar tu cuenta:</p>
          
          <div class="code-box">
            <div class="code">{code}</div>
          </div>
          
          <p class="expiry">⏱️ Este código expira en <strong>10 minutos</strong>.</p>
          <p style="font-size: 13px; color: #94a3b8;">Si no solicitaste este registro, puedes ignorar este mensaje de forma segura.</p>
        </div>
        <div class="footer">
          &copy; 2026 InventorySync. Sincronización multicanal de inventario en tiempo real.
        </div>
      </div>
    </body>
    </html>
    """


def send_verification_email(email: str, code: str, username: str = "") -> Dict[str, Any]:
    """
    Envía el correo con el código de 6 dígitos.
    - Si RESEND_API_KEY está configurado: envía mediante la API de Resend (Opción 2).
    - Si no está configurado (modo dev/test): simula el envío y loguea el código para pruebas inmediatas.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "").strip()
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "InventorySync <onboarding@resend.dev>")
    subject = f"Tu código de verificación de InventorySync: {code}"
    html_content = build_verification_email_html(code, username)

    if api_key:
        try:
            logger.info(f"Enviando correo de verificación a {email} vía Resend...")
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_email,
                    "to": [email],
                    "subject": subject,
                    "html": html_content
                },
                timeout=10.0
            )
            if response.status_code in (200, 201):
                logger.info(f"Correo de verificación enviado exitosamente a {email} por Resend.")
                return {"success": True, "provider": "resend", "status_code": response.status_code}
            else:
                logger.error(f"Error de Resend al enviar correo a {email}: {response.status_code} - {response.text}")
                # Fallback no bloqueante para no interrumpir el registro si la clave es inválida
                return {"success": False, "provider": "resend", "error": response.text}
        except Exception as e:
            logger.error(f"Excepción al conectar con Resend: {e}")
            return {"success": False, "provider": "resend", "error": str(e)}

    # Modo simulación / desarrollo
    logger.info(f"📧 [VERIFICACIÓN POR CORREO SIMULADA - Opción 2]")
    logger.info(f"   Destinatario: {email}")
    logger.info(f"   Código de 6 dígitos: {code}")
    logger.info(f"   (Para envíos reales a buzones de correo, configure RESEND_API_KEY en .env)")
    return {"success": True, "provider": "simulated", "code": code}
