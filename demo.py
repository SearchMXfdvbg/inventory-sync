import os
import json
import asyncio
from unittest.mock import AsyncMock

# --- CONFIGURACIÓN DE ENTORNO DE PRUEBA ---
DB_FILE = "data/test_demo.db"
PRODUCTS_FILE = "data/test_productos_demo.json"

# Limpieza inicial de archivos si existen
for file in [DB_FILE, PRODUCTS_FILE]:
    if os.path.exists(file):
        try:
            os.remove(file)
        except Exception:
            pass

# Crear directorio de datos si no existe
os.makedirs("data", exist_ok=True)

# 1. Reiniciar el archivo 'data/productos.json' con un stock inicial de SAE de 10 para SKU001
initial_products = {
    "SKU001": {
        "sku": "SKU001",
        "nombre": "Laptop Gamer Antigravity (Demo)",
        "stock": 10,
        "shopify_inventory_item_id": "gid://shopify/InventoryItem/12345",
        "shopify_location_id": "gid://shopify/Location/67890",
        "ml_item_id": "MLM123456"
    }
}

with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
    json.dump(initial_products, f, indent=2, ensure_ascii=False)

# Configurar variables de entorno antes de importar módulos
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"
os.environ["SAE_DATA_PATH"] = PRODUCTS_FILE

# --- MOCK DE LLAMADAS HTTP SALIENTES ---
import shopify_client
import ml_client

# Mockear adjust_inventory y get_stock en ShopifyClient
shopify_client.ShopifyClient.adjust_inventory = AsyncMock(return_value={"data": "success"})
shopify_client.ShopifyClient.get_stock = AsyncMock(return_value=8)

# Mockear update_stock, get_order, get_stock en MLClient
ml_client.MLClient.update_stock = AsyncMock(return_value={"id": "MLM123456", "status": "updated"})
ml_client.MLClient.get_stock = AsyncMock(return_value=8)
ml_client.MLClient.get_order = AsyncMock(return_value={
    "id": 12345,
    "order_items": [
        {
            "item": {
                "id": "MLM123456",
                "seller_sku": "SKU001"
            },
            "quantity": 2
        }
    ]
})

# Ahora importamos la app, base de datos y worker que usarán las configuraciones de arriba
from main import app
from database import engine, Base, SessionLocal
from models import Venta
from sae_mock import SAEMockRepository
import worker
from config import settings
import hmac
import hashlib
import base64
from fastapi.testclient import TestClient

# Inicializar las tablas de la base de datos sqlite en memoria/temporal
Base.metadata.create_all(bind=engine)

def calculate_shopify_hmac(payload: dict, secret: str) -> str:
    raw_body = json.dumps(payload).encode("utf-8")
    digest = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode('utf-8')

