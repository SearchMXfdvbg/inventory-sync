import asyncio
import logging
from typing import Optional, Dict, Any, List, Callable
import httpx
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
    """Se lanza cuando la API de Mercado Libre retorna un código de error HTTP."""
    def __init__(self, message: str, status_code: int, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

class MLClient:
    def __init__(
        self,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        timeout: float = 12.0,
        on_token_refresh: Optional[Callable[[Dict[str, Any]], Any]] = None
    ):
        self._access_token = access_token
        self._refresh_token = refresh_token
        self._client_id = client_id
        self._client_secret = client_secret
        self.timeout = timeout
        self.on_token_refresh = on_token_refresh

    @property
    def client_id(self) -> str:
        return self._client_id or getattr(settings, "ML_CLIENT_ID", "4092000500491249")

    @property
    def client_secret(self) -> str:
        return self._client_secret or getattr(settings, "ML_CLIENT_SECRET", "Jzt4lYh50r13kifuXxvi08u2FQiEk2dI")

    @property
    def refresh_token(self) -> str:
        return self._refresh_token or getattr(settings, "ML_REFRESH_TOKEN", "")

    @refresh_token.setter
    def refresh_token(self, value: str):
        self._refresh_token = value

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

    async def refresh_access_token(
        self,
        refresh_token: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Renueva el Access Token de Mercado Libre usando el Refresh Token.
        Mercado Libre otorga un nuevo Access Token (6 horas) y un nuevo Refresh Token (6 meses).
        """
        ref_tok = refresh_token or self.refresh_token
        cid = client_id or self.client_id
        csec = client_secret or self.client_secret

        if not ref_tok:
            raise MLHTTPError("No se dispone de un refresh token para renovar la sesión en Mercado Libre.", status_code=400)
        if not cid or not csec:
            raise MLHTTPError("Faltan credenciales de aplicación (ML_CLIENT_ID / ML_CLIENT_SECRET).", status_code=400)

        url = "https://api.mercadolibre.com/oauth/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": cid,
            "client_secret": csec,
            "refresh_token": ref_tok
        }
        headers = {
            "accept": "application/json",
            "content-type": "application/x-www-form-urlencoded"
        }

        logger.info("[MLClient] Renovando Access Token de Mercado Libre...")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, data=data, headers=headers)
            except Exception as e:
                logger.error(f"[MLClient] Error de conexión al renovar token ML: {e}")
                raise MLHTTPError(f"Error de conexión al renovar token ML: {e}", status_code=0)

            if resp.status_code != 200:
                logger.error(f"[MLClient] Fallo al renovar token ML: {resp.status_code} - {resp.text}")
                raise MLHTTPError(f"Error al renovar token ML: {resp.text}", status_code=resp.status_code, response_body=resp.text)

            tokens = resp.json()
            new_access_token = tokens.get("access_token")
            new_refresh_token = tokens.get("refresh_token")

            if new_access_token:
                self._access_token = new_access_token
            if new_refresh_token:
                self._refresh_token = new_refresh_token

            # Notificar al callback para guardar tokens en la base de datos inmediatamente
            if self.on_token_refresh:
                try:
                    res = self.on_token_refresh(tokens)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as cb_err:
                    logger.warning(f"[MLClient] Error en callback on_token_refresh: {cb_err}")

            logger.info("[MLClient] Access Token y Refresh Token renovados exitosamente.")
            return tokens

    async def exchange_auth_code(
        self,
        code: str,
        redirect_uri: str,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Canjea el código de autorización obtenido en OAuth por los tokens definitivos.
        """
        code = code.strip()
        if "code=" in code:
            code = code.split("code=")[1].split("&")[0]

        cid = client_id or self.client_id
        csec = client_secret or self.client_secret

        url = "https://api.mercadolibre.com/oauth/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": cid,
            "client_secret": csec,
            "code": code,
            "redirect_uri": redirect_uri
        }
        headers = {
            "accept": "application/json",
            "content-type": "application/x-www-form-urlencoded"
        }

        logger.info(f"[MLClient] Canjeando código OAuth con redirect_uri={redirect_uri}...")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, data=data, headers=headers)
            except Exception as e:
                logger.error(f"[MLClient] Error de red al canjear código OAuth: {e}")
                raise MLHTTPError(f"Error de red al canjear código OAuth: {e}", status_code=0)

            if resp.status_code != 200:
                logger.error(f"[MLClient] Error al canjear código OAuth ({resp.status_code}): {resp.text}")
                raise MLHTTPError(f"Error al canjear código OAuth: {resp.text}", status_code=resp.status_code, response_body=resp.text)

            tokens = resp.json()
            if tokens.get("access_token"):
                self._access_token = tokens["access_token"]
            if tokens.get("refresh_token"):
                self._refresh_token = tokens["refresh_token"]

            if self.on_token_refresh:
                try:
                    res = self.on_token_refresh(tokens)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as cb_err:
                    logger.warning(f"[MLClient] Error en callback on_token_refresh: {cb_err}")

            return tokens

    async def _request_with_auto_refresh(self, method: str, url: str, **kwargs) -> httpx.Response:
        """
        Ejecuta una petición HTTP contra la API de Mercado Libre.
        Si recibe 401 Unauthorized y se cuenta con refresh_token, renueva el token y reintenta automáticamente.
        """
        headers = kwargs.pop("headers", None) or self.headers
        kwargs["headers"] = headers

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                if method.upper() == "GET":
                    response = await client.get(url, **kwargs)
                elif method.upper() == "PUT":
                    response = await client.put(url, **kwargs)
                elif method.upper() == "POST":
                    response = await client.post(url, **kwargs)
                else:
                    response = await client.request(method, url, **kwargs)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout al comunicarse con Mercado Libre ({method} {url}): {exc}")
                raise MLTimeoutError(f"Timeout al comunicarse con Mercado Libre: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al comunicarse con Mercado Libre ({method} {url}): {exc}")
                raise MLHTTPError(f"Error de red al comunicarse con Mercado Libre: {exc}", status_code=0) from exc

            # Si expiró el token (401), intentar autorefresh y reintentar 1 vez
            if response.status_code == 401 and self.refresh_token:
                logger.warning(f"[MLClient] Recibido HTTP 401 en {url}. Intentando autorrenovación automática de token...")
                try:
                    await self.refresh_access_token()
                    kwargs["headers"] = self.headers
                    if method.upper() == "GET":
                        response = await client.get(url, **kwargs)
                    elif method.upper() == "PUT":
                        response = await client.put(url, **kwargs)
                    elif method.upper() == "POST":
                        response = await client.post(url, **kwargs)
                    else:
                        response = await client.request(method, url, **kwargs)
                    logger.info(f"[MLClient] Reintento tras autorrenovación completado con status {response.status_code}.")
                except Exception as ref_err:
                    logger.error(f"[MLClient] No se pudo autorrenovar el token: {ref_err}")

            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Mercado Libre.")
                raise MLRateLimitError("Límite de peticiones alcanzado en Mercado Libre (HTTP 429).")

            return response

    async def update_stock(self, item_id: str, quantity: int) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de un item en Mercado Libre.
        """
        url = f"https://api.mercadolibre.com/items/{item_id}"
        payload = {"available_quantity": quantity}

        logger.info(f"Actualizando stock en Mercado Libre para item {item_id} a {quantity}")
        response = await self._request_with_auto_refresh("PUT", url, json=payload)

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
            logger.error(f"La respuesta de Mercado Libre al actualizar stock no es JSON: {response.text}")
            raise MLHTTPError(
                "Respuesta inválida de Mercado Libre (no JSON)", 
                status_code=response.status_code, 
                response_body=response.text
            ) from exc

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene los detalles de una orden específica de Mercado Libre.
        """
        url = f"https://api.mercadolibre.com/orders/{order_id}"
        logger.info(f"Consultando orden {order_id} en Mercado Libre")
        response = await self._request_with_auto_refresh("GET", url)

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
            logger.error(f"La respuesta de Mercado Libre al obtener orden no es JSON: {response.text}")
            raise MLHTTPError(
                "Respuesta inválida de Mercado Libre (no JSON)", 
                status_code=response.status_code, 
                response_body=response.text
            ) from exc

    async def get_stock(self, item_id: str) -> int:
        """
        Obtiene el stock disponible ('available_quantity') de un item en Mercado Libre.
        """
        url = f"https://api.mercadolibre.com/items/{item_id}"
        logger.info(f"Obteniendo stock en Mercado Libre para item {item_id}")
        response = await self._request_with_auto_refresh("GET", url)

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
            logger.error(f"La respuesta de Mercado Libre al obtener stock no es JSON: {response.text}")
            raise MLHTTPError(
                "Respuesta inválida de Mercado Libre (no JSON)", 
                status_code=response.status_code, 
                response_body=response.text
            ) from exc

    async def get_seller_items(self, user_id: int, status: str = "active", limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Busca los IDs de publicaciones de un vendedor en Mercado Libre.
        """
        url = f"https://api.mercadolibre.com/users/{user_id}/items/search?status={status}&limit={limit}&offset={offset}"
        logger.info(f"Buscando publicaciones para vendedor ML {user_id} (offset={offset}, limit={limit})")
        response = await self._request_with_auto_refresh("GET", url)

        if response.status_code != 200:
            raise MLHTTPError(
                f"Error al listar publicaciones de vendedor {user_id}: {response.text}",
                status_code=response.status_code,
                response_body=response.text
            )
        return response.json()

    async def get_items_batch(self, item_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Consulta en bloque los detalles completos de hasta 20 items.
        """
        if not item_ids:
            return []
        joined_ids = ",".join(item_ids[:20])
        url = f"https://api.mercadolibre.com/items?ids={joined_ids}"
        logger.info(f"Consultando detalles en bloque de {len(item_ids[:20])} items en Mercado Libre")
        response = await self._request_with_auto_refresh("GET", url)

        if response.status_code != 200:
            raise MLHTTPError(
                f"Error al consultar detalles de items en Mercado Libre: {response.text}",
                status_code=response.status_code,
                response_body=response.text
            )
        return response.json()

    @staticmethod
    def extract_sku_from_item(item_body: Dict[str, Any]) -> Optional[str]:
        """
        Extrae el SKU del producto desde los atributos, seller_custom_field o variaciones.
        """
        attributes = item_body.get("attributes") or []
        for attr in attributes:
            if attr.get("id") in ("SELLER_SKU", "SKU") and attr.get("value_name"):
                return str(attr["value_name"]).strip()

        if item_body.get("seller_custom_field"):
            return str(item_body["seller_custom_field"]).strip()

        variations = item_body.get("variations") or []
        for var in variations:
            for attr in var.get("attributes") or []:
                if attr.get("id") in ("SELLER_SKU", "SKU") and attr.get("value_name"):
                    return str(attr["value_name"]).strip()
            if var.get("seller_custom_field"):
                return str(var["seller_custom_field"]).strip()

        return None

    async def test_connection(self, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifica la validez del Access Token consultando el perfil del vendedor en Mercado Libre.
        Si está expirado e incluye refresh_token, renueva automáticamente.
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
                if resp.status_code == 401 and self.refresh_token:
                    logger.info("[MLClient] test_connection: Token expirado, renovando con refresh token...")
                    try:
                        tokens = await self.refresh_access_token()
                        token = tokens.get("access_token", token)
                        headers = {"Authorization": f"Bearer {token}"}
                        resp = await client.get(url, headers=headers)
                    except Exception as ref_err:
                        logger.warning(f"[MLClient] Fallo renovación en test_connection: {ref_err}")

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
                        "message": f"Error HTTP {resp.status_code} al consultar Mercado Libre: {resp.text}"
                    }
        except Exception as e:
            return {
                "success": False,
                "status_code": 500,
                "message": f"No se pudo conectar con Mercado Libre: {str(e)}"
            }
