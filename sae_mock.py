import json
import os
import threading
from abc import ABC, abstractmethod
from typing import Dict, Any

from config import settings

class SAESyncError(Exception):
    """Clase base para errores de SAE."""
    pass

class ProductNotFoundError(SAESyncError):
    """Se lanza cuando un producto no existe en el inventario."""
    pass

class InsufficientStockError(SAESyncError):
    """Se lanza cuando no hay suficiente stock disponible."""
    pass

class SAERepository(ABC):
    @abstractmethod
    def get_stock(self, sku: str) -> int:
        """Retorna el stock disponible para un SKU."""
        pass

    @abstractmethod
    def set_stock(self, sku: str, quantity: int) -> None:
        """Establece el stock para un SKU."""
        pass

    @abstractmethod
    def decrement_stock(self, sku: str, quantity: int) -> int:
        """Resta la cantidad especificada del stock de un SKU. Retorna el nuevo stock."""
        pass

    @abstractmethod
    def get_product(self, sku: str) -> Dict[str, Any]:
        """Retorna la información completa del producto para un SKU."""
        pass

    @abstractmethod
    def get_all_products(self) -> list:
        """Retorna la lista completa de productos."""
        pass

class SAEMockRepository(SAERepository):
    def __new__(cls, *args, **kwargs):
        # Si la variable de entorno SAE_REPOSITORY_TYPE o settings.SAE_REPOSITORY_TYPE se establece a "production",
        # instanciamos dinámicamente el repositorio productivo si está disponible.
        # Esto permite que worker.py y main.py sigan usando SAEMockRepository() sin modificar su código.
        repo_type = os.getenv("SAE_REPOSITORY_TYPE", settings.SAE_REPOSITORY_TYPE)
        if repo_type == "production":
            try:
                from sae_db import SAEDatabaseRepository
                db_url = os.getenv("SAE_DATABASE_URL", settings.DATABASE_URL)
                return SAEDatabaseRepository(db_url)
            except ImportError:
                raise ImportError(
                    "Se configuró SAE_REPOSITORY_TYPE='production' pero no se encontró "
                    "el módulo 'sae_db' con la clase 'SAEDatabaseRepository'."
                )
        return super().__new__(cls)


    def __init__(self, data_path: str = None):

        if data_path is None:
            self.data_path = os.path.abspath(settings.SAE_DATA_PATH)
        else:
            self.data_path = os.path.abspath(data_path)
            
        self.lock = threading.Lock()
        
        # Inicializa el archivo si no existe
        if not os.path.exists(self.data_path):
            os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _read_data(self) -> Dict[str, Dict[str, Any]]:
        with open(self.data_path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}

    def _write_data(self, data: Dict[str, Dict[str, Any]]) -> None:
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_stock(self, sku: str) -> int:
        with self.lock:
            data = self._read_data()
            if sku not in data:
                raise ProductNotFoundError(f"El producto con SKU '{sku}' no existe en el sistema.")
            return int(data[sku]["stock"])

    def set_stock(self, sku: str, quantity: int) -> None:
        with self.lock:
            data = self._read_data()
            if sku not in data:
                raise ProductNotFoundError(f"El producto con SKU '{sku}' no existe en el sistema.")
            data[sku]["stock"] = quantity
            self._write_data(data)

    def decrement_stock(self, sku: str, quantity: int) -> int:
        with self.lock:
            data = self._read_data()
            if sku not in data:
                raise ProductNotFoundError(f"El producto con SKU '{sku}' no existe en el sistema.")
            
            current_stock = int(data[sku]["stock"])
            if current_stock < quantity:
                raise InsufficientStockError(
                    f"Stock insuficiente para el SKU '{sku}'. Disponible: {current_stock}, Solicitado: {quantity}"
                )
            
            new_stock = current_stock - quantity
            data[sku]["stock"] = new_stock
            self._write_data(data)
            return new_stock

    def get_product(self, sku: str) -> Dict[str, Any]:
        with self.lock:
            data = self._read_data()
            if sku not in data:
                raise ProductNotFoundError(f"El producto con SKU '{sku}' no existe en el sistema.")
            return data[sku]

    def get_all_products(self) -> list:
        with self.lock:
            data = self._read_data()
            return list(data.values())
