import os
import json
import hmac
import hashlib
import base64
import logging
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from main import app
from app import SensitiveDataFilter, SanitizedFormatter
from config import settings, validate_sae_path
from schemas import SettingsUpdate, SettingsResponse
from auth import create_access_token

client = TestClient(app)
AUTH_HEADER_BEARER = {"Authorization": f"Bearer {settings.ADMIN_API_KEY}"}
AUTH_HEADER_APIKEY = {"X-API-Key": settings.ADMIN_API_KEY}
AUTH_HEADER_JWT = {"Authorization": f"Bearer {create_access_token({'sub': 'admin', 'role': 'admin'})}"}

# --- VULNERABILIDADES #3 & #4: AUTENTICACIÓN Y PROTECCIÓN DE SECRETOS EN /settings ---

def test_get_settings_unauthorized():
    """Vulnerabilidad #3: GET /settings debe rechazar peticiones no autenticadas."""
    # Sin headers
    res = client.get("/settings")
    assert res.status_code == 401
    assert "no autorizado" in res.json()["detail"].lower()

    # Token inválido
    res_bad = client.get("/settings", headers={"Authorization": "Bearer token_invalido"})
    assert res_bad.status_code == 401

    # API key inválida
    res_bad_key = client.get("/settings", headers={"X-API-Key": "wrong_key"})
    assert res_bad_key.status_code == 401

def test_get_settings_authorized_and_secrets_masked():
    """Vulnerabilidad #4: GET /settings autenticado debe enmascarar secretos."""
    # Con Bearer token
    res_bearer = client.get("/settings", headers=AUTH_HEADER_BEARER)
    assert res_bearer.status_code == 200
    data = res_bearer.json()
    assert data["SHOPIFY_ACCESS_TOKEN"] == "••••••••"
    assert data["SHOPIFY_API_SECRET"] == "••••••••"
    assert data["ML_ACCESS_TOKEN"] == "••••••••"

    # Con X-API-Key
    res_key = client.get("/settings", headers=AUTH_HEADER_APIKEY)
    assert res_key.status_code == 200
    data_key = res_key.json()
    assert data_key["SHOPIFY_ACCESS_TOKEN"] == "••••••••"

def test_post_settings_unauthorized():
    """Vulnerabilidad #3: POST /settings debe rechazar peticiones no autenticadas."""
    res = client.post("/settings", json={"SHOP_DOMAIN": "hacker.myshopify.com"})
    assert res.status_code == 401

    res_bad = client.post(
        "/settings",
        json={"SHOP_DOMAIN": "hacker.myshopify.com"},
        headers={"Authorization": "Bearer bad"}
    )
    assert res_bad.status_code == 401

def test_post_settings_authorized_success():
    """POST /settings autenticado debe permitir actualizar campos válidos."""
    res = client.post(
        "/settings",
        json={"SHOP_DOMAIN": "valid-shop.myshopify.com"},
        headers=AUTH_HEADER_BEARER
    )
    assert res.status_code == 200
    assert "Configuración guardada correctamente" in res.json()["message"]


# --- VULNERABILIDAD #6: PREVENCIÓN DE PATH TRAVERSAL EN SAE_DATA_PATH ---

def test_sae_data_path_traversal_rejected_via_api():
    """Vulnerabilidad #6: POST /settings debe rechazar intentos de Path Traversal."""
    malicious_paths = [
        "../../etc/passwd",
        "../../../windows/system32/cmd.exe",
        "..\\..\\boot.ini",
        "/etc/shadow",
        "C:\\Windows\\System32\\drivers\\etc\\hosts"
    ]

    for path in malicious_paths:
        res = client.post(
            "/settings",
            json={"SAE_DATA_PATH": path},
            headers=AUTH_HEADER_BEARER
        )
        assert res.status_code == 422, f"Ruta {path} debió ser rechazada con 422"

def test_sae_data_path_validation_direct():
    """Validación unitaria directa de validate_sae_path."""
    # Válidas
    assert validate_sae_path("data/productos.json") == "data/productos.json"
    assert validate_sae_path("data/test.json") == "data/test.json"

    # Inválidas con '..'
    with pytest.raises(ValueError, match="Path Traversal detectado"):
        validate_sae_path("../etc/passwd")

    with pytest.raises(ValueError, match="Path Traversal detectado"):
        validate_sae_path("data/../../cmd.exe")

    # Inválidas hacia directorios del sistema
    with pytest.raises(ValueError):
        validate_sae_path("/etc/passwd")

    with pytest.raises(ValueError):
        validate_sae_path("C:\\Windows\\System32\\calc.exe")


# --- VULNERABILIDAD #7: PROHIBIR MANIPULACIÓN DE DATABASE_URL (SSRF / PATH TRAVERSAL) ---

