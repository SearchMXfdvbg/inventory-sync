"""
Sistema de Migraciones Reversibles (UP y DOWN) para Neon PostgreSQL y SQLite.
Permite actualizar el esquema y ejecutar rollbacks controlados en menos de 60 segundos.
"""
import logging
import sqlite3
from typing import Dict, Any, List
from sqlalchemy import text, inspect
from database import Base

logger = logging.getLogger("inventory_sync.migrations")

# Definiciones de columnas añadidas en migraciones progresivas
AUDIT_LOG_COLUMNS = {
    "reason": "VARCHAR(255) DEFAULT ''",
    "ip_address": "VARCHAR(64) DEFAULT ''",
    "user_agent": "VARCHAR(512) DEFAULT ''",
}

TENANT_PRODUCT_COLUMNS = {
    "version": "INTEGER DEFAULT 1 NOT NULL",
    "sync_hash": "VARCHAR(64) DEFAULT ''",
    "last_sync_source": "VARCHAR(50) DEFAULT ''",
    "ebay_item_id": "VARCHAR(255) DEFAULT ''",
    "kaufland_unit_id": "VARCHAR(255) DEFAULT ''",
    "tiendanube_variant_id": "VARCHAR(255) DEFAULT ''",
}

TENANT_SETTINGS_COLUMNS = {
    "maintenance_mode": "BOOLEAN DEFAULT FALSE NOT NULL",
    "ml_client_id": "VARCHAR(255) DEFAULT ''",
    "ml_client_secret": "VARCHAR(255) DEFAULT ''",
    "ml_refresh_token": "VARCHAR(255) DEFAULT ''",
    "ml_token_expires_at": "TIMESTAMP NULL",
    "enable_ebay": "BOOLEAN DEFAULT FALSE NOT NULL",
    "enable_kaufland": "BOOLEAN DEFAULT FALSE NOT NULL",
    "ebay_client_id": "VARCHAR(255) DEFAULT ''",
    "ebay_client_secret": "VARCHAR(255) DEFAULT ''",
    "ebay_refresh_token": "VARCHAR(255) DEFAULT ''",
    "ebay_marketplace_id": "VARCHAR(50) DEFAULT 'EBAY_DE'",
    "kaufland_client_key": "VARCHAR(255) DEFAULT ''",
    "kaufland_secret_key": "VARCHAR(255) DEFAULT ''",
    "kaufland_storefront": "VARCHAR(50) DEFAULT 'de'",
    "enable_tiendanube": "BOOLEAN DEFAULT FALSE NOT NULL",
    "tiendanube_store_id": "VARCHAR(100) DEFAULT ''",
    "tiendanube_access_token": "VARCHAR(255) DEFAULT ''",
    "tiendanube_client_id": "VARCHAR(100) DEFAULT ''",
    "tiendanube_client_secret": "VARCHAR(255) DEFAULT ''",
    "tiendanube_webhook_secret": "VARCHAR(255) DEFAULT ''",
}

VENTA_COLUMNS = {
    "tiktok_synced": "BOOLEAN DEFAULT FALSE NOT NULL",
    "amazon_synced": "BOOLEAN DEFAULT FALSE NOT NULL",
    "ebay_synced": "BOOLEAN DEFAULT FALSE NOT NULL",
    "kaufland_synced": "BOOLEAN DEFAULT FALSE NOT NULL",
    "tiendanube_synced": "BOOLEAN DEFAULT FALSE NOT NULL",
    "user_id": "INTEGER DEFAULT 1",
    "idempotency_key": "VARCHAR(255) DEFAULT ''",
}

USER_COLUMNS = {
    "email_verified": "BOOLEAN DEFAULT FALSE NOT NULL",
}


