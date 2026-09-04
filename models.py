from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, UniqueConstraint, func
from database import Base

class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), nullable=False)
    origen = Column(String(50), nullable=False)  # e.g., 'shopify', 'mercadolibre'
    sku = Column(String(100), nullable=False)
    cantidad = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PROCESSED, FAILED
    sae_decremented = Column(Boolean, nullable=False, default=False)
    shopify_synced = Column(Boolean, nullable=False, default=False)
    ml_synced = Column(Boolean, nullable=False, default=False)
    tiktok_synced = Column(Boolean, nullable=False, default=False)
    amazon_synced = Column(Boolean, nullable=False, default=False)
    ebay_synced = Column(Boolean, nullable=False, default=False)
    kaufland_synced = Column(Boolean, nullable=False, default=False)
    user_id = Column(Integer, index=True, nullable=True, default=1)
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("origen", "external_id", name="uq_origen_external_id"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")  # 'admin', 'user'
    tenant_id = Column(String(100), nullable=False, default="empresa-a")
    is_active = Column(Boolean, nullable=False, default=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True, nullable=False)
    tenant_id = Column(String(100), index=True, nullable=False, default="default")

    inventario_principal = Column(String(50), nullable=False, default="shopify")
    enable_sae = Column(Boolean, nullable=False, default=False)
    enable_shopify = Column(Boolean, nullable=False, default=True)
    enable_mercadolibre = Column(Boolean, nullable=False, default=True)
    enable_tiktok = Column(Boolean, nullable=False, default=False)
    enable_amazon = Column(Boolean, nullable=False, default=False)
    enable_ebay = Column(Boolean, nullable=False, default=False)
    enable_kaufland = Column(Boolean, nullable=False, default=False)

    shop_domain = Column(String(255), nullable=False, default="")
    shopify_access_token = Column(String(255), nullable=False, default="")
    shopify_location_id = Column(String(255), nullable=False, default="")
    shopify_api_secret = Column(String(255), nullable=False, default="")
    shopify_api_version = Column(String(50), nullable=False, default="2026-07")

    ml_access_token = Column(String(255), nullable=False, default="")
    ml_user_id = Column(Integer, nullable=False, default=0)
    ml_site_id = Column(String(50), nullable=False, default="MLM")
    ml_webhook_secret = Column(String(255), nullable=False, default="")

    tiktok_app_key = Column(String(255), nullable=False, default="")
    tiktok_app_secret = Column(String(255), nullable=False, default="")
    tiktok_access_token = Column(String(255), nullable=False, default="")
    tiktok_shop_id = Column(String(255), nullable=False, default="")
    tiktok_shop_cipher = Column(String(255), nullable=False, default="")

    amazon_seller_id = Column(String(255), nullable=False, default="")
    amazon_client_id = Column(String(255), nullable=False, default="")
    amazon_client_secret = Column(String(255), nullable=False, default="")
    amazon_refresh_token = Column(String(255), nullable=False, default="")
    amazon_marketplace_id = Column(String(50), nullable=False, default="A1AM78C64UM0Y8")

    ebay_client_id = Column(String(255), nullable=False, default="")
    ebay_client_secret = Column(String(255), nullable=False, default="")
    ebay_refresh_token = Column(String(255), nullable=False, default="")
    ebay_marketplace_id = Column(String(50), nullable=False, default="EBAY_DE")

    kaufland_client_key = Column(String(255), nullable=False, default="")
    kaufland_secret_key = Column(String(255), nullable=False, default="")
    kaufland_storefront = Column(String(50), nullable=False, default="de")

    sae_data_path = Column(String(255), nullable=False, default="data/productos.json")
    sae_repository_type = Column(String(50), nullable=False, default="mock")

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())


class TenantProduct(Base):
    __tablename__ = "tenant_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    sku = Column(String(100), index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    shopify_inventory_item_id = Column(String(255), nullable=True, default="")
    shopify_location_id = Column(String(255), nullable=True, default="")
    ml_item_id = Column(String(255), nullable=True, default="")
    tiktok_product_id = Column(String(255), nullable=True, default="")
    amazon_asin = Column(String(255), nullable=True, default="")
    ebay_item_id = Column(String(255), nullable=True, default="")
    kaufland_unit_id = Column(String(255), nullable=True, default="")

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "sku", name="uq_user_sku"),
    )



