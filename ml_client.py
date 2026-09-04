import logging
import httpx
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger("inventory_sync.ml_client")

class MLError(Exception):
    """Clase base para errores de Mercado Libre."""
    pass

class MLTimeoutError(MLError):
    """Se lanza cuando ocurre un timeout en la petición a Mercado Libre."""
    pass

class MLRateLimitError(MLError):
    """Se lanza cuando se alcanza el límite de peticiones (HTTP 429) en Mercado Libre."""
    pass

class MLHTTPError(MLError):
    """Se lanza cuando la API de Mercado Libre retorna un código de error HTTP (no rate limit)."""
    def __init__(self, message: str, status_code: int, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

class MLClient:
    def __init__(
        self,
        access_token: Optional[str] = None,
        timeout: float = 10.0
    ):
        self._access_token = access_token
        self.timeout = timeout

    @property
    def access_token(self) -> str:
        return self._access_token or settings.ML_ACCESS_TOKEN

    @access_token.setter
    def access_token(self, value: str):
        self._access_token = value

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }


    async def update_stock(self, item_id: str, quantity: int) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de un item en Mercado Libre.
        
        Args:
            item_id: El ID del item en Mercado Libre (ej: MLM123456)
            quantity: La nueva cantidad de stock
            
        Returns:
            La respuesta JSON de Mercado Libre
        """
        url = f"https://api.mercadolibre.com/items/{item_id}"
        payload = {"available_quantity": quantity}
        
        logger.info(f"Actualizando stock en Mercado Libre para item {item_id} a {quantity}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.put(url, headers=self.headers, json=payload)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout al actualizar stock en Mercado Libre para item {item_id}: {exc}")
                raise MLTimeoutError(f"Timeout al comunicarse con Mercado Libre: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al actualizar stock en Mercado Libre para item {item_id}: {exc}")
                raise MLHTTPError(f"Error de red al comunicarse con Mercado Libre: {exc}", status_code=0) from exc

            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Mercado Libre.")
                raise MLRateLimitError("Límite de peticiones alcanzado en Mercado Libre (HTTP 429).")
                
            if response.status_code not in (200, 201):
                logger.error(
                    f"Error HTTP en Mercado Libre al actualizar stock para item {item_id}. "
                    f"Status: {response.status_code}, Body: {response.text}"
                )
                raise MLHTTPError(
                    f"Error de API Mercado Libre al actualizar stock: {response.status_code}",
                    status_code=response.status_code,
                    response_body=response.text
                )
                
            try:
                return response.json()
            except ValueError as exc:
                logger.error(f"La respuesta de Mercado Libre al actualizar stock no es un JSON válido: {response.text}")
                raise MLHTTPError(
                    "Respuesta inválida de Mercado Libre (no JSON)", 
                    status_code=response.status_code, 
                    response_body=response.text
                ) from exc

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene los detalles de una orden específica de Mercado Libre.
        
        Args:
            order_id: ID de la orden en Mercado Libre
            
        Returns:
            Un diccionario con los detalles de la orden
        """
        url = f"https://api.mercadolibre.com/orders/{order_id}"
        
        logger.info(f"Consultando orden {order_id} en Mercado Libre")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, headers=self.headers)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout al obtener orden {order_id} en Mercado Libre: {exc}")
                raise MLTimeoutError(f"Timeout al comunicarse con Mercado Libre: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al obtener orden {order_id} en Mercado Libre: {exc}")
                raise MLHTTPError(f"Error de red al comunicarse con Mercado Libre: {exc}", status_code=0) from exc

            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Mercado Libre.")
                raise MLRateLimitError("Límite de peticiones alcanzado en Mercado Libre (HTTP 429).")
                
            if response.status_code != 200:
                logger.error(
                    f"Error HTTP en Mercado Libre al obtener orden {order_id}. "
                    f"Status: {response.status_code}, Body: {response.text}"
                )
                raise MLHTTPError(
                    f"Error de API Mercado Libre al obtener orden: {response.status_code}",
                    status_code=response.status_code,
                    response_body=response.text
                )
                
            try:
                return response.json()
            except ValueError as exc:
                logger.error(f"La respuesta de Mercado Libre al obtener orden no es un JSON válido: {response.text}")
                raise MLHTTPError(
                    "Respuesta inválida de Mercado Libre (no JSON)", 
                    status_code=response.status_code, 
                    response_body=response.text
                ) from exc

    async def get_stock(self, item_id: str) -> int:
        """
        Obtiene el stock disponible ('available_quantity') de un item en Mercado Libre.
        
        Args:
            item_id: El ID del item en Mercado Libre (ej: MLM123456)
            
        Returns:
            La cantidad de stock disponible (int)
        """
        url = f"https://api.mercadolibre.com/items/{item_id}"
        
        logger.info(f"Obteniendo stock en Mercado Libre para item {item_id}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url, headers=self.headers)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout al obtener stock en Mercado Libre para item {item_id}: {exc}")
                raise MLTimeoutError(f"Timeout al comunicarse con Mercado Libre: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al obtener stock en Mercado Libre para item {item_id}: {exc}")
                raise MLHTTPError(f"Error de red al comunicarse con Mercado Libre: {exc}", status_code=0) from exc

            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Mercado Libre.")
                raise MLRateLimitError("Límite de peticiones alcanzado en Mercado Libre (HTTP 429).")
                
            if response.status_code != 200:
                logger.error(
                    f"Error HTTP en Mercado Libre al obtener stock para item {item_id}. "
                    f"Status: {response.status_code}, Body: {response.text}"
                )
                raise MLHTTPError(
                    f"Error de API Mercado Libre al obtener stock: {response.status_code}",
                    status_code=response.status_code,
                    response_body=response.text
                )
                
            try:
                res_data = response.json()
                return int(res_data.get("available_quantity", 0))
            except ValueError as exc:
                logger.error(f"La respuesta de Mercado Libre al obtener stock no es un JSON válido: {response.text}")
                raise MLHTTPError(
                    "Respuesta inválida de Mercado Libre (no JSON)", 
                    status_code=response.status_code, 
                    response_body=response.text
                ) from exc

    async def test_connection(self, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifica la validez del Access Token consultando el perfil del vendedor en Mercado Libre.
        """
        token = (access_token or self.access_token or "").strip()
        if not token or token.startswith("APP_USR-xxxx") or len(token) < 15:
            return {
                "success": False,
                "status_code": 400,
                "message": "Ingrese un Access Token válido de Mercado Libre (ej: APP_USR-...)."
            }

        url = "https://api.mercadolibre.com/users/me"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    user_data = resp.json()
                    nickname = user_data.get("nickname", "Vendedor")
                    site_id = user_data.get("site_id", "MLM")
                    user_id = user_data.get("id")
                    return {
                        "success": True,
                        "status_code": 200,
                        "nickname": nickname,
                        "site_id": site_id,
                        "user_id": user_id,
                        "message": f"¡Conexión exitosa con Mercado Libre! Vendedor: {nickname} (País: {site_id})"
                    }
                elif resp.status_code == 401:
                    return {
                        "success": False,
                        "status_code": 401,
                        "message": "Error 401: Access Token de Mercado Libre expirado o inválido."
                    }
                else:
                    return {
                        "success": False,
                        "status_code": resp.status_code,
                        "message": f"Error HTTP {resp.status_code} al consultar Mercado Libre."
                    }
        except Exception as e:
            return {
                "success": False,
                "status_code": 500,
                "message": f"No se pudo conectar con Mercado Libre: {str(e)}"
            }


