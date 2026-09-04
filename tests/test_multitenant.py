import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db, Base
import models

test_engine = create_engine("sqlite:///./data/test_multitenant.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def test_multitenant_isolation_karla_and_lyvy():
    """
    Verifica que dos clientes independientes (Karla y Lyvy) tengan sus credenciales
    e inventarios completamente aislados y que ninguna vea los datos de la otra.
    """
    uid = uuid.uuid4().hex[:6]
    u_karla = f"karla_{uid}"
    u_lyvy = f"lyvy_{uid}"

    # 1. Registro de Karla
    res_k = client.post("/auth/register", json={
        "username": u_karla,
        "email": f"{u_karla}@boutique.mx",
        "password": "Password123!",
        "tenant_id": u_karla
    })
    assert res_k.status_code == 201
    karla_token = res_k.json()["access_token"]
    assert karla_token is not None

    # 2. Karla configura su tienda de Shopify
    headers_k = {"Authorization": f"Bearer {karla_token}"}
    res_k_save = client.post("/settings", json={
        "SHOP_DOMAIN": "karla-boutique.myshopify.com",
        "SHOPIFY_ACCESS_TOKEN": "shpat_karla_11111",
        "INVENTARIO_PRINCIPAL": "shopify",
        "ENABLE_SAE": False,
        "ENABLE_SHOPIFY": True
    }, headers=headers_k)
    assert res_k_save.status_code == 200

    # 3. Karla consulta sus configuraciones -> Debe ver su dominio
    res_k_get = client.get("/settings", headers=headers_k)
    assert res_k_get.status_code == 200
    assert res_k_get.json()["SHOP_DOMAIN"] == "karla-boutique.myshopify.com"
    assert res_k_get.json()["ENABLE_SAE"] is False

    # 4. Registro de Lyvy
    res_l = client.post("/auth/register", json={
        "username": u_lyvy,
        "email": f"{u_lyvy}@tienda.mx",
        "password": "Password123!",
        "tenant_id": u_lyvy
    })
    assert res_l.status_code == 201
    lyvy_token = res_l.json()["access_token"]
    assert lyvy_token is not None

    # 5. Lyvy consulta sus configuraciones -> NO DEBE VER la tienda de Karla
    headers_l = {"Authorization": f"Bearer {lyvy_token}"}
    res_l_get = client.get("/settings", headers=headers_l)
    assert res_l_get.status_code == 200
    assert res_l_get.json()["SHOP_DOMAIN"] != "karla-boutique.myshopify.com"
    assert res_l_get.json()["SHOP_DOMAIN"] == ""

    # 6. Lyvy configura su propia tienda de Shopify
    res_l_save = client.post("/settings", json={
        "SHOP_DOMAIN": "lyvy-shoes.myshopify.com",
        "SHOPIFY_ACCESS_TOKEN": "shpat_lyvy_22222",
        "INVENTARIO_PRINCIPAL": "shopify",
        "ENABLE_SAE": False
    }, headers=headers_l)
    assert res_l_save.status_code == 200

    # 7. Lyvy ahora ve su propia tienda
    res_l_get2 = client.get("/settings", headers=headers_l)
    assert res_l_get2.json()["SHOP_DOMAIN"] == "lyvy-shoes.myshopify.com"

    # 8. Verificamos que la tienda de Karla sigue intacta
    res_k_check = client.get("/settings", headers=headers_k)
    assert res_k_check.json()["SHOP_DOMAIN"] == "karla-boutique.myshopify.com"
    assert res_k_check.json()["SHOP_DOMAIN"] != "lyvy-shoes.myshopify.com"
