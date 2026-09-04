import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from config import validate_sae_path

# Base Venta Schema
class VentaBase(BaseModel):
    external_id: str = Field(..., description="ID externo de la venta en la plataforma de origen")
    origen: str = Field(..., description="Plataforma de origen de la venta (ej. shopify, mercadolibre)")
    sku: str = Field(..., description="SKU del producto vendido")
    cantidad: int = Field(..., description="Cantidad de productos vendidos", gt=0)

# Schema for creating a Venta via API
class VentaCreate(VentaBase):
    pass

# Schema for Venta updates (e.g., status or sync updates)
class VentaUpdate(BaseModel):
    status: Optional[str] = None
    sae_decremented: Optional[bool] = None
    shopify_synced: Optional[bool] = None
    ml_synced: Optional[bool] = None
    attempts: Optional[int] = None
    last_error: Optional[str] = None
    processed_at: Optional[datetime] = None

# Schema for queue response (/cola)
class VentaResponse(VentaBase):
    id: int
    status: str
    sae_decremented: bool
    shopify_synced: bool
    ml_synced: bool
    attempts: int
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Shopify webhook validation schemas
class ShopifyLineItem(BaseModel):
    id: Optional[int] = None
    sku: Optional[str] = None
    quantity: int
    title: Optional[str] = None
    price: Optional[str] = None

class ShopifyOrderWebhook(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    line_items: List[ShopifyLineItem]
    created_at: Optional[str] = None
    financial_status: Optional[str] = None

# Mercado Libre webhook validation schemas
class MercadoLibreWebhook(BaseModel):
    resource: str = Field(..., description="URI del recurso que cambió (ej. /orders/123456)")
    user_id: Optional[Any] = Field(None, description="ID del usuario vendedor")
    topic: str = Field(..., description="Tema de la notificación (ej. orders_v2, items)")
    application_id: Optional[int] = None
    attempts: Optional[int] = 0
    sent: Optional[str] = None
    received: Optional[str] = None

# Dynamic Settings schemas
class SettingsUpdate(BaseModel):
    DATABASE_URL: Optional[str] = None
    SAE_DATA_PATH: Optional[str] = None
    SAE_REPOSITORY_TYPE: Optional[str] = None
    SHOP_DOMAIN: Optional[str] = None
    SHOPIFY_ACCESS_TOKEN: Optional[str] = None
    SHOPIFY_API_VERSION: Optional[str] = None
    SHOPIFY_LOCATION_ID: Optional[str] = None
    SHOPIFY_API_SECRET: Optional[str] = None
    ML_ACCESS_TOKEN: Optional[str] = None
    ML_USER_ID: Optional[int] = None
    ML_SITE_ID: Optional[str] = None
    ML_WEBHOOK_SECRET: Optional[str] = None

    # Canales e Inventario Principal
    INVENTARIO_PRINCIPAL: Optional[str] = None
    ENABLE_SAE: Optional[bool] = None
    ENABLE_SHOPIFY: Optional[bool] = None
    ENABLE_MERCADOLIBRE: Optional[bool] = None
    ENABLE_TIKTOK: Optional[bool] = None
    ENABLE_AMAZON: Optional[bool] = None
    ENABLE_EBAY: Optional[bool] = None
    ENABLE_KAUFLAND: Optional[bool] = None

    # TikTok Shop
    TIKTOK_APP_KEY: Optional[str] = None
    TIKTOK_APP_SECRET: Optional[str] = None
    TIKTOK_ACCESS_TOKEN: Optional[str] = None
    TIKTOK_SHOP_ID: Optional[str] = None
    TIKTOK_SHOP_CIPHER: Optional[str] = None

    # Amazon SP-API
    AMAZON_SELLER_ID: Optional[str] = None
    AMAZON_CLIENT_ID: Optional[str] = None
    AMAZON_CLIENT_SECRET: Optional[str] = None
    AMAZON_REFRESH_TOKEN: Optional[str] = None
    AMAZON_MARKETPLACE_ID: Optional[str] = None

    # eBay Alemania / Europa
    EBAY_CLIENT_ID: Optional[str] = None
    EBAY_CLIENT_SECRET: Optional[str] = None
    EBAY_REFRESH_TOKEN: Optional[str] = None
    EBAY_MARKETPLACE_ID: Optional[str] = None

    # Kaufland Alemania
    KAUFLAND_CLIENT_KEY: Optional[str] = None
    KAUFLAND_SECRET_KEY: Optional[str] = None
    KAUFLAND_STOREFRONT: Optional[str] = None

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: Optional[str]) -> Optional[str]:
        # Vulnerabilidad #7: Prohibir alterar la conexión a la base de datos
        if v is not None and v != "sqlite:///./data/database.db":
            raise ValueError(
                "Modificar DATABASE_URL no está permitido para prevenir ataques SSRF y manipulación de archivos de base de datos."
            )
        return v

    @field_validator("SAE_DATA_PATH")
    @classmethod
    def validate_sae_data_path_update(cls, v: Optional[str]) -> Optional[str]:
        # Vulnerabilidad #6: Prevenir Path Traversal en SAE_DATA_PATH
        if v is not None:
            return validate_sae_path(v)
        return v

