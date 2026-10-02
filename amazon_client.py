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
        pass
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
            raise AmazonClientError("Amazon SP-API no está configurado.")

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

    async def test_connection(
        self,
        seller_id: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        refresh_token: Optional[str] = None,
        marketplace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Verifica credenciales reales de Amazon SP-API via LWA + Sellers/marketplaceParticipations API.
        """
        sid = seller_id or settings.AMAZON_SELLER_ID
        cid = client_id or settings.AMAZON_CLIENT_ID
        csec = client_secret or settings.AMAZON_CLIENT_SECRET
        rtok = refresh_token or settings.AMAZON_REFRESH_TOKEN
        mid = marketplace_id or settings.AMAZON_MARKETPLACE_ID

        # Validaciones previas
        if not sid or not str(sid).strip() or str(sid).strip() in ("A1ABC23XYZ", "YOUR_SELLER_ID", ""):
            return {
                "success": False,
                "status_code": 400,
                "message": "Ingresa un Seller ID real de Amazon (no el de ejemplo). Lo encuentras en Seller Central → Cuenta → Información del vendedor."
            }
        if not rtok or "••" in str(rtok) or str(rtok).strip() in ("", "Atzr|xxxx", "YOUR_REFRESH_TOKEN"):
            return {
                "success": False,
                "status_code": 400,
                "message": "Ingresa un Refresh Token LWA real de Amazon (empieza con Atzr|...). Obtenlo en SP-API Developer Console al autorizar tu aplicación."
            }
        if not cid or not csec:
            return {
                "success": False,
                "status_code": 400,
                "message": "Faltan el LWA Client ID o el Client Secret de Amazon."
            }

        # Paso 1: Obtener access token via LWA
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    self.LWA_TOKEN_ENDPOINT,
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": str(rtok).strip(),
                        "client_id": str(cid).strip(),
                        "client_secret": str(csec).strip()
                    }
                )
                if res.status_code != 200:
                    ct = res.headers.get("content-type", "")
                    error_desc = res.json().get("error_description", res.text) if "application/json" in ct else res.text
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "message": f"Error {res.status_code} al autenticar con Amazon LWA: {error_desc}"
                    }
                access_token = res.json().get("access_token")
        except Exception as e:
            logger.error(f"Error contactando Amazon LWA: {e}")
            return {
                "success": False,
                "status_code": 500,
                "message": f"No se pudo contactar Amazon LWA: {str(e)}"
            }

        # Paso 2: Verificar con Sellers API (marketplaceParticipations)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res2 = await client.get(
                    f"{self.SP_API_ENDPOINT}/sellers/v1/marketplaceParticipations",
                    headers={
                        "x-amz-access-token": access_token,
                        "Content-Type": "application/json"
                    }
                )
                if res2.status_code == 200:
                    participations = res2.json().get("payload", [])
                    marketplace_names = [
                        p.get("marketplace", {}).get("name", "")
                        for p in participations
                        if p.get("marketplace")
                    ]
                    markets_str = ", ".join(marketplace_names) if marketplace_names else (mid or "desconocido")
                    return {
                        "success": True,
                        "status_code": 200,
                        "seller_id": str(sid).strip(),
                        "marketplace_id": str(mid or "").strip(),
                        "marketplaces": marketplace_names,
                        "message": f"¡Conexión exitosa con Amazon SP-API! Seller ID: {str(sid).strip()} — Marketplaces: {markets_str}"
                    }
                elif res2.status_code == 403:
                    return {
                        "success": False,
                        "status_code": 403,
                        "message": "Error 403 Amazon: El Seller ID no coincide con el token o la app no tiene permiso de 'Sell on Amazon'."
                    }
                else:
                    return {
                        "success": False,
                        "status_code": res2.status_code,
                        "message": f"Error HTTP {res2.status_code} al verificar cuenta Amazon SP-API: {res2.text[:200]}"
                    }
        except Exception as e:
            logger.error(f"Error contactando Amazon SP-API: {e}")
            return {
                "success": False,
                "status_code": 500,
                "message": f"Error al conectar con Amazon SP-API: {str(e)}"
            }

    async def update_stock(self, sku: str, quantity: int) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de un SKU en Amazon Seller Central.
        Utiliza el endpoint de Listings Items API de SP-API.
        """
        logger.info(f"Actualizando stock en Amazon para SKU={sku} -> Cantidad={quantity}")

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
            return 0

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene el detalle de los artículos en una orden de Amazon.
        """
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
