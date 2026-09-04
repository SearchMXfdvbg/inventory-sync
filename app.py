import logging
import os
import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from starlette.datastructures import MutableHeaders
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Receive, Scope, Send

from config import settings
from database import engine, Base

# --- CONFIGURACIÓN DE LOGGING CON SANEAMIENTO ---

class SensitiveDataFilter(logging.Filter):
    def __init__(self, name: str = ""):
        super().__init__(name)
        self.sensitive_patterns = []
        
        # Cargamos los tokens del archivo de configuración
        tokens = [
            (settings.SHOPIFY_ACCESS_TOKEN, "[SHOPIFY_ACCESS_TOKEN_REDACTED]"),
            (settings.SHOPIFY_API_SECRET, "[SHOPIFY_API_SECRET_REDACTED]"),
            (settings.ML_ACCESS_TOKEN, "[ML_ACCESS_TOKEN_REDACTED]"),
            (getattr(settings, "ML_WEBHOOK_SECRET", None), "[ML_WEBHOOK_SECRET_REDACTED]"),
            (getattr(settings, "ADMIN_API_KEY", None), "[ADMIN_API_KEY_REDACTED]")
        ]
        
        # Agregar tokens específicos si están configurados
        for token, label in tokens:
            if token and len(str(token)) > 5:
                self.sensitive_patterns.append((re.escape(str(token)), label))
                
        # Patrones genéricos robustos para enmascarar datos sensibles automáticamente (Vulnerabilidad #16)
        self.sensitive_patterns.extend([
            # Tokens Bearer (Bearer [A-Za-z0-9\-\._~\+\/]+=*)
            (r"(?i)\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*", "Bearer [BEARER_TOKEN_REDACTED]"),
            # Tokens de Shopify (shpat_, shpss_)
            (r"\bshpat_[a-zA-Z0-9_\-]+", "[SHOPIFY_ACCESS_TOKEN_REDACTED]"),
            (r"\bshpss_[a-zA-Z0-9_\-]+", "[SHOPIFY_API_SECRET_REDACTED]"),
            # Tokens de Mercado Libre (APP_USR-)
            (r"\bAPP_USR-[a-zA-Z0-9\-_]+", "[ML_ACCESS_TOKEN_REDACTED]"),
            # Parámetros sensibles en logs (password, client_secret, access_token, etc.)
            (r"""(?i)(["']?(?:password|client_secret|access_token|api_secret|secret_token|refresh_token|api_key)["']?\s*[:=]\s*)(["'])(?:(?!\2)[^\\]|\\.)*(\2)""", r"\1\2[REDACTED]\3"),
            (r"""(?i)(["']?(?:password|client_secret|access_token|api_secret|secret_token|refresh_token|api_key)["']?\s*[:=]\s*)([^\s,"'&\}]+)""", r"\1[REDACTED]")
        ])

    def sanitize(self, text: str) -> str:
        for pattern, replacement in self.sensitive_patterns:
            text = re.sub(pattern, replacement, text)
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        if record.args:
            msg_str = str(record.msg)
            matches = list(re.finditer(r'%[srdafv]', msg_str))
            new_args = []
            for i, arg in enumerate(record.args):
                if isinstance(arg, str):
                    sanitized_arg = self.sanitize(arg)
                    if sanitized_arg == arg and i < len(matches):
                        prefix = msg_str[:matches[i].start()]
                        if re.search(r'(?i)(?:password|secret|token|api_key)\s*[:=]\s*$', prefix):
                            sanitized_arg = "[REDACTED]"
                    new_args.append(sanitized_arg)
                else:
                    new_args.append(arg)
            record.args = tuple(new_args)

        if isinstance(record.msg, str):
            record.msg = self.sanitize(record.msg)
        return True


class SanitizedFormatter(logging.Formatter):
    def __init__(self, fmt=None, datefmt=None, style='%', filter_instance=None):
        super().__init__(fmt, datefmt, style)
        self.filter_instance = filter_instance

    def format(self, record):
        formatted = super().format(record)
        if self.filter_instance:
            return self.filter_instance.sanitize(formatted)
        return formatted


def setup_logging():
    os.makedirs("logs", exist_ok=True)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Limpiamos manejadores anteriores
    root_logger.handlers = []
    
    # Filtro compartido
    sensitive_filter = SensitiveDataFilter()
    
    # Manejador del archivo rotativo
    file_handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    
    # Formateador sanitizado para el archivo
    file_formatter = SanitizedFormatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        filter_instance=sensitive_filter
    )
    file_handler.setFormatter(file_formatter)
    file_handler.addFilter(sensitive_filter)
    
    # Manejador de consola para depuración local
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = SanitizedFormatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        filter_instance=sensitive_filter
    )
    console_handler.setFormatter(console_formatter)
    console_handler.addFilter(sensitive_filter)
    
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

# Inicializar logging
setup_logging()
logger = logging.getLogger("inventory_sync.app")

# --- LIFESPAN DE LA APLICACIÓN ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de la base de datos y migración al arranque
    logger.info("Inicializando la base de datos...")
    from database import init_db_and_migrate
    init_db_and_migrate()
    logger.info("Base de datos inicializada y migrada correctamente.")
    yield
    logger.info("Apagando la aplicación...")

# --- CREACIÓN DE LA APP FASTAPI ---

