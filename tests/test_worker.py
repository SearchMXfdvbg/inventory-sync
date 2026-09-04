import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import Venta
from config import settings
import worker
from sae_mock import ProductNotFoundError, InsufficientStockError

@pytest.fixture
def db_session():
    # Setup an in-memory SQLite database for test execution isolation
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()

@pytest.mark.asyncio
async def test_run_iteration_no_sales(db_session):
    # With no sales in the db, run_iteration should do nothing and return False
    res = await worker.run_iteration(db_session)
    assert res is False

@pytest.mark.asyncio
@patch("worker.sae")
@patch("worker.shopify_client")
@patch("worker.ml_client")
async def test_run_iteration_happy_path(mock_ml, mock_shopify, mock_sae, db_session):
    # Setup mocks
    mock_sae.get_product.return_value = {
        "sku": "SKU001",
        "stock": 10,
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/111",
        "ml_item_id": "MLM111"
    }
    mock_sae.decrement_stock.return_value = 8
    mock_sae.get_stock.return_value = 8
    
    mock_shopify.adjust_inventory = AsyncMock(return_value={"data": "success"})
    mock_ml.update_stock = AsyncMock(return_value={"id": "MLM111"})

    # Insert a pending sale
    venta = Venta(
        external_id="ext-001",
        origen="shopify",
        sku="SKU001",
        cantidad=2,
        status="PENDING",
        attempts=0
    )
    db_session.add(venta)
    db_session.commit()

    res = await worker.run_iteration(db_session)
    
    assert res is True
    
    # Refresh sale from db
    db_session.refresh(venta)
    assert venta.status == "PROCESSED"
    assert venta.sae_decremented is True
    assert venta.shopify_synced is True
    assert venta.ml_synced is True
    assert venta.attempts == 1
    assert venta.last_error is None
    assert venta.processed_at is not None

    # Verify calls
    mock_sae.get_product.assert_called_once_with("SKU001")
    mock_sae.decrement_stock.assert_called_once_with("SKU001", 2)
    mock_shopify.adjust_inventory.assert_called_once_with(
        inventory_item_id="gid://shopify/InventoryItem/111",
        location_id=settings.SHOPIFY_LOCATION_ID,
        delta=-2,
        idempotency_key="shopify_sale_shopify_ext-001",
        reference_uri="sale://shopify/ext-001"
    )
    mock_ml.update_stock.assert_called_once_with(item_id="MLM111", quantity=8)

@pytest.mark.asyncio
@patch("worker.sae")
async def test_run_iteration_product_not_found(mock_sae, db_session):
    mock_sae.get_product.side_effect = ProductNotFoundError("SKU not found")

    venta = Venta(
        external_id="ext-002",
        origen="shopify",
        sku="SKU_MISSING",
        cantidad=1,
        status="PENDING",
        attempts=0
    )
    db_session.add(venta)
    db_session.commit()

    res = await worker.run_iteration(db_session)
    assert res is True  # We processed it to completion (FAILED status)

    db_session.refresh(venta)
    assert venta.status == "FAILED"
    assert "ProductNotFoundError" in venta.last_error
    assert venta.attempts == 1

@pytest.mark.asyncio
@patch("worker.sae")
async def test_run_iteration_insufficient_stock(mock_sae, db_session):
    mock_sae.get_product.return_value = {
        "sku": "SKU001",
        "stock": 1,
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/111",
        "ml_item_id": "MLM111"
    }
    mock_sae.decrement_stock.side_effect = InsufficientStockError("Insufficient stock")

    venta = Venta(
        external_id="ext-003",
        origen="shopify",
        sku="SKU001",
        cantidad=5,
        status="PENDING",
        attempts=0
    )
    db_session.add(venta)
    db_session.commit()

    res = await worker.run_iteration(db_session)
    assert res is True  # Processed to FAILED

    db_session.refresh(venta)
    assert venta.status == "FAILED"
    assert "InsufficientStockError" in venta.last_error
    assert venta.sae_decremented is False
    assert venta.attempts == 1

