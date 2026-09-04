import os
import json
import pytest
import threading
from sae_mock import SAEMockRepository, ProductNotFoundError, InsufficientStockError

@pytest.fixture
def temp_json_file(tmp_path):
    """Fixture para crear un archivo JSON temporal con datos iniciales."""
    test_data = {
        "SKU001": {
            "sku": "SKU001",
            "nombre": "Laptop Gamer Antigravity",
            "stock": 15,
            "shopify_inventory_item_id": "gid://shopify/InventoryItem/12345",
            "shopify_location_id": "gid://shopify/Location/67890",
            "ml_item_id": "MLM123456"
        },
        "SKU002": {
            "sku": "SKU002",
            "nombre": "Monitor Curvo 27",
            "stock": 8,
            "shopify_inventory_item_id": "gid://shopify/InventoryItem/54321",
            "shopify_location_id": "gid://shopify/Location/67890",
            "ml_item_id": "MLM654321"
        }
    }
    file_path = tmp_path / "test_productos.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(test_data, f)
    return str(file_path)

def test_get_stock_success(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    assert repo.get_stock("SKU001") == 15
    assert repo.get_stock("SKU002") == 8

def test_get_stock_product_not_found(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    with pytest.raises(ProductNotFoundError):
        repo.get_stock("NON_EXISTENT")

def test_set_stock_success(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    repo.set_stock("SKU001", 50)
    assert repo.get_stock("SKU001") == 50

def test_set_stock_product_not_found(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    with pytest.raises(ProductNotFoundError):
        repo.set_stock("NON_EXISTENT", 10)

def test_decrement_stock_success(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    new_stock = repo.decrement_stock("SKU001", 5)
    assert new_stock == 10
    assert repo.get_stock("SKU001") == 10

def test_decrement_stock_insufficient(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    with pytest.raises(InsufficientStockError):
        repo.decrement_stock("SKU001", 20)

def test_decrement_stock_product_not_found(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    with pytest.raises(ProductNotFoundError):
        repo.decrement_stock("NON_EXISTENT", 5)

def test_get_product_success(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    product = repo.get_product("SKU001")
    assert product["sku"] == "SKU001"
    assert product["nombre"] == "Laptop Gamer Antigravity"
    assert product["stock"] == 15
    assert product["shopify_inventory_item_id"] == "gid://shopify/InventoryItem/12345"

def test_get_product_not_found(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    with pytest.raises(ProductNotFoundError):
        repo.get_product("NON_EXISTENT")

def test_concurrent_decrements(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    
    # 15 hilos, cada uno decrementa 1 de stock de SKU001. El stock inicial es 15.
    num_threads = 15
    threads = []
    
    def worker():
        repo.decrement_stock("SKU001", 1)
        
    for _ in range(num_threads):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    assert repo.get_stock("SKU001") == 0

def test_get_all_products_success(temp_json_file):
    repo = SAEMockRepository(data_path=temp_json_file)
    products = repo.get_all_products()
    assert len(products) == 2
    skus = [p["sku"] for p in products]
    assert "SKU001" in skus
    assert "SKU002" in skus

