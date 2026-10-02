import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app import app
from config import settings
from ebay_client import EbayClient, EbayClientError
from kaufland_client import KauflandClient, KauflandClientError
from database import init_db_and_migrate

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db_and_migrate()

@pytest.mark.asyncio
async def test_ebay_client_mock():
    ebay = EbayClient()
    # Sin credenciales → debe rechazar con success=False (no más fake success)
    res = await ebay.test_connection()
    assert res["success"] is False
    assert res["status_code"] == 400

    # Test update stock (mock interno sigue funcionando cuando no está configurado)
    update_res = await ebay.update_stock("SKU001", 25)
    assert update_res["status"] == "SUCCESS"
    assert update_res["quantity"] == 25

    # Test get stock
    stock = await ebay.get_stock("SKU001")
    assert stock == 25

    # Test get order
    order = await ebay.get_order("EBAY_12345")
    assert order["orderId"] == "EBAY_12345"
    assert len(order["lineItems"]) > 0


@pytest.mark.asyncio
async def test_kaufland_client_mock():
    kaufland = KauflandClient()
    # Sin credenciales → debe rechazar con success=False (no más fake success)
    res = await kaufland.test_connection()
    assert res["success"] is False
    assert res["status_code"] == 400

    # Test update stock (mock interno sigue funcionando cuando no está configurado)
    update_res = await kaufland.update_stock("SKU001", 18)
    assert update_res["status"] == "SUCCESS"
    assert update_res["quantity"] == 18

    # Test get stock
    stock = await kaufland.get_stock("SKU001")
    assert stock == 18

    # Test get order
    order = await kaufland.get_order("KAUF_998877")
    assert order["id_order"] == "KAUF_998877"
    assert len(order["order_units"]) > 0


def test_webhook_ebay():
    payload = {
        "orderId": "EBAY_TEST_999",
        "lineItems": [
            {"sku": "SKU001", "quantity": 2}
        ]
    }
    response = client.post("/webhook/ebay", json=payload)
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"


def test_webhook_kaufland():
    payload = {
        "id_order": "KAUF_TEST_888",
        "order_units": [
            {"id_product": "SKU001", "amount": 3}
        ]
    }
    response = client.post("/webhook/kaufland", json=payload)
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"


def test_test_connection_endpoints():
    # Sin credenciales → ambos deben rechazar con 400, no con fake success
    res_ebay = client.post(
        "/settings/test-connection/ebay",
        headers={"X-API-Key": settings.ADMIN_API_KEY},
        json={"marketplace_id": "EBAY_DE"}
    )
    assert res_ebay.status_code == 200
    assert res_ebay.json()["success"] is False  # Correcto: sin credenciales reales

    # Test Kaufland connection endpoint
    res_kauf = client.post(
        "/settings/test-connection/kaufland",
        headers={"X-API-Key": settings.ADMIN_API_KEY},
        json={"storefront": "de"}
    )
    assert res_kauf.status_code == 200
    assert res_kauf.json()["success"] is False  # Correcto: sin credenciales reales


def test_status_includes_ebay_and_kaufland():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "ebay" in data
    assert "kaufland" in data
    assert "ebay" in data["active_channels"]
    assert "kaufland" in data["active_channels"]
    assert data["ebay"]["marketplace_id"] == "EBAY_DE"
    assert data["kaufland"]["storefront"] == "de"
