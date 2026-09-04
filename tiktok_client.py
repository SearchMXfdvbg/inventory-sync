import logging
import time
import hmac
import hashlib
from typing import Dict, Any, Optional
import httpx
from config import settings

logger = logging.getLogger("inventory_sync.tiktok")

class TikTokClientError(Exception):
    pass

class TikTokClient:
    """
    Cliente para la API de TikTok Shop (Partner Open API 202309).
    Gestiona la sincronización de inventario, consulta de órdenes y webhooks de venta.
    """
    BASE_URL = "https://open-api.tiktokglobalshop.com"

    def __init__(self):
        # Almacén en memoria para simulación en modo mock / desarrollo
        self._mock_stocks: Dict[str, int] = {
            "SKU001": 10,
            "SKU002": 15,
            "SKU003": 8,
            "SKU004": 20
        }

    @property
    def is_configured(self) -> bool:
        """Indica si las credenciales de TikTok Shop están configuradas."""
        return bool(settings.TIKTOK_ACCESS_TOKEN and settings.TIKTOK_APP_KEY)

    def _generate_signature(self, path: str, params: Dict[str, Any]) -> str:
        """Genera la firma HMAC-SHA256 requerida por TikTok Shop Open API."""
        sorted_params = sorted(params.items(), key=lambda x: x[0])
        param_string = "".join(f"{k}{v}" for k, v in sorted_params)
        base_string = f"{settings.TIKTOK_APP_SECRET}{path}{param_string}{settings.TIKTOK_APP_SECRET}"
        return hmac.new(
            settings.TIKTOK_APP_SECRET.encode("utf-8"),
            base_string.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    async def update_stock(self, product_id: str, sku_id: str, quantity: int) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de un SKU en TikTok Shop.
        """
        logger.info(f"Actualizando stock en TikTok Shop para Product={product_id}, SKU={sku_id} -> Cantidad={quantity}")

        if not self.is_configured:
            # Modo simulado / desarrollo
            self._mock_stocks[sku_id] = quantity
            logger.info(f"[MOCK TIKTOK] Stock actualizado exitosamente para {sku_id}: {quantity} unidades.")
            return {
                "code": 0,
                "message": "Success (Simulated)",
                "data": {"sku_id": sku_id, "available_stock": quantity}
            }

        timestamp = int(time.time())
        path = "/product/202309/skus/inventory/update"
        params = {
            "app_key": settings.TIKTOK_APP_KEY,
            "timestamp": timestamp,
            "shop_cipher": settings.TIKTOK_SHOP_CIPHER or settings.TIKTOK_SHOP_ID
        }
        params["sign"] = self._generate_signature(path, params)

        payload = {
            "product_id": product_id,
            "skus": [
                {
                    "id": sku_id,
                    "inventory": [
                        {"quantity": quantity}
                    ]
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.BASE_URL}{path}",
                    params=params,
                    headers={
                        "x-tts-access-token": settings.TIKTOK_ACCESS_TOKEN,
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                if res.status_code != 200:
                    raise TikTokClientError(f"Error HTTP {res.status_code} en TikTok Shop: {res.text}")
                
                data = res.json()
                if data.get("code") != 0:
                    raise TikTokClientError(f"Error de API TikTok Shop ({data.get('code')}): {data.get('message')}")
                
                return data
        except Exception as e:
            logger.error(f"Fallo al actualizar stock en TikTok Shop: {e}")
            raise TikTokClientError(str(e))

    async def get_stock(self, product_id: str, sku_id: str) -> int:
        """
        Consulta la cantidad disponible de inventario en TikTok Shop.
        """
        if not self.is_configured:
            return self._mock_stocks.get(sku_id, 10)

        timestamp = int(time.time())
        path = f"/product/202309/products/{product_id}"
        params = {
            "app_key": settings.TIKTOK_APP_KEY,
            "timestamp": timestamp,
            "shop_cipher": settings.TIKTOK_SHOP_CIPHER or settings.TIKTOK_SHOP_ID
        }
        params["sign"] = self._generate_signature(path, params)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{self.BASE_URL}{path}",
                    params=params,
                    headers={"x-tts-access-token": settings.TIKTOK_ACCESS_TOKEN}
                )
                if res.status_code == 200:
                    data = res.json()
                    skus = data.get("data", {}).get("skus", [])
                    for s in skus:
                        if s.get("id") == sku_id or s.get("seller_sku") == sku_id:
                            inv = s.get("inventory", [{}])[0].get("quantity", 0)
                            return int(inv)
            return 10
        except Exception as e:
            logger.warning(f"No se pudo consultar stock en TikTok Shop para {sku_id}: {e}")
            return self._mock_stocks.get(sku_id, 10)

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene el detalle de una orden de TikTok Shop para procesar la venta y sus SKUs.
        """
        if not self.is_configured:
            return {
                "id": order_id,
                "status": "AWAITING_SHIPMENT",
                "line_items": [
                    {
                        "product_id": "TT_PROD_001",
                        "sku_id": "SKU001",
                        "seller_sku": "SKU001",
                        "quantity": 1
                    }
                ]
            }

        timestamp = int(time.time())
        path = f"/order/202309/orders/{order_id}"
        params = {
            "app_key": settings.TIKTOK_APP_KEY,
            "timestamp": timestamp,
            "shop_cipher": settings.TIKTOK_SHOP_CIPHER or settings.TIKTOK_SHOP_ID
        }
        params["sign"] = self._generate_signature(path, params)

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{self.BASE_URL}{path}",
                params=params,
                headers={"x-tts-access-token": settings.TIKTOK_ACCESS_TOKEN}
            )
            if res.status_code == 200:
                return res.json().get("data", {})
            raise TikTokClientError(f"Error al obtener orden de TikTok Shop {order_id}: {res.status_code}")
