import pytest
import json
import hmac
import hashlib
import base64
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db, Base
from models import Venta
from config import settings
from sae_mock import ProductNotFoundError

# Setup SQLite database for endpoint tests
test_engine = create_engine("sqlite:///./data/test_endpoints.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply the dependency override
app.dependency_overrides[get_db] = override_get_db

from auth import create_access_token
AUTH_HEADER_JWT = {"Authorization": f"Bearer {create_access_token({'sub': 'admin', 'role': 'admin'})}"}

# Create the TestClient instance
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    # Setup: Create all tables before each test
    Base.metadata.create_all(bind=test_engine)
    yield
    # Teardown: Drop all tables after each test
    Base.metadata.drop_all(bind=test_engine)

def calculate_shopify_hmac(payload: dict, secret: str) -> str:
    raw_body = json.dumps(payload).encode("utf-8")
    digest = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode('utf-8')

# --- TEST CASES ---

def test_webhook_shopify_valid_hmac():
    payload = {
        "id": 999999,
        "line_items": [
            {
                "id": 88888,
                "sku": "SKU001",
                "quantity": 2
            }
        ]
    }
    
    # Use config secret to calculate valid signature
    secret = settings.SHOPIFY_API_SECRET or "shpss_xxxx"
    raw_body = json.dumps(payload).encode("utf-8")
    hmac_header = calculate_shopify_hmac(payload, secret)
    
    response = client.post(
        "/webhook/shopify",
        content=raw_body,
        headers={"X-Shopify-Hmac-Sha256": hmac_header}
    )
    
    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}
    
    # Verify DB state
    db = TestingSessionLocal()
    venta = db.query(Venta).filter(Venta.external_id == "999999_88888").first()
    db.close()
    
    assert venta is not None
    assert venta.origen == "shopify"
    assert venta.sku == "SKU001"
    assert venta.cantidad == 2
    assert venta.status == "PENDING"
    assert venta.sae_decremented is False
    assert venta.shopify_synced is False
    assert venta.ml_synced is False

def test_webhook_shopify_invalid_hmac():
    payload = {
        "id": 999999,
        "line_items": [
            {
                "id": 88888,
                "sku": "SKU001",
                "quantity": 2
            }
        ]
    }
    
    response = client.post(
        "/webhook/shopify",
        json=payload,
        headers={"X-Shopify-Hmac-Sha256": "invalid_signature"}
    )
    
    assert response.status_code == 401
    assert "Firma HMAC inválida" in response.json()["detail"]
    
    # Verify DB state (no entry should be created)
    db = TestingSessionLocal()
    count = db.query(Venta).count()
    db.close()
    assert count == 0

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_ml_valid(mock_get_order):
    # Mocking order retrieval from ML
    mock_get_order.return_value = {
        "id": 12345,
        "order_items": [
            {
                "item": {
                    "id": "ml_item_111",
                    "seller_sku": "SKU001"
                },
                "quantity": 3
            }
        ]
    }
    
    payload = {
        "resource": "/orders/12345",
        "user_id": settings.ML_USER_ID,
        "topic": "orders"
    }
    
    response = client.post("/webhook/ml", json=payload)
    
    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}
    mock_get_order.assert_called_once_with("12345")
    
    # Verify DB state
    db = TestingSessionLocal()
    venta = db.query(Venta).filter(Venta.external_id == "12345_ml_item_111").first()
    db.close()
    
    assert venta is not None
    assert venta.origen == "mercadolibre"
    assert venta.sku == "SKU001"
    assert venta.cantidad == 3
    assert venta.status == "PENDING"

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_duplicate(mock_get_order):
    # Test duplicated webhooks for both Shopify and Mercado Libre
    
    # 1. Shopify Duplication Test
    shopify_payload = {
        "id": 222222,
        "line_items": [
            {
                "id": 33333,
                "sku": "SKU001",
                "quantity": 1
            }
        ]
    }
    secret = settings.SHOPIFY_API_SECRET or "shpss_xxxx"
    raw_body = json.dumps(shopify_payload).encode("utf-8")
    hmac_header = calculate_shopify_hmac(shopify_payload, secret)
    
    # Send Shopify webhook first time
    res_sh_1 = client.post(
        "/webhook/shopify",
        content=raw_body,
        headers={"X-Shopify-Hmac-Sha256": hmac_header}
    )
    assert res_sh_1.status_code == 202
    
    # Send Shopify webhook second time
    res_sh_2 = client.post(
        "/webhook/shopify",
        content=raw_body,
        headers={"X-Shopify-Hmac-Sha256": hmac_header}
    )
    assert res_sh_2.status_code == 202
    
    # Verify Shopify entry in DB is unique
    db = TestingSessionLocal()
    shopify_ventas = db.query(Venta).filter(Venta.origen == "shopify", Venta.external_id == "222222_33333").all()
    assert len(shopify_ventas) == 1
    
    # 2. Mercado Libre Duplication Test
    mock_get_order.return_value = {
        "id": 55555,
        "order_items": [
            {
                "item": {
                    "id": "ml_item_222",
                    "seller_sku": "SKU002"
                },
                "quantity": 1
            }
        ]
    }
    
    ml_payload = {
        "resource": "/orders/55555",
        "user_id": settings.ML_USER_ID,
        "topic": "orders"
    }
    
    # Send ML webhook first time
    res_ml_1 = client.post("/webhook/ml", json=ml_payload)
    assert res_ml_1.status_code == 202
    
    # Send ML webhook second time
    res_ml_2 = client.post("/webhook/ml", json=ml_payload)
    assert res_ml_2.status_code == 202
    
    # Verify ML entry in DB is unique
    ml_ventas = db.query(Venta).filter(Venta.origen == "mercadolibre", Venta.external_id == "55555_ml_item_222").all()
    assert len(ml_ventas) == 1
    db.close()