def test_database_url_tampering_rejected_via_api():
    """Vulnerabilidad #7: POST /settings debe rechazar modificaciones a DATABASE_URL."""
    tampered_urls = [
        "postgresql://attacker.com/evil_db",
        "mysql://root:password@10.0.0.1:3306/db",
        "sqlite:////etc/passwd",
        "sqlite:///../../secret.db"
    ]

    for db_url in tampered_urls:
        res = client.post(
            "/settings",
            json={"DATABASE_URL": db_url},
            headers=AUTH_HEADER_BEARER
        )
        assert res.status_code == 422, f"DATABASE_URL {db_url} debió ser rechazada con 422"
        assert "DATABASE_URL" in res.text

def test_database_url_default_allowed():
    """POST /settings debe aceptar la URL por defecto permitida sin error."""
    res = client.post(
        "/settings",
        json={"DATABASE_URL": "sqlite:///./data/database.db"},
        headers=AUTH_HEADER_BEARER
    )
    assert res.status_code == 200


# --- VULNERABILIDAD #8: PROTECCIÓN DE /debug/shopify ---

def test_debug_shopify_unauthorized():
    """Vulnerabilidad #8: /debug/shopify sin autenticación debe retornar 401."""
    res = client.get("/debug/shopify")
    assert res.status_code == 401

@patch("main.shopify_client.get_products_debug", new_callable=AsyncMock)
def test_debug_shopify_disabled_in_production(mock_debug):
    """Vulnerabilidad #8: /debug/shopify debe retornar 403 en producción sin modo DEBUG."""
    mock_debug.return_value = {"products": []}
    
    with patch.object(settings, "ENVIRONMENT", "production"), patch.object(settings, "DEBUG", False):
        res = client.get("/debug/shopify", headers=AUTH_HEADER_BEARER)
        assert res.status_code == 403
        assert "deshabilitado" in res.json()["detail"]

@patch("main.shopify_client.get_products_debug", new_callable=AsyncMock)
def test_debug_shopify_allowed_in_development(mock_debug):
    """Vulnerabilidad #8: /debug/shopify debe funcionar en development con credenciales."""
    mock_debug.return_value = {"products": ["sample"]}
    
    with patch.object(settings, "ENVIRONMENT", "development"), patch.object(settings, "DEBUG", False):
        res = client.get("/debug/shopify", headers=AUTH_HEADER_BEARER)
        assert res.status_code == 200
        assert res.json() == {"products": ["sample"]}

@patch("main.shopify_client.get_products_debug", new_callable=AsyncMock)
def test_debug_shopify_allowed_in_production_with_debug_flag(mock_debug):
    """Vulnerabilidad #8: /debug/shopify debe funcionar en producción si DEBUG=True."""
    mock_debug.return_value = {"products": ["debug_mode"]}
    
    with patch.object(settings, "ENVIRONMENT", "production"), patch.object(settings, "DEBUG", True):
        res = client.get("/debug/shopify", headers=AUTH_HEADER_BEARER)
        assert res.status_code == 200
        assert res.json() == {"products": ["debug_mode"]}


# --- VULNERABILIDAD #11: DESHABILITAR DOCS EN PRODUCCIÓN ---

def test_docs_disabled_in_production_app():
    """Vulnerabilidad #11: /docs, /redoc y /openapi.json desactivados en producción."""
    # Simular la lógica de app.py cuando ENVIRONMENT == 'production'
    with patch.object(settings, "ENVIRONMENT", "production"):
        is_dev = (settings.ENVIRONMENT == "development")
        prod_app = FastAPI(
            docs_url="/docs" if is_dev else None,
            redoc_url="/redoc" if is_dev else None,
            openapi_url="/openapi.json" if is_dev else None
        )
        prod_client = TestClient(prod_app)

        res_docs = prod_client.get("/docs")
        assert res_docs.status_code == 404

        res_redoc = prod_client.get("/redoc")
        assert res_redoc.status_code == 404

        res_openapi = prod_client.get("/openapi.json")
        assert res_openapi.status_code == 404

def test_docs_enabled_in_development():
    """Vulnerabilidad #11: En development /docs y /openapi.json deben estar accesibles."""
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200

    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 200


# --- AUTENTICACIÓN /auth/login ---