@pytest.mark.asyncio
@patch("worker.sae")
@patch("worker.shopify_client")
async def test_run_iteration_shopify_temporary_failure(mock_shopify, mock_sae, db_session):
    mock_sae.get_product.return_value = {
        "sku": "SKU001",
        "stock": 10,
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/111",
        "ml_item_id": "MLM111"
    }
    mock_sae.decrement_stock.return_value = 8
    
    # Shopify adjustment fails
    mock_shopify.adjust_inventory.side_effect = Exception("Shopify timeout")

    venta = Venta(
        external_id="ext-004",
        origen="shopify",
        sku="SKU001",
        cantidad=2,
        status="PENDING",
        attempts=0
    )
    db_session.add(venta)
    db_session.commit()

    res = await worker.run_iteration(db_session)
    assert res is False  # Stopped due to temporary error

    db_session.refresh(venta)
    assert venta.status == "PROCESSING"  # Stays PROCESSING
    assert venta.sae_decremented is True  # SAE was successfully decremented and saved!
    assert venta.shopify_synced is False
    assert venta.attempts == 1
    assert "ShopifySyncError" in venta.last_error

@pytest.mark.asyncio
@patch("worker.sae")
@patch("worker.shopify_client")
@patch("worker.ml_client")
async def test_run_iteration_ml_temporary_failure(mock_ml, mock_shopify, mock_sae, db_session):
    mock_sae.get_product.return_value = {
        "sku": "SKU001",
        "stock": 10,
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/111",
        "ml_item_id": "MLM111"
    }
    # Pre-simulate that SAE and Shopify are already done (to verify progress resumption)
    venta = Venta(
        external_id="ext-005",
        origen="shopify",
        sku="SKU001",
        cantidad=2,
        status="PROCESSING",
        sae_decremented=True,
        shopify_synced=True,
        ml_synced=False,
        attempts=1,
        updated_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=120)
    )
    db_session.add(venta)
    db_session.commit()

    mock_sae.get_stock.return_value = 8
    mock_ml.update_stock.side_effect = Exception("ML is down")

    res = await worker.run_iteration(db_session)
    assert res is False  # Stopped due to temporary error

    db_session.refresh(venta)
    assert venta.status == "PROCESSING"
    assert venta.sae_decremented is True
    assert venta.shopify_synced is True
    assert venta.ml_synced is False
    assert venta.attempts == 2  # Incremented to 2
    assert "MLSyncError" in venta.last_error

@pytest.mark.asyncio
async def test_run_iteration_backoff_delay(db_session):
    # Create a sale in status PROCESSING, attempt = 1, updated recently (seconds ago)
    venta = Venta(
        external_id="ext-006",
        origen="shopify",
        sku="SKU001",
        cantidad=2,
        status="PROCESSING",
        attempts=1,
        updated_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=10) # 10 seconds ago
    )
    db_session.add(venta)
    db_session.commit()

    # Since RETRY_BASE_DELAY = 60, and attempts = 1, delay is 60 * 2^0 = 60 seconds.
    # 10 seconds elapsed < 60 seconds delay, so it should NOT be ready yet.
    res = await worker.run_iteration(db_session)
    assert res is False

    # Now manually set updated_at to 70 seconds ago (which is > 60 seconds delay)
    venta.updated_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=70)
    db_session.commit()

    # It should be picked up now. We patch sae to throw an exception to verify it gets processed.
    with patch("worker.sae") as mock_sae:
        mock_sae.get_product.side_effect = Exception("Temp error")
        res = await worker.run_iteration(db_session)
        assert res is False
        
        db_session.refresh(venta)
        assert venta.attempts == 2

@pytest.mark.asyncio
@patch("worker.sae")
async def test_run_iteration_max_attempts(mock_sae, db_session):
    # A sale with 4 attempts. A failure will increment attempts to 5 and mark status as FAILED.
    venta = Venta(
        external_id="ext-007",
        origen="shopify",
        sku="SKU001",
        cantidad=2,
        status="PROCESSING",
        attempts=4,
        updated_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=600)  # long time ago
    )
    db_session.add(venta)
    db_session.commit()

    mock_sae.get_product.side_effect = Exception("Permanent temporary failure")

    res = await worker.run_iteration(db_session)
    assert res is False  # Still returns False as it ended in a temporary error style, but let's check DB

    db_session.refresh(venta)
    assert venta.attempts == 5
    assert venta.status == "FAILED"
    assert "Exceeded max retries" in venta.last_error