def test_endpoint_cola():
    # Insert multiple sales into testing database to test filtering logic
    db = TestingSessionLocal()
    
    # 1. PENDING, 0 attempts (should list)
    v1 = Venta(external_id="1", origen="shopify", sku="SKU001", cantidad=1, status="PENDING", attempts=0)
    # 2. PROCESSING, 1 attempt, updated 120s ago (should list, backoff delay of 60s passed)
    v2 = Venta(external_id="2", origen="shopify", sku="SKU002", cantidad=1, status="PROCESSING", attempts=1, updated_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=120))
    # 3. PROCESSING, 1 attempt, updated 10s ago (should NOT list, backoff delay of 60s not passed yet)
    v3 = Venta(external_id="3", origen="shopify", sku="SKU003", cantidad=1, status="PROCESSING", attempts=1, updated_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=10))
    # 4. PROCESSED (should NOT list)
    v4 = Venta(external_id="4", origen="shopify", sku="SKU004", cantidad=1, status="PROCESSED", attempts=1)
    # 5. FAILED, 5 attempts (should NOT list)
    v5 = Venta(external_id="5", origen="shopify", sku="SKU005", cantidad=1, status="FAILED", attempts=5)
    
    db.add_all([v1, v2, v3, v4, v5])
    db.commit()
    db.close()
    
    response = client.get("/cola")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    
    returned_external_ids = [item["external_id"] for item in data]
    assert "1" in returned_external_ids
    assert "2" in returned_external_ids
    assert "3" not in returned_external_ids
    assert "4" not in returned_external_ids
    assert "5" not in returned_external_ids
    
    # Verify security: no credentials or tokens should be exposed in keys
    sensitive_substrings = ["token", "secret", "password", "key", "cred"]
    for item in data:
        for key in item.keys():
            # external_id is allowed and required, check other keys for credential keywords
            if key != "external_id":
                assert not any(sub in key.lower() for sub in sensitive_substrings), f"Sensitive key '{key}' found in response"

@patch("main.sae_repo.get_product")
@patch("main.sae_repo.get_stock")
@patch("main.shopify_client.get_stock", new_callable=AsyncMock)
@patch("main.ml_client.get_stock", new_callable=AsyncMock)
def test_reconcile_sku_match(mock_ml_stock, mock_shopify_stock, mock_sae_stock, mock_sae_product):
    mock_sae_product.return_value = {
        "sku": "SKU001",
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/123",
        "shopify_location_id": "gid://shopify/Location/456",
        "ml_item_id": "MLM123"
    }
    mock_sae_stock.return_value = 10
    mock_shopify_stock.return_value = 10
    mock_ml_stock.return_value = 10
    
    response = client.post("/reconcile/SKU001")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "SKU001"
    assert data["status"] == "MATCH"
    assert data["sae_stock"] == 10
    assert data["shopify_stock"] == 10
    assert data["ml_stock"] == 10

