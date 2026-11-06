from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, UniqueConstraint, func
from database import Base

class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(100), nullable=False)
    origen = Column(String(50), nullable=False)  # e.g., 'shopify', 'mercadolibre', 'tiktok', 'amazon', 'ebay', 'kaufland', 'tiendanube'
    sku = Column(String(100), nullable=False)
    cantidad = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PROCESSING, PROCESSED, FAILED_RETRYABLE, FAILED_DLQ, QUEUED_MAINTENANCE
    sae_decremented = Column(Boolean, nullable=False, default=False)
    shopify_synced = Column(Boolean, nullable=False, default=False)
    ml_synced = Column(Boolean, nullable=False, default=False)
    tiktok_synced = Column(Boolean, nullable=False, default=False)
    amazon_synced = Column(Boolean, nullable=False, default=False)
    ebay_synced = Column(Boolean, nullable=False, default=False)
    kaufland_synced = Column(Boolean, nullable=False, default=False)
    tiendanube_synced = Column(Boolean, nullable=False, default=False)
    user_id = Column(Integer, index=True, nullable=True, default=1)
    idempotency_key = Column(String(255), index=True, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("origen", "external_id", name="uq_origen_external_id"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")  # 'SUPER_ADMIN', 'admin', 'manager', 'user', 'viewer'
    tenant_id = Column(String(100), nullable=False, default="empresa-a")
    is_active = Column(Boolean, nullable=False, default=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True, nullable=False)
    tenant_id = Column(String(100), index=True, nullable=False, default="default")

    # Modo Mantenimiento (Pausa la cola de sincronización preservando webhooks)
    maintenance_mode = Column(Boolean, nullable=False, default=False)

    inventario_principal = Column(String(50), nullable=False, default="shopify")
    enable_sae = Column(Boolean, nullable=False, default=False)
    enable_shopify = Column(Boolean, nullable=False, default=True)
    enable_mercadolibre = Column(Boolean, nullable=False, default=True)
    enable_tiktok = Column(Boolean, nullable=False, default=False)
    enable_amazon = Column(Boolean, nullable=False, default=False)
    enable_ebay = Column(Boolean, nullable=False, default=False)
    enable_kaufland = Column(Boolean, nullable=False, default=False)
    enable_tiendanube = Column(Boolean, nullable=False, default=False)

    shop_domain = Column(String(255), nullable=False, default="")
    shopify_access_token = Column(String(255), nullable=False, default="")
    shopify_location_id = Column(String(255), nullable=False, default="")
    shopify_api_secret = Column(String(255), nullable=False, default="")
    shopify_api_version = Column(String(50), nullable=False, default="2026-07")

    ml_access_token = Column(String(255), nullable=False, default="")
    ml_user_id = Column(Integer, nullable=False, default=0)
    ml_site_id = Column(String(50), nullable=False, default="MLM")
    ml_webhook_secret = Column(String(255), nullable=False, default="")
    ml_client_id = Column(String(255), nullable=False, default="")
    ml_client_secret = Column(String(255), nullable=False, default="")
    ml_refresh_token = Column(String(255), nullable=False, default="")
    ml_token_expires_at = Column(DateTime(timezone=True), nullable=True)

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

    tiendanube_store_id = Column(String(100), nullable=False, default="")
    tiendanube_access_token = Column(String(255), nullable=False, default="")
    tiendanube_client_id = Column(String(100), nullable=False, default="")
    tiendanube_client_secret = Column(String(255), nullable=False, default="")
    tiendanube_webhook_secret = Column(String(255), nullable=False, default="")

    sae_data_path = Column(String(255), nullable=False, default="data/productos.json")
    sae_repository_type = Column(String(50), nullable=False, default="mock")

    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())


class TenantProduct(Base):
    __tablename__ = "tenant_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    sku = Column(String(100), index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    version = Column(Integer, nullable=False, default=1)  # Optimistic Locking
    sync_hash = Column(String(64), nullable=True, default="")  # Anti-Loop State Hash
    last_sync_source = Column(String(50), nullable=True, default="")  # Origen del último cambio
    shopify_inventory_item_id = Column(String(255), nullable=True, default="")
    shopify_location_id = Column(String(255), nullable=True, default="")
    ml_item_id = Column(String(255), nullable=True, default="")
    tiktok_product_id = Column(String(255), nullable=True, default="")
    amazon_asin = Column(String(255), nullable=True, default="")
    ebay_item_id = Column(String(255), nullable=True, default="")
    kaufland_unit_id = Column(String(255), nullable=True, default="")
    tiendanube_variant_id = Column(String(255), nullable=True, default="")

    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "sku", name="uq_user_sku"),
    )


class WebhookEventIdempotency(Base):
    """
    Registro inmutable de idempotencia para webhooks y mutaciones de inventario.
    Previene procesamiento repetido por duplicación de eventos de red o reintentos de canales.
    """
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(255), unique=True, index=True, nullable=False)
    source = Column(String(50), nullable=False)  # shopify, mercadolibre, tiktok, amazon, ebay, kaufland, api
    event_id = Column(String(100), index=True, nullable=True)
    user_id = Column(Integer, index=True, nullable=True, default=1)
    payload_hash = Column(String(64), nullable=False)  # SHA-256 del raw payload
    status = Column(String(50), nullable=False, default="PROCESSING")  # PROCESSING, PROCESSED, DUPLICATE_IGNORED
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)


class InventoryAuditLog(Base):
    """
    Bitácora inmutable de auditoría con encadenamiento criptográfico tipo blockchain (SHA-256).
    Registra cada mutación de stock, delta, actor, canal de origen e integridad de la cadena.
    """
    __tablename__ = "inventory_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False, default=1)
    sku = Column(String(100), index=True, nullable=False)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    delta = Column(Integer, nullable=False)
    actor_id = Column(Integer, nullable=True)
    actor_username = Column(String(100), nullable=False, default="system")
    actor_role = Column(String(50), nullable=False, default="system")
    source_channel = Column(String(50), nullable=False, default="direct")  # direct, shopify_sync, ml_sync, excel_sync, webhook, rollback
    idempotency_key = Column(String(255), nullable=True)
    reason = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    previous_hash = Column(String(64), nullable=False, default="0"*64)
    integrity_hash = Column(String(64), nullable=False)  # SHA-256(prev_hash:user:sku:delta:prev:new:ts)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())


class InventorySnapshot(Base):
    """
    Snapshots completos de inventario previos a operaciones masivas de sincronización.
    Permite rollback inmediato ante desincronizaciones o fallas catastróficas.
    """
    __tablename__ = "inventory_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    snapshot_name = Column(String(255), nullable=False)
    products_data = Column(Text, nullable=False)  # JSON serializado con el estado completo del stock
    items_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
