import json
import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

def validate_sae_path(path_str: str) -> str:
    """
    Valida que una ruta para SAE_DATA_PATH esté restringida a un subdirectorio
    permitido dentro del proyecto ('data/' o subdirectorios internos) y no contenga '..'
    ni apunte a rutas del sistema operativo (Windows/System32, /etc, etc.).
    """
    if not path_str or not isinstance(path_str, str):
        raise ValueError("SAE_DATA_PATH no puede estar vacío.")
    
    # 1. Prevenir Path Traversal explícito
    if ".." in path_str:
        raise ValueError("Path Traversal detectado: no se permite '..' en SAE_DATA_PATH.")
        
    # 2. Denegar rutas críticas del sistema
    normalized = path_str.replace("\\", "/").lower()
    system_patterns = ["windows", "system32", "etc/passwd", "etc/shadow", "/etc", "/proc", "/sys", "/dev", "/root", "/var"]
    for pattern in system_patterns:
        if pattern in normalized:
            raise ValueError(f"Ruta denegada: apunta a directorio crítico del sistema ({pattern}).")
            
    # 3. Validar resolución estricta dentro del directorio del proyecto o data/
    target_path = Path(path_str)
    if target_path.is_absolute():
        resolved = target_path.resolve()
    else:
        resolved = (BASE_DIR / target_path).resolve()
        
    try:
        resolved.relative_to(BASE_DIR)
    except ValueError:
        raise ValueError("SAE_DATA_PATH debe estar ubicado dentro del directorio del proyecto o subdirectorio 'data/'.")
        
    return path_str

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ADMIN_API_KEY: str = "admin-secret-token"

    # Autenticación JWT y credenciales administrativas (Vulnerabilidades #1 y #2)
    SECRET_KEY: str = "inventory-sync-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "AdminSecure2026!"

    DATABASE_URL: str = "sqlite:///./data/database.db"
    SAE_DATA_PATH: str = "data/productos.json"
    SAE_REPOSITORY_TYPE: str = "mock"
    SHOP_DOMAIN: str = "your-shop.myshopify.com"
    SHOPIFY_ACCESS_TOKEN: str = "shpat_xxxx"
    SHOPIFY_API_VERSION: str = "2026-07"
    SHOPIFY_LOCATION_ID: str = "gid://shopify/Location/12345"
    SHOPIFY_API_SECRET: str = "shpss_xxxx"
    ML_ACCESS_TOKEN: str = "APP_USR-xxxx"
    ML_USER_ID: int = 123456789
    ML_SITE_ID: str = "MLM"
    ML_WEBHOOK_SECRET: str = ""

    # Servicio de correos de verificación (Opción 2 - Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "InventorySync <onboarding@resend.dev>"

    # --- INVENTARIO PRINCIPAL Y CANALES ACTIVOS ---
    # Opciones de inventario principal: 'shopify', 'sae', 'mercadolibre'
    INVENTARIO_PRINCIPAL: str = "shopify"
    ENABLE_SAE: bool = True
    ENABLE_SHOPIFY: bool = True
    ENABLE_MERCADOLIBRE: bool = True
    ENABLE_TIKTOK: bool = True
    ENABLE_AMAZON: bool = True
    ENABLE_EBAY: bool = True
    ENABLE_KAUFLAND: bool = True

    # --- TIKTOK SHOP OPEN API ---
    TIKTOK_APP_KEY: str = ""
    TIKTOK_APP_SECRET: str = ""
    TIKTOK_ACCESS_TOKEN: str = ""
    TIKTOK_SHOP_ID: str = ""
    TIKTOK_SHOP_CIPHER: str = ""
    TIKTOK_WEBHOOK_SECRET: str = ""

    # --- AMAZON SELLING PARTNER API (SP-API) ---
    AMAZON_SELLER_ID: str = ""
    AMAZON_CLIENT_ID: str = ""
    AMAZON_CLIENT_SECRET: str = ""
    AMAZON_REFRESH_TOKEN: str = ""
    AMAZON_MARKETPLACE_ID: str = "A1AM78C64UM0Y8"  # México / Europa (Alemania: A1PA6795UKMFR9)

    # --- EBAY SELLER INVENTORY API (ALEMANIA / EUROPA) ---
    EBAY_CLIENT_ID: str = ""
    EBAY_CLIENT_SECRET: str = ""
    EBAY_REFRESH_TOKEN: str = ""
    EBAY_MARKETPLACE_ID: str = "EBAY_DE"  # Alemania por defecto

    # --- KAUFLAND GLOBAL MARKETPLACE SELLER API (ALEMANIA) ---
    KAUFLAND_CLIENT_KEY: str = ""
    KAUFLAND_SECRET_KEY: str = ""
    KAUFLAND_STOREFRONT: str = "de"  # de, pl, cz, sk, at



    @field_validator("SAE_DATA_PATH")
    @classmethod
    def validate_sae_data_path_config(cls, v: str) -> str:
        return validate_sae_path(v)

    # BaseSettings will attempt to load environment variables from a .env file if it exists.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def reload_settings():
    settings_path = "data/settings.json"
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            for key, val in data.items():
                # Vulnerabilidad #7: Prohibir modificar DATABASE_URL y configuraciones críticas dinámicamente
                if key in ("DATABASE_URL", "ENVIRONMENT", "DEBUG", "ADMIN_API_KEY", "ADMIN_PASSWORD"):
                    continue
                # Vulnerabilidad #6: Validar SAE_DATA_PATH
                if key == "SAE_DATA_PATH":
                    try:
                        val = validate_sae_path(val)
                    except Exception as err:
                        print(f"Ignorando ruta insegura para SAE_DATA_PATH en settings.json: {err}")
                        continue

                if hasattr(settings, key):
                    # Get the target type from Settings annotations
                    target_type = Settings.__annotations__.get(key, str)
                    
                    # Convert types dynamically
                    if target_type == int:
                        try:
                            val = int(val)
                        except (ValueError, TypeError):
                            pass
                    elif target_type == bool:
                        if isinstance(val, str):
                            val = val.lower() in ("true", "1", "yes")
                        else:
                            val = bool(val)
                    elif target_type == str:
                        val = str(val)
                    
                    setattr(settings, key, val)
        except Exception as e:
            print(f"Error reloading settings from {settings_path}: {e}")

# Llama a reload_settings() al final de config.py
reload_settings()

