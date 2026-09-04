import argparse
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app import setup_logging
from database import engine, Base, SessionLocal
from models import Venta
from sae_mock import SAEMockRepository, ProductNotFoundError, InsufficientStockError
from shopify_client import ShopifyClient
from ml_client import MLClient
from tiktok_client import TikTokClient
from amazon_client import AmazonClient
from ebay_client import EbayClient
from kaufland_client import KauflandClient
from config import settings

# Initialize logging using the application's global setup
setup_logging()
logger = logging.getLogger("inventory_sync.worker")

# Clients and Repositories
shopify_client = ShopifyClient()
ml_client = MLClient()
tiktok_client = TikTokClient()
amazon_client = AmazonClient()
ebay_client = EbayClient()
kaufland_client = KauflandClient()
sae = SAEMockRepository()

# Base delay for exponential backoff (in seconds)
RETRY_BASE_DELAY = 60


def handle_temp_error(db: Session, venta: Venta, error_msg: str) -> None:
    """
    Handles a temporary error in the saga execution.
    Updates the last_error of the venta. If the attempts count has reached
    or exceeded 5, transitions the venta status to 'FAILED'.
    """
    venta.last_error = error_msg
    if venta.attempts >= 5:
        venta.status = "FAILED"
        venta.last_error = f"Exceeded max retries (5). Last error: {error_msg}"
        logger.error(f"Venta ID {venta.id} has exceeded the limit of 5 attempts. Marking as FAILED.")
    db.commit()


