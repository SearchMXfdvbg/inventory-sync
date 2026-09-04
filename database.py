import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Create directory for SQLite if it is a file-based sqlite database
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    # check_same_thread=False is needed only for SQLite to allow multiple threads to access it
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Vulnerabilidad #17: Configuración de concurrencia e integridad en SQLite
# Se activa Write-Ahead Logging (WAL) y synchronous=NORMAL para evitar bloqueos
# y mejorar el rendimiento concurrente de lectura/escritura.
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Dependency helper to obtain database session.
    Yields the session and ensures it gets closed after request lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_and_migrate():
    """
    Crea las tablas si no existen y añade dinámicamente cualquier columna faltante
    en bases de datos SQLite existentes para garantizar compatibilidad hacia adelante.
    """
    import models
    Base.metadata.create_all(bind=engine)

    if "sqlite" in settings.DATABASE_URL:
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                
                # Migración de tabla ventas
                cur.execute("PRAGMA table_info(ventas)")
                venta_cols = [row[1] for row in cur.fetchall()]
                if venta_cols:
                    if "tiktok_synced" not in venta_cols:
                        cur.execute("ALTER TABLE ventas ADD COLUMN tiktok_synced BOOLEAN DEFAULT 0 NOT NULL")
                    if "amazon_synced" not in venta_cols:
                        cur.execute("ALTER TABLE ventas ADD COLUMN amazon_synced BOOLEAN DEFAULT 0 NOT NULL")
                    if "ebay_synced" not in venta_cols:
                        cur.execute("ALTER TABLE ventas ADD COLUMN ebay_synced BOOLEAN DEFAULT 0 NOT NULL")
                    if "kaufland_synced" not in venta_cols:
                        cur.execute("ALTER TABLE ventas ADD COLUMN kaufland_synced BOOLEAN DEFAULT 0 NOT NULL")
                    if "user_id" not in venta_cols:
                        cur.execute("ALTER TABLE ventas ADD COLUMN user_id INTEGER DEFAULT 1")
                    
                # Migración de tabla users
                cur.execute("PRAGMA table_info(users)")
                user_cols = [row[1] for row in cur.fetchall()]
                if user_cols:
                    if "email_verified" not in user_cols:
                        cur.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0 NOT NULL")

                # Migración de tabla tenant_settings
                cur.execute("PRAGMA table_info(tenant_settings)")
                ts_cols = [row[1] for row in cur.fetchall()]
                if ts_cols:
                    new_ts_cols = {
                        "enable_ebay": "BOOLEAN DEFAULT 0 NOT NULL",
                        "enable_kaufland": "BOOLEAN DEFAULT 0 NOT NULL",
                        "ebay_client_id": "VARCHAR(255) DEFAULT '' NOT NULL",
                        "ebay_client_secret": "VARCHAR(255) DEFAULT '' NOT NULL",
                        "ebay_refresh_token": "VARCHAR(255) DEFAULT '' NOT NULL",
                        "ebay_marketplace_id": "VARCHAR(50) DEFAULT 'EBAY_DE' NOT NULL",
                        "kaufland_client_key": "VARCHAR(255) DEFAULT '' NOT NULL",
                        "kaufland_secret_key": "VARCHAR(255) DEFAULT '' NOT NULL",
                        "kaufland_storefront": "VARCHAR(50) DEFAULT 'de' NOT NULL",
                    }
                    for col_name, col_def in new_ts_cols.items():
                        if col_name not in ts_cols:
                            cur.execute(f"ALTER TABLE tenant_settings ADD COLUMN {col_name} {col_def}")

                # Migración de tabla tenant_products
                cur.execute("PRAGMA table_info(tenant_products)")
                tp_cols = [row[1] for row in cur.fetchall()]
                if tp_cols:
                    if "ebay_item_id" not in tp_cols:
                        cur.execute("ALTER TABLE tenant_products ADD COLUMN ebay_item_id VARCHAR(255) DEFAULT ''")
                    if "kaufland_unit_id" not in tp_cols:
                        cur.execute("ALTER TABLE tenant_products ADD COLUMN kaufland_unit_id VARCHAR(255) DEFAULT ''")
                    
                conn.commit()
                conn.close()
            except Exception as e:
                pass

        try:
            from models import User, TenantSettings, TenantProduct
            from auth import hash_password
            with SessionLocal() as db_session:
                admin_user = db_session.query(User).filter(User.username == "admin").first()
                if not admin_user:
                    admin_user = User(
                        username="admin",
                        email="admin@inventorysync.com",
                        hashed_password=hash_password("admin123"),
                        role="admin",
                        tenant_id="empresa-a",
                        is_active=True,
                        email_verified=True
                    )
                    db_session.add(admin_user)
                    db_session.commit()
                    db_session.refresh(admin_user)

                # Inicializar configuración del admin si no existe
                admin_settings = db_session.query(TenantSettings).filter(TenantSettings.user_id == admin_user.id).first()
                if not admin_settings:
                    admin_settings = TenantSettings(
                        user_id=admin_user.id,
                        tenant_id=admin_user.tenant_id,
                        inventario_principal=getattr(settings, "INVENTARIO_PRINCIPAL", "shopify"),
                        enable_sae=getattr(settings, "ENABLE_SAE", True),
                        enable_shopify=getattr(settings, "ENABLE_SHOPIFY", True),
                        enable_mercadolibre=getattr(settings, "ENABLE_MERCADOLIBRE", True),
                        enable_tiktok=getattr(settings, "ENABLE_TIKTOK", True),
                        enable_amazon=getattr(settings, "ENABLE_AMAZON", True),
                        shop_domain=getattr(settings, "SHOP_DOMAIN", ""),
                        shopify_access_token=getattr(settings, "SHOPIFY_ACCESS_TOKEN", ""),
                        shopify_location_id=getattr(settings, "SHOPIFY_LOCATION_ID", ""),
                        shopify_api_secret=getattr(settings, "SHOPIFY_API_SECRET", ""),
                        ml_access_token=getattr(settings, "ML_ACCESS_TOKEN", ""),
                        ml_user_id=getattr(settings, "ML_USER_ID", 0),
                        ml_site_id=getattr(settings, "ML_SITE_ID", "MLM")
                    )
                    db_session.add(admin_settings)
                    db_session.commit()

        except Exception:
            pass