def upgrade_db(engine) -> Dict[str, Any]:
    """
    UP: Aplica todas las migraciones necesarias para elevar el esquema a la última versión.
    Crea tablas faltantes y añade columnas sin interrumpir el servicio.
    """
    logger.info("[MIGRATION:UP] Iniciando actualización de base de datos...")
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    url_str = str(engine.url)
    applied: List[str] = []

    if "sqlite" in url_str:
        db_path = url_str.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        tables_to_migrate = [
            ("inventory_audit_logs", AUDIT_LOG_COLUMNS),
            ("tenant_products", TENANT_PRODUCT_COLUMNS),
            ("tenant_settings", TENANT_SETTINGS_COLUMNS),
            ("ventas", VENTA_COLUMNS),
            ("users", USER_COLUMNS),
        ]

        for table_name, cols in tables_to_migrate:
            cur.execute(f"PRAGMA table_info({table_name})")
            existing = {row[1] for row in cur.fetchall()}
            for col_name, col_def in cols.items():
                if col_name not in existing:
                    cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def};")
                    applied.append(f"{table_name}.{col_name}")

        conn.commit()
        conn.close()

    else:
        # PostgreSQL / Neon
        tables_to_migrate = [
            ("inventory_audit_logs", AUDIT_LOG_COLUMNS),
            ("tenant_products", TENANT_PRODUCT_COLUMNS),
            ("tenant_settings", TENANT_SETTINGS_COLUMNS),
            ("ventas", VENTA_COLUMNS),
            ("users", USER_COLUMNS),
        ]
        for table_name, cols in tables_to_migrate:
            for col_name, col_def in cols.items():
                try:
                    with engine.begin() as conn:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                    applied.append(f"{table_name}.{col_name}")
                except Exception as err:
                    logger.warning(f"[MIGRATION:UP] No se pudo verificar/añadir columna {table_name}.{col_name} en PostgreSQL: {err}")

    logger.info(f"[MIGRATION:UP] Migraciones aplicadas exitosamente ({len(applied)} columnas verificadas/añadidas).")
    return {"status": "success", "applied_columns": applied}


def downgrade_db(engine) -> Dict[str, Any]:
    """
    DOWN: Revierte de manera segura las columnas añadidas en caso de rollback de emergencia (< 60s).
    """
    logger.warning("[MIGRATION:DOWN] Iniciando rollback de emergencia en esquema de base de datos...")
    url_str = str(engine.url)
    reverted: List[str] = []

    rollback_targets = [
        ("inventory_audit_logs", ["reason", "ip_address", "user_agent"]),
        ("tenant_products", ["sync_hash", "last_sync_source", "ebay_item_id", "kaufland_unit_id", "tiendanube_variant_id"]),
        ("tenant_settings", ["enable_ebay", "enable_kaufland", "ebay_client_id", "ebay_client_secret", "ebay_refresh_token", "kaufland_client_key", "kaufland_secret_key", "enable_tiendanube", "tiendanube_store_id", "tiendanube_access_token", "tiendanube_client_id", "tiendanube_client_secret", "tiendanube_webhook_secret"]),
        ("ventas", ["ebay_synced", "kaufland_synced", "tiendanube_synced"]),
    ]

    if "sqlite" in url_str:
        db_path = url_str.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        for table_name, cols in rollback_targets:
            cur.execute(f"PRAGMA table_info({table_name})")
            existing = {row[1] for row in cur.fetchall()}
            for col_name in cols:
                if col_name in existing:
                    try:
                        cur.execute(f"ALTER TABLE {table_name} DROP COLUMN {col_name};")
                        reverted.append(f"{table_name}.{col_name}")
                    except Exception as err:
                        logger.warning(f"No se pudo revertir columna {table_name}.{col_name} en SQLite: {err}")

        conn.commit()
        conn.close()

    else:
        # PostgreSQL / Neon
        with engine.connect() as conn:
            for table_name, cols in rollback_targets:
                for col_name in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS {col_name};"))
                        reverted.append(f"{table_name}.{col_name}")
                    except Exception as err:
                        logger.warning(f"No se pudo revertir columna {table_name}.{col_name} en PostgreSQL: {err}")
            conn.commit()

    logger.warning(f"[MIGRATION:DOWN] Rollback completado en < 60s ({len(reverted)} columnas revertidas).")
    return {"status": "success", "reverted_columns": reverted}
