import os
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import app
from database import get_db, Base
from models import TenantProduct, TenantSettings, Venta, InventoryAuditLog, InventorySnapshot
from auth import create_access_token
from security_utils import (
    validate_safe_external_url,
    record_audit_log,
    verify_audit_log_chain,
    create_inventory_snapshot,
    rollback_inventory_snapshot,
    format_currency
)

# Test engine setup
test_engine = create_engine("sqlite:///./data/test_audit_layer.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

ADMIN_TOKEN = create_access_token({"sub": "admin", "role": "admin", "user_id": 1, "tenant_id": "empresa-a"})
VIEWER_TOKEN = create_access_token({"sub": "viewer_user", "role": "viewer", "user_id": 2, "tenant_id": "empresa-a"})
USER_TOKEN = create_access_token({"sub": "standard_user", "role": "user", "user_id": 3, "tenant_id": "empresa-b"})

ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
VIEWER_HEADERS = {"Authorization": f"Bearer {VIEWER_TOKEN}"}
USER_HEADERS = {"Authorization": f"Bearer {USER_TOKEN}"}

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def test_chained_audit_log_integrity_and_tamper_detection():
    db = TestingSessionLocal()
    user_id = 1
    
    # 1. Registrar 3 cambios encadenados
    log1 = record_audit_log(db, user_id=user_id, sku="SKU-CHAIN-1", previous_stock=10, new_stock=8, actor="system", source_channel="shopify")
    log2 = record_audit_log(db, user_id=user_id, sku="SKU-CHAIN-1", previous_stock=8, new_stock=5, actor="admin", source_channel="manual")
    log3 = record_audit_log(db, user_id=user_id, sku="SKU-CHAIN-1", previous_stock=5, new_stock=2, actor="worker", source_channel="mercadolibre")
    db.commit()
    
    # Verificar que los hashes anteriores coinciden
    assert log1.previous_hash == "0" * 64
    assert log2.previous_hash == log1.integrity_hash
    assert log3.previous_hash == log2.integrity_hash
    
    # Verificar cadena íntegra
    res = verify_audit_log_chain(db, user_id=user_id, sku="SKU-CHAIN-1")
    assert res["valid"] is True
    assert res["total_records"] == 3
    
    # Simular manipulación no autorizada / ataque en BD
    log2.previous_stock = 999  # Alterar valor sin actualizar hash
    db.commit()
    
    # La verificación matemática DEBE detectar la ruptura de la cadena
    tamper_res = verify_audit_log_chain(db, user_id=user_id, sku="SKU-CHAIN-1")
    assert tamper_res["valid"] is False
    assert tamper_res["broken_at_id"] == log2.id
    db.close()


def test_inventory_snapshot_and_rollback():
    db = TestingSessionLocal()
    user_id = 1
    
    # Crear productos iniciales
    p1 = TenantProduct(user_id=user_id, sku="RESTORE-1", nombre="Producto 1", stock=50, version=1)
    p2 = TenantProduct(user_id=user_id, sku="RESTORE-2", nombre="Producto 2", stock=100, version=1)
    db.add_all([p1, p2])
    db.commit()
    
    # Tomar instantánea
    snap = create_inventory_snapshot(db, user_id=user_id, snapshot_name="Backup de Seguridad")
    snap_id = snap.id
    
    # Modificar o corromper stock
    p1.stock = 0
    p2.stock = 999
    db.commit()
    
    # Ejecutar rollback vía API
    response = client.post(
        f"/inventory/snapshots/{snap_id}/rollback",
        headers=ADMIN_HEADERS
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["restored_count"] == 2
    
    # Verificar en BD que el stock se restauró exactamente al snapshot
    db.refresh(p1)
    db.refresh(p2)
    assert p1.stock == 50
    assert p2.stock == 100
    db.close()


def test_rbac_viewer_role_forbidden_on_mutations():
    """El rol 'viewer' tiene acceso de solo lectura y debe ser rechazado con 403 en todas las mutaciones."""
    # 1. Rollback
    res1 = client.post("/inventory/snapshots/1/rollback", headers=VIEWER_HEADERS)
    assert res1.status_code == 403

    # 2. Mantenimiento PUT
    res2 = client.put("/settings/maintenance", headers=VIEWER_HEADERS, json={"maintenance_mode": True})
    assert res2.status_code == 403

    # 3. DLQ Replay
    res3 = client.post("/cola/dlq/1/replay", headers=VIEWER_HEADERS)
    assert res3.status_code == 403


def test_maintenance_mode_and_queue_hold():
    # Activar modo mantenimiento
    res_toggle = client.put("/settings/maintenance", headers=ADMIN_HEADERS, json={"maintenance_mode": True})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["maintenance_mode"] is True

    # Comprobar GET /settings/maintenance
    res_get = client.get("/settings/maintenance", headers=ADMIN_HEADERS)
    assert res_get.status_code == 200
    assert res_get.json()["maintenance_mode"] is True

    # Desactivar modo mantenimiento
    res_toggle_off = client.put("/settings/maintenance", headers=ADMIN_HEADERS, json={"maintenance_mode": False})
    assert res_toggle_off.status_code == 200
    assert res_toggle_off.json()["maintenance_mode"] is False


def test_dlq_replay_endpoint():
    db = TestingSessionLocal()
    # Insertar una venta fallida en DLQ (status FAILED, attempts 5)
    dlq_venta = Venta(
        external_id="dlq_test_101",
        origen="shopify",
        sku="SKU-DLQ-01",
        cantidad=1,
        status="FAILED",
        attempts=5,
        last_error="Exceeded max retries (5). Moved to Dead Letter Queue"
    )
    db.add(dlq_venta)
    db.commit()
    venta_id = dlq_venta.id
    db.close()

    # Listar DLQ
    res_list = client.get("/cola/dlq", headers=ADMIN_HEADERS)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["id"] == venta_id

    # Ejecutar replay
    res_replay = client.post(f"/cola/dlq/{venta_id}/replay", headers=ADMIN_HEADERS)
    assert res_replay.status_code == 200
    assert res_replay.json()["success"] is True
    assert res_replay.json()["new_status"] == "PENDING"

    # Verificar que ya no aparece en DLQ
    res_list_after = client.get("/cola/dlq", headers=ADMIN_HEADERS)
    assert len(res_list_after.json()) == 0


def test_ssrf_validator_defenses():
    """Valida el bloqueo de IPs privadas, loopback, link-local y cloud metadata."""
    # Bloqueos esperados
    with pytest.raises(ValueError):
        validate_safe_external_url("http://127.0.0.1:8000/admin")
    with pytest.raises(ValueError):
        validate_safe_external_url("https://127.0.0.1:8000/admin")
    with pytest.raises(ValueError):
        validate_safe_external_url("https://localhost/secret")
    with pytest.raises(ValueError):
        validate_safe_external_url("https://169.254.169.254/latest/meta-data")
    with pytest.raises(ValueError):
        validate_safe_external_url("https://10.0.0.5/internal")
    with pytest.raises(ValueError):
        validate_safe_external_url("https://192.168.1.100:8080/api")

    # Dominios públicos y legítimos permitidos
    assert bool(validate_safe_external_url("https://mystore.myshopify.com/admin/api")) is True
    assert bool(validate_safe_external_url("https://api.mercadolibre.com/items")) is True


def test_exact_decimal_precision():
    """Prueba que los cálculos de precios o monedas no sufran deriva de punto flotante IEEE 754."""
    # 0.1 + 0.2 en float da 0.30000000000000004
    f_sum = 0.1 + 0.2
    assert str(f_sum) != "0.3"
    
    # Con format_currency debe redondear y formatear de manera exacta
    assert format_currency(f_sum) == "0.30"
    assert format_currency("199.995") == "200.00"
    assert format_currency(Decimal("10.505")) == "10.51"