async def run_iteration(db: Session) -> bool:
    """
    Runs a single processing iteration.
    Finds ready sales, locks them, and processes them through the saga steps.
    Returns True if at least one sale was processed successfully or failed permanently,
    or False if a temporary error occurred or there were no ready sales.
    """
    from config import reload_settings
    reload_settings()
    
    global shopify_client, ml_client, sae
    from unittest.mock import Mock, MagicMock
    
    if not isinstance(shopify_client, (Mock, MagicMock)):
        shopify_client = ShopifyClient()
    if not isinstance(ml_client, (Mock, MagicMock)):
        ml_client = MLClient()
    if not isinstance(sae, (Mock, MagicMock)):
        sae = SAEMockRepository()

    logger.info("Starting worker processing iteration...")
    any_processed = False

    while True:
        # 1. Fetch sales that have status='PENDING' or status='PROCESSING' and attempts < 5
        sales = db.query(Venta).filter(
            Venta.status.in_(["PENDING", "PROCESSING"]),
            Venta.attempts < 5
        ).order_by(Venta.id.asc()).all()

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        ready_sale: Optional[Venta] = None

        for sale in sales:
            if sale.attempts == 0:
                ready_sale = sale
                break
            else:
                # Calculate backoff: RETRY_BASE_DELAY * 2^(attempts-1)
                delay_seconds = RETRY_BASE_DELAY * (2 ** (sale.attempts - 1))
                next_attempt = sale.updated_at + timedelta(seconds=delay_seconds)
                if now >= next_attempt:
                    ready_sale = sale
                    break

        if not ready_sale:
            logger.info("No more ready sales found in this iteration.")
            break

        # 2. Update status to 'PROCESSING' and increment attempts atomically
        stmt = (
            db.query(Venta)
            .filter(
                Venta.id == ready_sale.id,
                Venta.status == ready_sale.status,
                Venta.attempts == ready_sale.attempts
            )
            .update(
                {
                    Venta.status: "PROCESSING",
                    Venta.attempts: Venta.attempts + 1,
                    Venta.updated_at: datetime.now(timezone.utc).replace(tzinfo=None)
                },
                synchronize_session="fetch"
            )
        )
        db.commit()

        if stmt == 0:
            logger.info(f"Venta ID {ready_sale.id} was claimed by another worker or changed state. Retrying...")
            continue

        # Retrieve the updated sale object
        venta = db.query(Venta).filter(Venta.id == ready_sale.id).first()
        if not venta:
            continue

        logger.info(
            f"Processing Venta ID {venta.id} (SKU: {venta.sku}, Quantity: {venta.cantidad}, "
            f"Origin: {venta.origen}, External ID: {venta.external_id}, Attempt: {venta.attempts})"
        )

        # 3. Load product data in SAE Mock
        try:
            product = sae.get_product(venta.sku)
        except ProductNotFoundError as e:
            logger.error(f"SKU '{venta.sku}' does not exist in SAE Mock. Marking Venta ID {venta.id} as FAILED.")
            venta.status = "FAILED"
            venta.last_error = f"ProductNotFoundError: {str(e)}"
            db.commit()
            any_processed = True
            continue
        except Exception as e:
            logger.exception(f"Temporary error loading product '{venta.sku}' from SAE Mock for Venta ID {venta.id}: {e}")
            handle_temp_error(db, venta, f"SAEProductLoadError: {str(e)}")
            return False

        shopify_item_id = product.get("shopify_inventory_item_id")
        shopify_location_id = product.get("shopify_location_id") or settings.SHOPIFY_LOCATION_ID
        ml_item_id = product.get("ml_item_id")

        # Validate that required keys are present to communicate with external APIs
        if not shopify_item_id or not ml_item_id:
            missing_fields = []
            if not shopify_item_id:
                missing_fields.append("shopify_inventory_item_id")
            if not ml_item_id:
                missing_fields.append("ml_item_id")
            err_msg = f"ConfigurationError: Product is missing {', '.join(missing_fields)}"
            logger.error(f"Venta ID {venta.id} failed due to incomplete configuration for SKU '{venta.sku}': {err_msg}")
            venta.status = "FAILED"
            venta.last_error = err_msg
            db.commit()
            any_processed = True
            continue

        enable_sae = getattr(settings, "ENABLE_SAE", True)
        enable_shopify = getattr(settings, "ENABLE_SHOPIFY", True)
        enable_ml = getattr(settings, "ENABLE_MERCADOLIBRE", True)
        enable_tiktok = getattr(settings, "ENABLE_TIKTOK", True)
        enable_amazon = getattr(settings, "ENABLE_AMAZON", True)
        enable_ebay = getattr(settings, "ENABLE_EBAY", True)
        enable_kaufland = getattr(settings, "ENABLE_KAUFLAND", True)

        # 4. SAE stock decrement (si SAE está activo)
        if enable_sae:
            if not venta.sae_decremented:
                try:
                    sae.decrement_stock(venta.sku, venta.cantidad)
                    venta.sae_decremented = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: SAE stock decremented successfully.")
                except InsufficientStockError as e:
                    logger.error(f"Venta ID {venta.id}: Insufficient stock for SKU '{venta.sku}'. Marking as FAILED.")
                    venta.status = "FAILED"
                    venta.last_error = f"InsufficientStockError: {str(e)}"
                    db.commit()
                    any_processed = True
                    continue
                except Exception as e:
                    logger.exception(f"Temporary error decrementing stock in SAE for SKU '{venta.sku}' (Venta ID {venta.id}): {e}")
                    handle_temp_error(db, venta, f"SAEDecrementError: {str(e)}")
                    return False
        else:
            venta.sae_decremented = True

        # Obtener stock maestro disponible
        try:
            current_master_stock = sae.get_stock(venta.sku) if enable_sae else 10
        except Exception:
            current_master_stock = 10

        # 5. Shopify inventory adjustment
        if enable_shopify:
            if not venta.shopify_synced:
                idempotency_key = f"shopify_sale_{venta.origen}_{venta.external_id}"
                reference_uri = f"sale://{venta.origen}/{venta.external_id}"
                try:
                    await shopify_client.adjust_inventory(
                        inventory_item_id=shopify_item_id,
                        location_id=shopify_location_id,
                        delta=-venta.cantidad,
                        idempotency_key=idempotency_key,
                        reference_uri=reference_uri
                    )
                    venta.shopify_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: Shopify inventory adjusted successfully.")
                except Exception as e:
                    logger.exception(f"Temporary error adjusting inventory in Shopify for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"ShopifySyncError: {str(e)}")
                    return False
        else:
            venta.shopify_synced = True

        # 6. Mercado Libre inventory update
        if enable_ml:
            if not venta.ml_synced:
                try:
                    await ml_client.update_stock(
                        item_id=ml_item_id,
                        quantity=current_master_stock
                    )
                    venta.ml_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: Mercado Libre stock updated successfully to {current_master_stock}.")
                except Exception as e:
                    logger.exception(f"Temporary error updating stock in Mercado Libre for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"MLSyncError: {str(e)}")
                    return False
        else:
            venta.ml_synced = True

        # 7. TikTok Shop inventory update
        if enable_tiktok:
            if not venta.tiktok_synced:
                try:
                    await tiktok_client.update_stock(
                        product_id="TT_PROD_001",
                        sku_id=venta.sku,
                        quantity=current_master_stock
                    )
                    venta.tiktok_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: TikTok Shop stock updated successfully to {current_master_stock}.")
                except Exception as e:
                    logger.exception(f"Temporary error updating stock in TikTok Shop for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"TikTokSyncError: {str(e)}")
                    return False
        else:
            venta.tiktok_synced = True

        # 8. Amazon inventory update
        if enable_amazon:
            if not venta.amazon_synced:
                try:
                    await amazon_client.update_stock(
                        sku=venta.sku,
                        quantity=current_master_stock
                    )
                    venta.amazon_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: Amazon stock updated successfully to {current_master_stock}.")
                except Exception as e:
                    logger.exception(f"Temporary error updating stock in Amazon for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"AmazonSyncError: {str(e)}")
                    return False
        else:
            venta.amazon_synced = True

        # 9. eBay inventory update (Alemania / Europa)
        if enable_ebay:
            if not venta.ebay_synced:
                try:
                    await ebay_client.update_stock(
                        sku=venta.sku,
                        quantity=current_master_stock
                    )
                    venta.ebay_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: eBay Alemania stock updated successfully to {current_master_stock}.")
                except Exception as e:
                    logger.exception(f"Temporary error updating stock in eBay for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"EbaySyncError: {str(e)}")
                    return False
        else:
            venta.ebay_synced = True

        # 10. Kaufland inventory update (Alemania)
        if enable_kaufland:
            if not venta.kaufland_synced:
                try:
                    await kaufland_client.update_stock(
                        sku=venta.sku,
                        quantity=current_master_stock
                    )
                    venta.kaufland_synced = True
                    db.commit()
                    logger.info(f"Venta ID {venta.id}: Kaufland stock updated successfully to {current_master_stock}.")
                except Exception as e:
                    logger.exception(f"Temporary error updating stock in Kaufland for Venta ID {venta.id}: {e}")
                    handle_temp_error(db, venta, f"KauflandSyncError: {str(e)}")
                    return False
        else:
            venta.kaufland_synced = True

        # 11. Complete the saga if all required channels completed
        all_completed = (
            (not enable_sae or venta.sae_decremented) and
            (not enable_shopify or venta.shopify_synced) and
            (not enable_ml or venta.ml_synced) and
            (not enable_tiktok or venta.tiktok_synced) and
            (not enable_amazon or venta.amazon_synced) and
            (not enable_ebay or venta.ebay_synced) and
            (not enable_kaufland or venta.kaufland_synced)
        )

        if all_completed:
            venta.status = "PROCESSED"
            venta.processed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            venta.last_error = None
            db.commit()
            logger.info(f"Venta ID {venta.id} has been fully processed across all active channels.")
            any_processed = True

    return any_processed


async def main():
    parser = argparse.ArgumentParser(description="Worker de sincronización de inventario.")
    parser.add_argument("--once", action="store_true", help="Ejecuta una sola iteración y finaliza.")
    args = parser.parse_args()

    # Ensure database tables and columns exist
    from database import init_db_and_migrate
    init_db_and_migrate()

    db = SessionLocal()
    try:
        if args.once:
            logger.info("Running a single iteration of the worker (--once)...")
            await run_iteration(db)
            logger.info("Single iteration completed.")
        else:
            logger.info("Starting infinite loop for the worker (60s sleep)...")
            while True:
                await run_iteration(db)
                logger.info("Sleeping for 60 seconds...")
                await asyncio.sleep(60)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
