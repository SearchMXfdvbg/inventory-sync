import logging
from typing import Dict, Any, Optional
import httpx
from config import settings

logger = logging.getLogger("inventory_sync.amazon")

class AmazonClientError(Exception):
    pass

class AmazonClient:
    """
    Cliente para la API de Amazon Selling Partner (SP-API).
    Gestiona la sincronización de inventario en Amazon México/US y consulta de órdenes.
    """
    SP_API_ENDPOINT = "https://sellingpartnerapi-na.amazon.com"
    LWA_TOKEN_ENDPOINT = "https://api.amazon.com/auth/o2/token"

    def __init__(self):
        self._mock_stocks: Dict[str, int] = {
            "SKU001": 10,
            "SKU002": 15,
            "SKU003": 8,
            "SKU004": 20
        }
        self._cached_access_token: Optional[str] = None

    @property
    def is_configured(self) -> bool:
        """Indica si las credenciales de Amazon SP-API están configuradas."""
        return bool(
            settings.AMAZON_CLIENT_ID and 
            settings.AMAZON_CLIENT_SECRET and 
            settings.AMAZON_REFRESH_TOKEN and 
            settings.AMAZON_SELLER_ID
        )

    async def _get_access_token(self) -> str:
        """Obtiene un token de acceso LWA (Login with Amazon) usando el refresh_token."""
        if not self.is_configured:
            return "mock-lwa-access-token"

        if self._cached_access_token:
            return self._cached_access_token

        payload = {
            "grant_type": "refresh_token",
            "refresh_token": settings.AMAZON_REFRESH_TOKEN,
            "client_id": settings.AMAZON_CLIENT_ID,
            "client_secret": settings.AMAZON_CLIENT_SECRET
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(self.LWA_TOKEN_ENDPOINT, data=payload)
            if res.status_code != 200:
                raise AmazonClientError(f"Fallo al autenticar con LWA en Amazon: {res.status_code} - {res.text}")
            token = res.json().get("access_token")
            self._cached_access_token = token
            return token

    async def update_stock(self, sku: str, quantity: int) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de un SKU en Amazon Seller Central.
        Utiliza el endpoint de Listings Items API de SP-API.
        """
        logger.info(f"Actualizando stock en Amazon para SKU={sku} -> Cantidad={quantity}")

        if not self.is_configured:
            self._mock_stocks[sku] = quantity
            logger.info(f"[MOCK AMAZON] Stock actualizado exitosamente para {sku}: {quantity} unidades.")
            return {
                "sku": sku,
                "status": "ACCEPTED",
                "quantity": quantity,
                "marketplace": settings.AMAZON_MARKETPLACE_ID
            }

        access_token = await self._get_access_token()
        seller_id = settings.AMAZON_SELLER_ID
        marketplace_id = settings.AMAZON_MARKETPLACE_ID

        url = f"{self.SP_API_ENDPOINT}/listings/2021-08-01/items/{seller_id}/{sku}"
        params = {
            "marketplaceIds": marketplace_id,
            "issueLocale": "es_MX"
        }

        # Payload estándar para parchar inventario disponible en Amazon
        body = {
            "productType": "PRODUCT",
            "patches": [
                {
                    "op": "replace",
                    "path": "/attributes/fulfillment_availability",
                    "value": [
                        {
                            "fulfillment_channel_code": "DEFAULT",
                            "quantity": quantity
                        }
                    ]
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.patch(
                    url,
                    params=params,
                    headers={
                        "x-amz-access-token": access_token,
                        "Content-Type": "application/json"
                    },
                    json=body
                )
                if res.status_code not in (200, 202):
                    raise AmazonClientError(f"Error HTTP {res.status_code} al actualizar stock en Amazon: {res.text}")
                return res.json()
        except Exception as e:
            logger.error(f"Fallo al actualizar stock en Amazon: {e}")
            raise AmazonClientError(str(e))

    async def get_stock(self, sku: str) -> int:
        """
        Consulta la cantidad disponible en inventario para un SKU en Amazon.
        """
        if not self.is_configured:
            return self._mock_stocks.get(sku, 10)

        try:
            access_token = await self._get_access_token()
            url = f"{self.SP_API_ENDPOINT}/fba/inventory/v1/summaries"
            params = {
                "details": "true",
                "marketplaceIds": settings.AMAZON_MARKETPLACE_ID,
                "sellerSkus": sku
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    url,
                    params=params,
                    headers={"x-amz-access-token": access_token}
                )
                if res.status_code == 200:
                    data = res.json()
                    summaries = data.get("payload", {}).get("inventorySummaries", [])
                    if summaries:
                        qty = summaries[0].get("inventoryDetails", {}).get("fulfillableQuantity", 0)
                        return int(qty)
            return 10
        except Exception as e:
            logger.warning(f"No se pudo consultar stock en Amazon para {sku}: {e}")
            return self._mock_stocks.get(sku, 10)

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene el detalle de los artículos en una orden de Amazon.
        """
        if not self.is_configured:
            return {
                "AmazonOrderId": order_id,
                "OrderStatus": "Unshipped",
                "OrderItems": [
                    {
                        "SellerSKU": "SKU001",
                        "QuantityOrdered": 1,
                        "Title": "Producto Demo Amazon"
                    }
                ]
            }

        access_token = await self._get_access_token()
        url = f"{self.SP_API_ENDPOINT}/orders/v0/orders/{order_id}/orderItems"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                url,
                headers={"x-amz-access-token": access_token}
            )
            if res.status_code == 200:
                return res.json().get("payload", {})
            raise AmazonClientError(f"Error al obtener artículos de orden Amazon {order_id}: {res.status_code}")