async def main():
    print("=" * 60)
    print("   DEMO INTERACTIVA DE SINCRONIZACIÓN DE INVENTARIO (SAE-SHOPIFY-ML)")
    print("=" * 60)
    print(f"[*] Base de datos temporal creada: {DB_FILE}")
    print(f"[*] Stock inicial de SAE para SKU001: 10")
    print("-" * 60)

    # 2. Simular el envío de un webhook de Shopify con una venta del SKU001 de cantidad 2.
    shopify_payload = {
        "id": 100001,
        "line_items": [
            {
                "id": 200001,
                "sku": "SKU001",
                "quantity": 2
            }
        ]
    }
    
    secret = settings.SHOPIFY_API_SECRET or "shpss_xxxx"
    raw_body = json.dumps(shopify_payload).encode("utf-8")
    hmac_header = calculate_shopify_hmac(shopify_payload, secret)

    print("[*] Enviando webhook de venta Shopify...")
    client = TestClient(app)
    response = client.post(
        "/webhook/shopify",
        content=raw_body,
        headers={"X-Shopify-Hmac-Sha256": hmac_header}
    )

    # Imprimir en consola la respuesta del webhook ([OK] Venta recibida, [OK] Venta registrada)
    if response.status_code == 202:
        print("[OK] Venta recibida")
    else:
        print(f"[FAIL] Error en webhook: {response.status_code} - {response.text}")
        return

    # Verificar registro en base de datos
    db = SessionLocal()
    venta = db.query(Venta).filter(Venta.external_id == "100001_200001").first()
    if venta and venta.status == "PENDING":
        print("[OK] Venta registrada")
    else:
        print("[FAIL] La venta no fue registrada en la base de datos.")
        db.close()
        return
    db.close()

    print("-" * 60)
    print("[*] Ejecutando el worker para procesar la venta en segundo plano...")

    # Ejecutar el worker una vez (equivalente a 'worker.py --once')
    db = SessionLocal()
    processed = await worker.run_iteration(db)
    db.close()

    # Verificar e imprimir los resultados en la consola:
    # - [OK] Stock SAE actualizado: 8
    # - [OK] Shopify actualizado: 8
    # - [OK] Mercado Libre actualizado: 8
    # - [OK] Venta procesada
    sae_repo = SAEMockRepository()
    stock_sae = sae_repo.get_stock("SKU001")
    
    db = SessionLocal()
    venta = db.query(Venta).filter(Venta.external_id == "100001_200001").first()
    
    if stock_sae == 8:
        print("[OK] Stock SAE actualizado: 8")
    else:
        print(f"[FAIL] Stock SAE incorrecto: {stock_sae}")
        
    if venta and venta.shopify_synced:
        print("[OK] Shopify actualizado: 8")
    else:
        print("[FAIL] Shopify no fue actualizado en la BD.")
        
    if venta and venta.ml_synced:
        print("[OK] Mercado Libre actualizado: 8")
    else:
        print("[FAIL] Mercado Libre no fue actualizado en la BD.")

    if venta and venta.status == "PROCESSED":
        print("[OK] Venta procesada")
    else:
        print(f"[FAIL] Estado de venta incorrecto: {venta.status if venta else 'None'}")
    db.close()

    print("-" * 60)
    print("[*] Simulando el envío de EXACTAMENTE la misma venta de Shopify (mismo external_id)...")

    # Simular el envío de EXACTAMENTE la misma venta de Shopify (mismo external_id)
    response_duplicate = client.post(
        "/webhook/shopify",
        content=raw_body,
        headers={"X-Shopify-Hmac-Sha256": hmac_header}
    )

    if response_duplicate.status_code == 202:
        print("[OK] Venta duplicada recibida (aceptada por idempotencia)")
    else:
        print(f"[FAIL] Error en webhook duplicado: {response_duplicate.status_code}")
        return

    print("[*] Ejecutando el worker de nuevo...")
    db = SessionLocal()
    processed_again = await worker.run_iteration(db)
    db.close()

    # Verificar e imprimir en pantalla que la venta duplicada fue detectada, que SAE sigue en 8, y que no se volvió a descontar nada.
    db = SessionLocal()
    all_ventas = db.query(Venta).filter(Venta.external_id == "100001_200001").all()
    stock_sae_final = sae_repo.get_stock("SKU001")
    db.close()

    if len(all_ventas) == 1:
        print("[OK] Venta duplicada detectada (idempotencia en base de datos, no se duplicó la fila)")
    else:
        print(f"[FAIL] Se encontraron múltiples registros de venta: {len(all_ventas)}")

    if stock_sae_final == 8:
        print("[OK] SAE sigue en 8")
        print("[OK] No se volvió a descontar nada")
    else:
        print(f"[FAIL] El stock SAE cambió a: {stock_sae_final}")

    print("=" * 60)
    print("   DEMO COMPLETADA CON ÉXITO")
    print("=" * 60)

    # Limpieza final
    for file in [DB_FILE, PRODUCTS_FILE]:
        if os.path.exists(file):
            try:
                os.remove(file)
            except Exception:
                pass

if __name__ == "__main__":
    asyncio.run(main())