@patch("main.sae_repo.get_product")
@patch("main.sae_repo.get_stock")
@patch("main.shopify_client.get_stock", new_callable=AsyncMock)
@patch("main.ml_client.get_stock", new_callable=AsyncMock)
def test_reconcile_sku_desync(mock_ml_stock, mock_shopify_stock, mock_sae_stock, mock_sae_product):
    mock_sae_product.return_value = {
        "sku": "SKU001",
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/123",
        "shopify_location_id": "gid://shopify/Location/456",
        "ml_item_id": "MLM123"
    }
    mock_sae_stock.return_value = 10
    mock_shopify_stock.return_value = 8
    mock_ml_stock.return_value = 10
    
    response = client.post("/reconcile/SKU001")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "SKU001"
    assert data["status"] == "DESYNC"
    assert data["sae_stock"] == 10
    assert data["shopify_stock"] == 8
    assert data["ml_stock"] == 10

@patch("main.sae_repo.get_product")
def test_reconcile_sku_not_found(mock_sae_product):
    mock_sae_product.side_effect = ProductNotFoundError("SKU not found")
    
    response = client.post("/reconcile/SKU_MISSING")
    assert response.status_code == 404
    assert "no encontrado" in response.json()["detail"]

@patch("main.sae_repo.get_all_products")
def test_get_inventory(mock_get_all):
    mock_get_all.return_value = [
        {"sku": "SKU001", "nombre": "Laptop", "stock": 10}
    ]
    response = client.get("/inventory")
    assert response.status_code == 200
    assert response.json() == [
        {"sku": "SKU001", "nombre": "Laptop", "stock": 10}
    ]
    mock_get_all.assert_called_once()

@patch("main.sae_repo.get_product")
def test_get_inventory_item_success(mock_get_product):
    mock_get_product.return_value = {
        "sku": "SKU001", "nombre": "Laptop", "stock": 10
    }
    response = client.get("/inventory/SKU001")
    assert response.status_code == 200
    assert response.json() == {
        "sku": "SKU001", "nombre": "Laptop", "stock": 10
    }
    mock_get_product.assert_called_once_with("SKU001")

@patch("main.sae_repo.get_product")
def test_get_inventory_item_not_found(mock_get_product):
    mock_get_product.side_effect = ProductNotFoundError("Product not found")
    response = client.get("/inventory/SKU_MISSING")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

def test_get_sales():
    db = TestingSessionLocal()
    # Insert test sales
    v1 = Venta(external_id="sale1", origen="shopify", sku="SKU001", cantidad=1, status="PROCESSED", created_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1))
    v2 = Venta(external_id="sale2", origen="mercadolibre", sku="SKU002", cantidad=2, status="PENDING", created_at=datetime.now(timezone.utc).replace(tzinfo=None))
    db.add_all([v1, v2])
    db.commit()
    db.close()

    response = client.get("/sales")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["external_id"] == "sale2"
    assert data[1]["external_id"] == "sale1"

def test_get_status():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "sae" in data
    assert "shopify" in data
    assert "mercadolibre" in data
    assert data["sae"]["status"] in ("mock", "production")
    assert data["shopify"]["status"] in ("connected", "connected_mock")
    assert data["mercadolibre"]["status"] in ("connected", "connected_mock")


def test_get_catalog_products():
    response = client.get("/catalog/products")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@patch("main.shopify_client.bulk_update_attributes", new_callable=AsyncMock)