class SettingsResponse(BaseModel):
    DATABASE_URL: str
    SAE_DATA_PATH: str
    SAE_REPOSITORY_TYPE: str
    SHOP_DOMAIN: str
    SHOPIFY_ACCESS_TOKEN: str
    SHOPIFY_API_VERSION: str
    SHOPIFY_LOCATION_ID: str
    SHOPIFY_API_SECRET: str
    ML_ACCESS_TOKEN: str
    ML_USER_ID: int
    ML_SITE_ID: str
    ML_WEBHOOK_SECRET: str = ""

    # Canales e Inventario Principal
    INVENTARIO_PRINCIPAL: str = "shopify"
    ENABLE_SAE: bool = True
    ENABLE_SHOPIFY: bool = True
    ENABLE_MERCADOLIBRE: bool = True
    ENABLE_TIKTOK: bool = True
    ENABLE_AMAZON: bool = True
    ENABLE_EBAY: bool = True
    ENABLE_KAUFLAND: bool = True

    # TikTok Shop
    TIKTOK_APP_KEY: str = ""
    TIKTOK_APP_SECRET: str = ""
    TIKTOK_ACCESS_TOKEN: str = ""
    TIKTOK_SHOP_ID: str = ""
    TIKTOK_SHOP_CIPHER: str = ""

    # Amazon SP-API
    AMAZON_SELLER_ID: str = ""
    AMAZON_CLIENT_ID: str = ""
    AMAZON_CLIENT_SECRET: str = ""
    AMAZON_REFRESH_TOKEN: str = ""
    AMAZON_MARKETPLACE_ID: str = "A1AM78C64UM0Y8"

    # eBay Alemania / Europa
    EBAY_CLIENT_ID: str = ""
    EBAY_CLIENT_SECRET: str = ""
    EBAY_REFRESH_TOKEN: str = ""
    EBAY_MARKETPLACE_ID: str = "EBAY_DE"

    # Kaufland Alemania
    KAUFLAND_CLIENT_KEY: str = ""
    KAUFLAND_SECRET_KEY: str = ""
    KAUFLAND_STOREFRONT: str = "de"

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        "SHOPIFY_ACCESS_TOKEN", 
        "SHOPIFY_API_SECRET", 
        "ML_ACCESS_TOKEN", 
        "ML_WEBHOOK_SECRET",
        "TIKTOK_APP_SECRET",
        "TIKTOK_ACCESS_TOKEN",
        "AMAZON_CLIENT_SECRET",
        "AMAZON_REFRESH_TOKEN",
        "EBAY_CLIENT_SECRET",
        "EBAY_REFRESH_TOKEN",
        "KAUFLAND_SECRET_KEY",
        mode="before"
    )
    @classmethod
    def mask_sensitive(cls, v):
        if v:
            return "••••••••"
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def mask_database_url(cls, v: str) -> str:
        if v and "@" in v:
            return re.sub(r"://([^:]+):([^@]+)@", r"://\1:••••••••@", v)
        return v


class CatalogProductItem(BaseModel):
    id: str
    title: str
    vendor: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    variants: List[Dict[str, Any]] = Field(default_factory=list)
    weight: Optional[float] = None
    weight_unit: Optional[str] = "g"
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    warranty: Optional[str] = None
    target_audience: Optional[str] = None
    tiktok_ready: bool = False


class BulkCatalogUpdateRequest(BaseModel):
    product_ids: List[str] = Field(..., description="Lista de IDs de productos en Shopify")
    variant_ids: Optional[List[str]] = Field(default=None, description="Lista opcional de IDs de variantes específicas")
    brand: Optional[str] = Field(default=None, description="Marca o fabricante")
    weight: Optional[float] = Field(default=None, description="Peso del paquete")
    weight_unit: Optional[str] = Field(default="GRAMS", description="Unidad de peso")
    length: Optional[float] = Field(default=None, description="Largo del empaque en cm")
    width: Optional[float] = Field(default=None, description="Ancho del empaque en cm")
    height: Optional[float] = Field(default=None, description="Alto del empaque en cm")
    warranty_type: Optional[str] = Field(default=None, description="Tipo de garantía")
    warranty_period: Optional[str] = Field(default=None, description="Periodo de garantía")
    target_audience: Optional[str] = Field(default=None, description="Audiencia / Edades recomendadas")


class BulkCatalogUpdateResponse(BaseModel):
    success: bool
    updated_count: int
    message: str
    details: List[Dict[str, Any]] = Field(default_factory=list)


class LoginRequest(BaseModel):
    username: str = Field(..., description="Nombre de usuario")
    password: str = Field(..., description="Contraseña")


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="Token JWT de acceso")
    token_type: str = Field(default="bearer", description="Tipo de token Bearer")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario")
    password: str = Field(..., min_length=6, description="Contraseña")
    email: str = Field(..., min_length=5, max_length=255, description="Correo electrónico obligatorio")
    tenant_id: Optional[str] = Field(default="empresa-a", description="Identificador del tenant o empresa")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None
    role: str
    tenant_id: str
    is_active: bool
    email_verified: bool = False


class RegisterResponse(BaseModel):
    message: str
    verification_required: bool = True
    email: str
    dev_code: Optional[str] = None
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class VerifyCodeRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico registrado")
    code: str = Field(..., min_length=6, max_length=6, description="Código de 6 dígitos")


class ResendCodeRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico registrado")


class VerifyCodeResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ImportInventoryResponse(BaseModel):
    success: bool
    total_rows: int
    created_count: int
    updated_count: int
    message: str
    errors: List[str] = Field(default_factory=list)