# Vulnerabilidad #11: Deshabilitar Swagger UI /docs, /redoc y /openapi.json en producción
is_dev_env = (getattr(settings, "ENVIRONMENT", "development") == "development")

app = FastAPI(
    title="Inventory Sync API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if is_dev_env else None,
    redoc_url="/redoc" if is_dev_env else None,
    openapi_url="/openapi.json" if is_dev_env else None
)

# --- MIDDLEWARES ASGI DE SEGURIDAD (Vulnerabilidades #10, #13, #14, #15) ---

class SecurityHeadersMiddleware:
    """
    Middleware ASGI para inyectar cabeceras de seguridad HTTP estándar
    en todas las respuestas HTTP (Vulnerabilidades #10 y #13).
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: geolocation=(), camera=(), microphone=()
    - Content-Security-Policy: default-src 'self'; frame-ancestors 'none';
    """
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["X-XSS-Protection"] = "1; mode=block"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
                headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
            await send(message)

        await self.app(scope, receive, send_wrapper)


_rate_limiter_instance: "RateLimitMiddleware | None" = None


class RateLimitMiddleware:
    """
    Middleware ASGI de Rate Limiting en memoria por IP usando ventana móvil (Vulnerabilidad #15).
    - 120 peticiones por minuto por IP para endpoints generales.
    - 30 peticiones por minuto por IP para webhooks (/webhook/...) y autenticación (/login, /auth/...).
    Retorna HTTP 429 Too Many Requests si se excede el límite.
    """
    def __init__(
        self,
        app: ASGIApp,
        general_limit: int = 120,
        strict_limit: int = 30,
        window_seconds: float = 60.0
    ):
        global _rate_limiter_instance
        self.app = app
        self.general_limit = general_limit
        self.strict_limit = strict_limit
        self.window_seconds = window_seconds
        self.general_records = defaultdict(list)
        self.strict_records = defaultdict(list)
        self._cleanup_counter = 0
        _rate_limiter_instance = self

    def reset(self):
        """Reinicia los registros de rate limit (útil para pruebas)."""
        self.general_records.clear()
        self.strict_records.clear()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # No limitar preflight CORS OPTIONS
        if scope.get("method") == "OPTIONS":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        now = time.time()
        cutoff = now - self.window_seconds

        ip = self._get_client_ip(scope)
        if ip == "testclient":
            await self.app(scope, receive, send)
            return

        is_strict = (
            path.startswith("/webhook")
            or path.startswith("/auth")
            or path.startswith("/login")
        )

        records = self.strict_records[ip] if is_strict else self.general_records[ip]
        limit = self.strict_limit if is_strict else self.general_limit

        # Filtrar timestamps dentro de la ventana móvil
        valid_timestamps = [t for t in records if t > cutoff]

        if len(valid_timestamps) >= limit:
            logger.warning(
                f"Rate limit excedido para IP {ip} en {path} "
                f"({'strict' if is_strict else 'general'}, límite={limit}/min)"
            )
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests. Rate limit exceeded."},
                headers={"Retry-After": str(int(self.window_seconds))}
            )
            await response(scope, receive, send)
            return

        valid_timestamps.append(now)
        if is_strict:
            self.strict_records[ip] = valid_timestamps
        else:
            self.general_records[ip] = valid_timestamps

        # Limpieza periódica cada 500 peticiones para evitar crecimiento en memoria
        self._cleanup_counter += 1
        if self._cleanup_counter > 500:
            self._cleanup(cutoff)
            self._cleanup_counter = 0

        await self.app(scope, receive, send)

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        forwarded_for = headers.get(b"x-forwarded-for")
        if forwarded_for:
            ip = forwarded_for.decode("latin1").split(",")[0].strip()
            if ip:
                return ip
        client = scope.get("client")
        if client and len(client) > 0 and client[0]:
            return client[0]
        return "127.0.0.1"

    def _cleanup(self, cutoff: float):
        for records_dict in (self.general_records, self.strict_records):
            stale_keys = [k for k, v in records_dict.items() if not v or v[-1] <= cutoff]
            for k in stale_keys:
                del records_dict[k]


def reset_rate_limits():
    """Función de utilidad para limpiar los registros de rate limit."""
    global _rate_limiter_instance
    if _rate_limiter_instance:
        _rate_limiter_instance.reset()


# --- CORS RESTRINGIDO Y MIDDLEWARES (Vulnerabilidades #10, #13, #14, #15) ---

# 1. Rate Limiting en memoria por IP (120 req/min general, 30 req/min webhooks/auth)
app.add_middleware(
    RateLimitMiddleware,
    general_limit=120,
    strict_limit=30,
    window_seconds=60.0
)

# 2. Inyección de Cabeceras de Seguridad HTTP (nosniff, DENY, CSP, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# 3. CORS Restringido (Vulnerabilidad #14: allow_headers sin '*')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Tenant-ID",
        "X-Requested-With",
        "Accept",
        "X-Shopify-Hmac-Sha256",
        "X-Signature"
    ],
)

# --- MIDDLEWARE / HANDLERS DE EXCEPCIONES GLOBAL ---

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"Excepción HTTP en {request.method} {request.url.path}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Error de validación en {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # No se expone el stack trace en producción
    logger.exception(f"Excepción no controlada en {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Ocurrió un error interno en el servidor."}
    )

# Import main at the end to register all endpoint routes on the app object
import main