def test_bulk_update_catalog(mock_bulk_update):
    mock_bulk_update.return_value = {
        "success": True,
        "updated_count": 1,
        "message": "1 productos actualizados con especificaciones para TikTok Shop",
        "details": [{"id": "gid://shopify/Product/10329513132321", "status": "updated"}]
    }
    payload = {
        "product_ids": ["gid://shopify/Product/10329513132321"],
        "brand": "Haros Joyeria",
        "weight": 250.0,
        "weight_unit": "GRAMS",
        "length": 15.0,
        "width": 10.0,
        "height": 5.0,
        "warranty_type": "Garantía del vendedor",
        "warranty_period": "30 días",
        "target_audience": "Adultos"
    }
    response = client.post("/catalog/bulk-update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["updated_count"] >= 1
    assert "actualizados" in data["message"]


# --- VULNERABILIDAD #5: WEBHOOK MERCADO LIBRE VALIDACIÓN DE USER_ID Y FIRMA ---

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_ml_user_id_mismatch_rejected(mock_get_order):
    """Vulnerabilidad #5: Webhook ML con user_id no coincidente debe ser rechazado con 403."""
    payload = {
        "resource": "/orders/98765",
        "user_id": 999999999,  # No coincide con settings.ML_USER_ID (123456789)
        "topic": "orders"
    }
    res = client.post("/webhook/ml", json=payload)
    assert res.status_code == 403
    assert "user_id no coincide" in res.json()["detail"]

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_ml_invalid_user_id_rejected(mock_get_order):
    """Vulnerabilidad #5: Webhook ML con user_id inválido (<= 0 o texto no numérico) debe dar 403."""
    # user_id negativo
    res_neg = client.post("/webhook/ml", json={
        "resource": "/orders/98765",
        "user_id": -10,
        "topic": "orders"
    })
    assert res_neg.status_code == 403

    # user_id cero
    res_zero = client.post("/webhook/ml", json={
        "resource": "/orders/98765",
        "user_id": 0,
        "topic": "orders"
    })
    assert res_zero.status_code == 403

    # user_id string no numérico
    res_str = client.post("/webhook/ml", json={
        "resource": "/orders/98765",
        "user_id": "not_a_valid_number",
        "topic": "orders"
    })
    assert res_str.status_code == 403

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_ml_signature_verification(mock_get_order):
    """Vulnerabilidad #5: Validación de cabecera X-Signature y secret token cuando está configurado."""
    mock_get_order.return_value = {
        "id": 88888,
        "order_items": [{"item": {"id": "item_2", "seller_sku": "SKU001"}, "quantity": 1}]
    }
    secret = "secret-ml-webhook-key-999"
    payload = {
        "resource": "/orders/88888",
        "user_id": settings.ML_USER_ID,
        "topic": "orders"
    }
    raw_body = json.dumps(payload).encode("utf-8")

    with patch.object(settings, "ML_WEBHOOK_SECRET", secret):
        # 1. Sin firma/token -> 401
        res_none = client.post("/webhook/ml", content=raw_body, headers={"Content-Type": "application/json"})
        assert res_none.status_code == 401

        # 2. Con firma/token erróneo -> 401
        res_bad = client.post(
            "/webhook/ml", 
            content=raw_body, 
            headers={"Content-Type": "application/json", "X-Signature": "wrong-secret"}
        )
        assert res_bad.status_code == 401

        # 3. Con Secret Token directo correcto -> 202
        res_token_ok = client.post(
            "/webhook/ml", 
            content=raw_body, 
            headers={"Content-Type": "application/json", "X-Signature": secret}
        )
        assert res_token_ok.status_code == 202

        # 4. Con firma HMAC-SHA256 válida del raw body -> 202
        valid_hmac = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        res_hmac_ok = client.post(
            "/webhook/ml", 
            content=raw_body, 
            headers={"Content-Type": "application/json", "X-Signature": valid_hmac}
        )
        assert res_hmac_ok.status_code == 202

        # 5. Con formato estándar ML: "ts=...,v1=..." -> 202
        ts = "1725200000"
        h_ts = hmac.new(
            secret.encode("utf-8"),
            f"ts:{ts};raw:{raw_body.decode('utf-8')}".encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        sig_header = f"ts={ts},v1={h_ts}"
        res_ts_ok = client.post(
            "/webhook/ml",
            content=raw_body,
            headers={"Content-Type": "application/json", "X-Signature": sig_header}
        )
        assert res_ts_ok.status_code == 202


# --- VULNERABILIDAD #12: SANITIZACIÓN DE MENSAJES DE ERROR HTTP ---

@patch("main.ml_client.get_order", new_callable=AsyncMock)
def test_webhook_ml_exception_sanitization(mock_get_order):
    """Vulnerabilidad #12: Errores en webhook ML no deben filtrar excepciones crudas."""
    mock_get_order.side_effect = Exception("Connection failed to 10.0.0.5:5432 with password=SuperSecret! /app/secrets.py:42")
    payload = {
        "resource": "/orders/12345",
        "user_id": settings.ML_USER_ID,
        "topic": "orders"
    }
    res = client.post("/webhook/ml", json=payload)
    assert res.status_code == 500
    detail = res.json()["detail"]
    assert detail == "Error al procesar la orden externa. Consulte los registros del sistema."
    assert "SuperSecret" not in detail
    assert "10.0.0.5" not in detail
    assert "secrets.py" not in detail

@patch("main.sae_repo.get_product")
def test_reconcile_sku_exception_sanitization(mock_get_product):
    """Vulnerabilidad #12: Error interno en reconcile_sku no debe filtrar excepciones crudas."""
    mock_get_product.side_effect = Exception("Database disk image is malformed at /data/database.db, schema 'ventas'")
    res = client.post("/reconcile/SKU001", headers=AUTH_HEADER_JWT)
    assert res.status_code == 500
    detail = res.json()["detail"]
    assert detail == "Error interno al consultar el inventario local. Consulte los registros del sistema."
    assert "malformed" not in detail
    assert "/data/database.db" not in detail

@patch("main.sae_repo.get_product")
@patch("main.sae_repo.get_stock")
def test_reconcile_sku_stock_exception_sanitization(mock_get_stock, mock_get_product):
    """Vulnerabilidad #12: Error interno al obtener stock en reconcile_sku no debe filtrar excepciones crudas."""
    mock_get_product.return_value = {
        "sku": "SKU001",
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/123",
        "shopify_location_id": "gid://shopify/Location/456",
        "ml_item_id": "MLM123"
    }
    mock_get_stock.side_effect = Exception("Internal timeout during sqlite cursor fetch")
    res = client.post("/reconcile/SKU001", headers=AUTH_HEADER_JWT)
    assert res.status_code == 500
    detail = res.json()["detail"]
    assert detail == "Error interno al obtener stock del inventario local. Consulte los registros del sistema."
    assert "sqlite" not in detail
    assert "cursor" not in detail


def test_webhook_tiktok():
    """Webhook de TikTok Shop registra la venta con status PENDING."""
    payload = {
        "order_id": "TT_TEST_999",
        "data": {"order_id": "TT_TEST_999"}
    }
    res = client.post("/webhook/tiktok", json=payload)
    assert res.status_code == 202
    assert res.json() == {"status": "accepted"}


def test_webhook_amazon():
    """Webhook de Amazon registra la venta con status PENDING."""
    payload = {
        "AmazonOrderId": "AMZ_TEST_888"
    }
    res = client.post("/webhook/amazon", json=payload)
    assert res.status_code == 202
    assert res.json() == {"status": "accepted"}


def test_download_inventory_template():
    """Descarga de plantilla CSV devuelve status 200 y encabezados correctos."""
    res = client.get("/inventory/template")
    assert res.status_code == 200
    assert "SKU,Nombre,Stock" in res.text


def test_import_inventory_csv():
    """Importación masiva mediante archivo CSV."""
    csv_data = "SKU,Nombre,Stock\nIMPORT-001,Zapato Caballero,40\nIMPORT-002,Tenis Dama,18\n"
    files = {"file": ("catalogo.csv", csv_data.encode("utf-8"), "text/csv")}
    res = client.post("/inventory/import-file", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_rows"] == 2
    assert data["created_count"] == 2

    # Verificar que los productos ahora están en /inventory
    inv_res = client.get("/inventory")
    assert inv_res.status_code == 200
    skus = [p["sku"] for p in inv_res.json()]
    assert "IMPORT-001" in skus
    assert "IMPORT-002" in skus


def test_import_inventory_xlsx():
    """Importación masiva mediante archivo Excel (.xlsx)."""
    import openpyxl
    import io

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Código", "Descripción", "Existencias"])
    ws.append(["XLSX-101", "Gafas de Sol Polarizadas", 50])
    ws.append(["XLSX-102", "Reloj Deportivo Resistente", 30])
    
    excel_stream = io.BytesIO()
    wb.save(excel_stream)
    excel_stream.seek(0)

    files = {"file": ("inventario.xlsx", excel_stream.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = client.post("/inventory/import-file", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_rows"] == 2
    assert data["created_count"] == 2