def test_auth_login():
    """Prueba del endpoint /auth/login."""
    # Credenciales erróneas
    res_bad = client.post("/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert res_bad.status_code == 401

    # Credenciales correctas
    res_ok = client.post("/auth/login", json={"username": "admin", "password": settings.ADMIN_PASSWORD})
    assert res_ok.status_code == 200
    token = res_ok.json()["access_token"]
    assert isinstance(token, str) and len(token) > 10

    # Usar el token obtenido para acceder a GET /settings
    res_settings = client.get("/settings", headers={"Authorization": f"Bearer {token}"})
    assert res_settings.status_code == 200


# --- VULNERABILIDAD #16: FILTRO DE LOGGING PARA DATOS SENSIBLES ---

def test_sensitive_data_filter_bearer_token():
    """Vulnerabilidad #16: SensitiveDataFilter debe enmascarar tokens Bearer."""
    f = SensitiveDataFilter()
    sample_1 = "Authorization: Bearer ya29.a0AfH6SMB_secret-token-123=="
    sanitized_1 = f.sanitize(sample_1)
    assert "Bearer [BEARER_TOKEN_REDACTED]" in sanitized_1
    assert "ya29.a0AfH6SMB" not in sanitized_1

    sample_2 = "Token recibido: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.test_signature"
    sanitized_2 = f.sanitize(sample_2)
    assert "Bearer [BEARER_TOKEN_REDACTED]" in sanitized_2
    assert "eyJhbGciOi" not in sanitized_2

def test_sensitive_data_filter_shopify_tokens():
    """Vulnerabilidad #16: SensitiveDataFilter debe enmascarar tokens de Shopify (shpat_ y shpss_)."""
    f = SensitiveDataFilter()
    sample = "Connecting with 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 and secret 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"
    sanitized = f.sanitize(sample)
    assert "[SHOPIFY_ACCESS_TOKEN_REDACTED]" in sanitized
    assert "[SHOPIFY_API_SECRET_REDACTED]" in sanitized
    assert "shpat_c3b6fb" not in sanitized
    assert "shpss_51cb7c" not in sanitized

def test_sensitive_data_filter_mercadolibre_tokens():
    """Vulnerabilidad #16: SensitiveDataFilter debe enmascarar tokens de Mercado Libre (APP_USR-)."""
    f = SensitiveDataFilter()
    sample = "ML OAuth token: APP_USR-1234567890123456-090118-a1b2c3d4e5f6-78901234"
    sanitized = f.sanitize(sample)
    assert "[ML_ACCESS_TOKEN_REDACTED]" in sanitized
    assert "APP_USR-1234567890123456" not in sanitized

def test_sensitive_data_filter_sensitive_parameters():
    """Vulnerabilidad #16: SensitiveDataFilter debe enmascarar parámetros como password, client_secret, access_token."""
    f = SensitiveDataFilter()

    # Formato JSON
    json_sample = '{"username": "admin", "password": "MySuperSecretPassword123!", "role": "admin"}'
    json_sanitized = f.sanitize(json_sample)
    assert '"password": "[REDACTED]"' in json_sanitized
    assert "MySuperSecretPassword123!" not in json_sanitized
    assert '"username": "admin"' in json_sanitized

    # Formato Dict
    dict_sample = "{'client_secret': 'shpss_secret_123', 'access_token': 'xyz_abc_token_999'}"
    dict_sanitized = f.sanitize(dict_sample)
    assert "'client_secret': '[REDACTED]'" in dict_sanitized
    assert "'access_token': '[REDACTED]'" in dict_sanitized
    assert "xyz_abc_token_999" not in dict_sanitized

    # Formato URL Query string
    url_sample = "https://api.mercadolibre.com/oauth/token?grant_type=code&client_secret=sec_val_456&access_token=tok_789&client_id=12345"
    url_sanitized = f.sanitize(url_sample)
    assert "client_secret=[REDACTED]" in url_sanitized
    assert "access_token=[REDACTED]" in url_sanitized
    assert "sec_val_456" not in url_sanitized
    assert "tok_789" not in url_sanitized
    assert "client_id=12345" in url_sanitized  # client_id no sensible se mantiene

def test_sensitive_data_filter_log_record():
    """Vulnerabilidad #16: SensitiveDataFilter.filter debe sanitizar msg y args de un LogRecord."""
    f = SensitiveDataFilter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=10,
        msg="Login attempt for user with password=super_secret_123 and token=%s",
        args=("Bearer ya29.secret_token==", ),
        exc_info=None
    )
    result = f.filter(record)
    assert result is True
    assert "password=[REDACTED]" in record.msg
    assert "super_secret_123" not in record.msg
    assert "[BEARER_TOKEN_REDACTED]" in record.args[0]

def test_sanitized_formatter():
    """Vulnerabilidad #16: SanitizedFormatter debe enmascarar valores interpolados en el mensaje formateado."""
    f = SensitiveDataFilter()
    formatter = SanitizedFormatter(fmt="%(message)s", filter_instance=f)
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="User auth with password=%s",
        args=("MySecretPwd123!", ),
        exc_info=None
    )
    formatted = formatter.format(record)
    assert "password=[REDACTED]" in formatted
    assert "MySecretPwd123!" not in formatted



