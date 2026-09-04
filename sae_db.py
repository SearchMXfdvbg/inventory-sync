# sae_db.py
import os
import logging
from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sae_mock import SAERepository, ProductNotFoundError, InsufficientStockError

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
            # Obtiene los datos del producto directamente de la tabla INVE01 de SAE
            query = text("SELECT CVE_ART, DESCR, EXIST FROM INVE01 WHERE CVE_ART = :sku")
            result = session.execute(query, {"sku": sku}).fetchone()
            if not result:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")

            # Para asociar los IDs de Shopify y Mercado Libre, se consulta una tabla de
            # mapeos local dentro de la base de datos del sincronizador o una tabla personalizada en SAE:
            mapping_query = text(
                "SELECT shopify_inventory_item_id, shopify_location_id, ml_item_id "
                "FROM PRODUCT_MAPPINGS WHERE sku = :sku"
            )
            mapping = session.execute(mapping_query, {"sku": sku}).fetchone()

            return {
                "sku": result.CVE_ART,
                "nombre": result.DESCR,
                "stock": int(result.EXIST),
                "shopify_inventory_item_id": mapping.shopify_inventory_item_id if mapping else None,
                "shopify_location_id": mapping.shopify_location_id if mapping else None,
                "ml_item_id": mapping.ml_item_id if mapping else None
            }

    def get_all_products(self) -> list:
        with self.Session() as session:
            query = text(
                "SELECT i.CVE_ART, i.DESCR, i.EXIST, "
                "m.shopify_inventory_item_id, m.shopify_location_id, m.ml_item_id "
                "FROM INVE01 i "
                "LEFT JOIN PRODUCT_MAPPINGS m ON i.CVE_ART = m.sku"
            )
            results = session.execute(query).fetchall()
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

    def get_stock(self, sku: str) -> int:
        with self.Session() as session:
            query = text("SELECT EXIST FROM INVE01 WHERE CVE_ART = :sku")
            result = session.execute(query, {"sku": sku}).fetchone()
            if not result:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
            return int(result.EXIST)

    def set_stock(self, sku: str, quantity: int) -> None:
        with self.Session() as session:
            query = text("UPDATE INVE01 SET EXIST = :quantity WHERE CVE_ART = :sku")
            result = session.execute(query, {"quantity": quantity, "sku": sku})
            if result.rowcount == 0:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
            session.commit()

    def decrement_stock(self, sku: str, quantity: int) -> int:
        with self.Session() as session:
            # decrement_stock se realiza a nivel base de datos de manera atómica para evitar condiciones de carrera
            query = text(
                "UPDATE INVE01 SET EXIST = EXIST - :quantity "
                "WHERE CVE_ART = :sku AND EXIST >= :quantity"
            )
            result = session.execute(query, {"quantity": quantity, "sku": sku})
            if result.rowcount == 0:
                # Si no afectó filas, consultamos la causa (inexistencia o stock insuficiente)
                check_query = text("SELECT EXIST FROM INVE01 WHERE CVE_ART = :sku")
                current = session.execute(check_query, {"sku": sku}).fetchone()
                if not current:
                    raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
                raise InsufficientStockError(
                    f"Stock insuficiente en SAE. Disponible: {current.EXIST}, Solicitado: {quantity}"
                )
            
            session.commit()
            
            # Obtener el stock actualizado
            return self.get_stock(sku)
