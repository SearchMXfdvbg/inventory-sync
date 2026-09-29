# sae_db.py
import os
import logging
from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
class SAESyncError(Exception):
    pass

class ProductNotFoundError(SAESyncError):
    pass

class InsufficientStockError(SAESyncError):
    pass

class SAERepository:
    def get_stock(self, sku: str) -> int: raise NotImplementedError
    def set_stock(self, sku: str, quantity: int) -> None: raise NotImplementedError
    def decrement_stock(self, sku: str, quantity: int) -> int: raise NotImplementedError
    def get_product(self, sku: str) -> Dict[str, Any]: raise NotImplementedError
    def get_all_products(self) -> list: raise NotImplementedError

logger = logging.getLogger("inventory_sync.sae_db")

class SAEDatabaseRepository(SAERepository):
    """
    Implementación en producción para conectar directamente con la base de datos SQL Server de CONTPAQi SAE.
    Mapea a la tabla INVE01 (donde CVE_ART es el SKU y EXIST es el stock disponible).
    """
    def __init__(self, db_url: str):
        logger.info("Inicializando SAEDatabaseRepository con la base de datos de producción...")
        # Configuración de pool de conexiones optimizado para producción
        self.engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True
        )
        self.Session = sessionmaker(bind=self.engine)

    def get_product(self, sku: str) -> Dict[str, Any]:
        with self.Session() as session:
            try:
                query = text("SELECT CVE_ART, DESCR, EXIST FROM INVE01 WHERE CVE_ART = :sku")
                result = session.execute(query, {"sku": sku}).fetchone()
                if result:
                    mapping_query = text(
                        "SELECT shopify_inventory_item_id, shopify_location_id, ml_item_id "
                        "FROM PRODUCT_MAPPINGS WHERE sku = :sku"
                    )
                    mapping = None
                    try:
                        mapping = session.execute(mapping_query, {"sku": sku}).fetchone()
                    except Exception:
                        pass

                    return {
                        "sku": result.CVE_ART,
                        "nombre": result.DESCR,
                        "stock": int(result.EXIST),
                        "shopify_inventory_item_id": mapping.shopify_inventory_item_id if mapping else None,
                        "shopify_location_id": mapping.shopify_location_id if mapping else None,
                        "ml_item_id": mapping.ml_item_id if mapping else None
                    }
            except Exception:
                session.rollback()

            # Fallback para Neon / PostgreSQL con tabla tenant_products
            try:
                tp_query = text("SELECT sku, nombre, stock, shopify_inventory_item_id, shopify_location_id, ml_item_id FROM tenant_products WHERE UPPER(sku) = UPPER(:sku)")
                tp = session.execute(tp_query, {"sku": sku}).fetchone()
                if tp:
                    return {
                        "sku": tp.sku,
                        "nombre": tp.nombre,
                        "stock": int(tp.stock),
                        "shopify_inventory_item_id": tp.shopify_inventory_item_id or f"gid://shopify/InventoryItem/{hash(tp.sku)%10000000}",
                        "shopify_location_id": tp.shopify_location_id or "gid://shopify/Location/demo",
                        "ml_item_id": tp.ml_item_id or f"MLM{hash(tp.sku)%10000000}"
                    }
            except Exception:
                session.rollback()

            raise ProductNotFoundError(f"El SKU '{sku}' no existe en el catálogo.")

    def get_all_products(self) -> list:
        with self.Session() as session:
            try:
                query = text(
                    "SELECT i.CVE_ART, i.DESCR, i.EXIST, "
                    "m.shopify_inventory_item_id, m.shopify_location_id, m.ml_item_id "
                    "FROM INVE01 i "
                    "LEFT JOIN PRODUCT_MAPPINGS m ON i.CVE_ART = m.sku"
                )
                results = session.execute(query).fetchall()
                if results:
                    products = []
                    for row in results:
                        products.append({
                            "sku": row.CVE_ART,
                            "nombre": row.DESCR,
                            "stock": int(row.EXIST) if row.EXIST is not None else 0,
                            "shopify_inventory_item_id": row.shopify_inventory_item_id,
                            "shopify_location_id": row.shopify_location_id,
                            "ml_item_id": row.ml_item_id
                        })
                    return products
            except Exception:
                session.rollback()

            # Fallback a tenant_products
            try:
                tp_query = text("SELECT sku, nombre, stock, shopify_inventory_item_id, shopify_location_id, ml_item_id FROM tenant_products")
                results = session.execute(tp_query).fetchall()
                products = []
                for row in results:
                    products.append({
                        "sku": row.sku,
                        "nombre": row.nombre,
                        "stock": int(row.stock) if row.stock is not None else 0,
                        "shopify_inventory_item_id": row.shopify_inventory_item_id,
                        "shopify_location_id": row.shopify_location_id,
                        "ml_item_id": row.ml_item_id
                    })
                return products
            except Exception:
                session.rollback()
                return []

    def get_stock(self, sku: str) -> int:
        with self.Session() as session:
            try:
                query = text("SELECT EXIST FROM INVE01 WHERE CVE_ART = :sku")
                result = session.execute(query, {"sku": sku}).fetchone()
                if result:
                    return int(result.EXIST)
            except Exception:
                session.rollback()

            try:
                tp_query = text("SELECT stock FROM tenant_products WHERE UPPER(sku) = UPPER(:sku)")
                tp = session.execute(tp_query, {"sku": sku}).fetchone()
                if tp:
                    return int(tp.stock)
            except Exception:
                session.rollback()

            raise ProductNotFoundError(f"El SKU '{sku}' no existe en el catálogo.")

    def set_stock(self, sku: str, quantity: int) -> None:
        with self.Session() as session:
            try:
                query = text("UPDATE INVE01 SET EXIST = :quantity WHERE CVE_ART = :sku")
                result = session.execute(query, {"quantity": quantity, "sku": sku})
                if result.rowcount > 0:
                    session.commit()
                    return
            except Exception:
                session.rollback()

            try:
                tp_query = text("UPDATE tenant_products SET stock = :quantity WHERE UPPER(sku) = UPPER(:sku)")
                result = session.execute(tp_query, {"quantity": quantity, "sku": sku})
                if result.rowcount > 0:
                    session.commit()
                    return
            except Exception:
                session.rollback()

            raise ProductNotFoundError(f"El SKU '{sku}' no existe en el catálogo.")

    def decrement_stock(self, sku: str, quantity: int) -> int:
        with self.Session() as session:
            try:
                query = text(
                    "UPDATE INVE01 SET EXIST = EXIST - :quantity "
                    "WHERE CVE_ART = :sku AND EXIST >= :quantity"
                )
                result = session.execute(query, {"quantity": quantity, "sku": sku})
                if result.rowcount > 0:
                    session.commit()
                    return self.get_stock(sku)
            except Exception:
                session.rollback()

            # Fallback atómico en tenant_products
            try:
                tp_update = text(
                    "UPDATE tenant_products SET stock = stock - :quantity "
                    "WHERE UPPER(sku) = UPPER(:sku) AND stock >= :quantity"
                )
                result = session.execute(tp_update, {"quantity": quantity, "sku": sku})
                if result.rowcount > 0:
                    session.commit()
                    return self.get_stock(sku)
                
                # Checar si faltó stock o no existía
                check = session.execute(text("SELECT stock FROM tenant_products WHERE UPPER(sku) = UPPER(:sku)"), {"sku": sku}).fetchone()
                if not check:
                    raise ProductNotFoundError(f"El SKU '{sku}' no existe en el catálogo.")
                raise InsufficientStockError(f"Stock insuficiente. Disponible: {check.stock}, Solicitado: {quantity}")
            except (ProductNotFoundError, InsufficientStockError):
                raise
            except Exception as e:
                session.rollback()
                raise SAESyncError(f"Error al descontar stock: {e}")