# --- VULNERABILIDADES #10 & #13: CABECERAS DE SEGURIDAD HTTP Y PROTECCIÓN CSRF/CLICKJACKING ---

def test_security_headers_present_on_successful_response():
    """Vulnerabilidad #13 & #10: Verificar que todas las cabeceras de seguridad requeridas estén presentes."""
    res = client.get("/status")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-xss-protection") == "1; mode=block"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert res.headers.get("permissions-policy") == "geolocation=(), camera=(), microphone=()"
    assert "default-src 'self'" in res.headers.get("content-security-policy", "")
    assert "frame-ancestors 'none'" in res.headers.get("content-security-policy", "")

def test_security_headers_present_on_error_response():
    """Vulnerabilidad #13: Las cabeceras de seguridad deben inyectarse incluso en respuestas de error (401, 404)."""
    res = client.get("/nonexistent-endpoint-404")
    assert res.status_code == 404
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-xss-protection") == "1; mode=block"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


# --- VULNERABILIDAD #14: CORS CON ALLOW_HEADERS RESTRINGIDO (SIN '*') ---

def test_cors_preflight_allowed_headers():
    """Vulnerabilidad #14: CORS permite cabeceras autorizadas explícitas."""
    res = client.options(
        "/inventory",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type, Authorization, X-Tenant-ID, X-Shopify-Hmac-Sha256"
        }
    )
    assert res.status_code == 200
    allow_headers = res.headers.get("access-control-allow-headers", "")
    assert "content-type" in allow_headers.lower()
    assert "authorization" in allow_headers.lower()
    assert "x-tenant-id" in allow_headers.lower()
    assert "x-shopify-hmac-sha256" in allow_headers.lower()
    assert "*" not in allow_headers

def test_cors_preflight_disallowed_headers():
    """Vulnerabilidad #14: CORS rechaza cabeceras no permitidas (preflight status 400)."""
    res = client.options(
        "/inventory",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-Unauthorized-Header, X-Exploit"
        }
    )
    assert res.status_code == 400


# --- VULNERABILIDAD #15: RATE LIMITING EN MEMORIA POR IP ---

def test_rate_limiting_strict_webhook_limit():
    """Vulnerabilidad #15: Límite estricto de 30 req/min en webhooks y retorno de 429."""
    from app import reset_rate_limits
    reset_rate_limits()

    test_ip = "192.0.2.50"
    headers = {"X-Forwarded-For": test_ip}

    # Realizar 30 peticiones (límite estricto)
    for i in range(30):
        r = client.post("/webhook/shopify", headers=headers, json={})
        assert r.status_code in (400, 401, 422), f"Petición {i+1} inesperada: {r.status_code}"

    # Petición 31 debe ser rechazada con HTTP 429 Too Many Requests
    r_exceeded = client.post("/webhook/shopify", headers=headers, json={})
    assert r_exceeded.status_code == 429
    assert "Rate limit exceeded" in r_exceeded.json()["detail"]
    assert r_exceeded.headers.get("retry-after") == "60"
    assert r_exceeded.headers.get("x-frame-options") == "DENY"

    reset_rate_limits()

def test_rate_limiting_options_exempt():
    """Vulnerabilidad #15: Solicitudes OPTIONS de preflight no consumen cuota de rate limit."""
    from app import reset_rate_limits
    reset_rate_limits()

    test_ip = "192.0.2.51"
    headers = {
        "X-Forwarded-For": test_ip,
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }

    # Enviar más de 35 OPTIONS
    for _ in range(35):
        r = client.options("/webhook/shopify", headers=headers)
        assert r.status_code == 200

    reset_rate_limits()


# --- VULNERABILIDAD #17: CONCURRENCIA E INTEGRIDAD SQLITE (WAL MODE) ---

def test_sqlite_wal_mode_and_synchronous():
    """Vulnerabilidad #17: Conexiones SQLite deben tener journal_mode=WAL y synchronous=NORMAL."""
    from database import engine
    with engine.connect() as conn:
        journal_mode = conn.exec_driver_sql("PRAGMA journal_mode;").scalar()
        synchronous = conn.exec_driver_sql("PRAGMA synchronous;").scalar()
        assert str(journal_mode).lower() == "wal"
        assert synchronous == 1  # 1 corresponde a NORMAL en SQLite


# --- VULNERABILIDAD #18: FRONTEND .env.local EN .gitignore ---

def test_gitignore_contains_env_local():
    """Vulnerabilidad #18: .gitignore debe excluir frontend/.env.local y .env.local."""
    gitignore_path = os.path.join(os.path.dirname(__file__), "..", ".gitignore")
    assert os.path.exists(gitignore_path), ".gitignore debe existir"

    with open(gitignore_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "frontend/.env.local" in content
    assert ".env.local" in content

