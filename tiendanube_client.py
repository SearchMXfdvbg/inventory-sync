import os
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any, List
import httpx

try:
    from config import settings
except ImportError:
    settings = None

logger = logging.getLogger("inventory_sync.tiendanube")


class TiendanubeClientError(Exception):
    """Excepción para errores de la API de Tiendanube (Nuvemshop)."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class TiendanubeClient:
    """
    Cliente oficial para la API de Tiendanube / Nuvemshop.
    Gestiona autenticación OAuth 2.0, consulta y actualización de stock, catálogo y órdenes.
    """
    API_BASE_URL: str = "https://api.tiendanube.com/v1"
    AUTH_URL: str = "https://www.tiendanube.com/apps"
    TOKEN_URL: str = "https://www.tiendanube.com/apps/authorize/token"

    def __init__(
        self,
        store_id: Optional[str] = None,
        access_token: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        user_agent: Optional[str] = None,
        timeout: float = 12.0,
    ):
        self._store_id = str(store_id).strip() if store_id is not None else None
        self._access_token = str(access_token).strip() if access_token is not None else None
        self._client_id = str(client_id).strip() if client_id is not None else None
        self._client_secret = str(client_secret).strip() if client_secret is not None else None
        self._user_agent = str(user_agent).strip() if user_agent is not None else None
        self.timeout = float(timeout)

    @property
    def store_id(self) -> str:
        if self._store_id:
            return self._store_id
        val = getattr(settings, "TIENDANUBE_STORE_ID", "") or os.environ.get("TIENDANUBE_STORE_ID", "")
        return str(val).strip() if val else ""

    @store_id.setter
    def store_id(self, value: Optional[str]):
        self._store_id = str(value).strip() if value else None

    @property
    def access_token(self) -> str:
        if self._access_token:
            return self._access_token
        val = getattr(settings, "TIENDANUBE_ACCESS_TOKEN", "") or os.environ.get("TIENDANUBE_ACCESS_TOKEN", "")
        return str(val).strip() if val else ""

    @access_token.setter
    def access_token(self, value: Optional[str]):
        self._access_token = str(value).strip() if value else None

    @property
    def client_id(self) -> str:
        if self._client_id:
            return self._client_id
        val = getattr(settings, "TIENDANUBE_CLIENT_ID", "") or os.environ.get("TIENDANUBE_CLIENT_ID", "")
        return str(val).strip() if val else ""

    @client_id.setter
    def client_id(self, value: Optional[str]):
        self._client_id = str(value).strip() if value else None

    @property
    def client_secret(self) -> str:
        if self._client_secret:
            return self._client_secret
        val = getattr(settings, "TIENDANUBE_CLIENT_SECRET", "") or os.environ.get("TIENDANUBE_CLIENT_SECRET", "")
        return str(val).strip() if val else ""

    @client_secret.setter
    def client_secret(self, value: Optional[str]):
        self._client_secret = str(value).strip() if value else None

    @property
    def user_agent(self) -> str:
        if self._user_agent:
            return self._user_agent
        val = getattr(settings, "TIENDANUBE_USER_AGENT", "") or os.environ.get("TIENDANUBE_USER_AGENT", "")
        return str(val).strip() if val else "InventorySync (soporte@inventorysync.io)"

    @user_agent.setter
    def user_agent(self, value: Optional[str]):
        self._user_agent = str(value).strip() if value else None

    @property
    def is_configured(self) -> bool:
        """
        Determina si el cliente cuenta con store_id y token válidos no enmascarados.
        """
        sid = self.store_id
        tok = self.access_token
        return bool(sid and tok and "•" not in tok)

    def get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """
        Genera los encabezados requeridos por la API de Tiendanube.
        NOTA CRÍTICA: Tiendanube exige encabezado 'Authentication: bearer <token>' (no 'Authorization')
        y el User-Agent es obligatorio.
        """
        tok = access_token or self.access_token
        return {
            "Authentication": f"bearer {tok}",
            "User-Agent": self.user_agent,
            "Content-Type": "application/json",
        }

    @property
    def headers(self) -> Dict[str, str]:
        return self.get_headers()

    def get_authorize_url(self, state: str = "") -> str:
        """
        Construye la URL oficial para que el comerciante autorice la aplicación en Tiendanube.
        """
        cid = self.client_id
        if not cid:
            raise TiendanubeClientError("Falta client_id de Tiendanube para generar URL de autorización.")
        url = f"{self.AUTH_URL}/{cid}/authorize"
        if state and state.strip():
            url += f"?state={state.strip()}"
        return url

    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Intercambia el authorization_code por un token de acceso permanente de Tiendanube.
        """
        cid = self.client_id
        csec = self.client_secret
        if not cid or not csec:
            raise TiendanubeClientError("Faltan client_id y/o client_secret de Tiendanube para canjear código.")
        if not code or not code.strip():
            raise TiendanubeClientError("El código de autorización no puede estar vacío.")

        payload = {
            "client_id": cid,
            "client_secret": csec,
            "grant_type": "authorization_code",
            "code": code.strip(),
        }
        headers = {
            "User-Agent": self.user_agent,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.TOKEN_URL, json=payload, headers=headers)
                if res.status_code != 200:
                    raise TiendanubeClientError(
                        f"Error al canjear código en Tiendanube ({res.status_code}): {res.text}",
                        status_code=res.status_code,
                        response_body=res.text,
                    )
                data = res.json()
                return {
                    "access_token": data.get("access_token", ""),
                    "store_id": str(data.get("user_id", "")),
                    "scope": data.get("scope", ""),
                    "token_type": data.get("token_type", "bearer"),
                }
        except httpx.RequestError as exc:
            raise TiendanubeClientError(f"Error de red al canjear código en Tiendanube: {exc}")

    async def test_connection(
        self,
        store_id: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Valida las credenciales reales de Tiendanube consultando el endpoint GET /v1/{store_id}/store.
        """
        sid = str(store_id or self.store_id or "").strip()
        tok = str(access_token or self.access_token or "").strip()

        if not sid:
            return {
                "success": False,
                "status_code": 400,
                "message": "Falta el Store ID (User ID) de Tiendanube.",
            }
        if not tok or "••" in tok or "•" in tok:
            return {
                "success": False,
                "status_code": 400,
                "message": "Falta el Access Token de Tiendanube o contiene caracteres enmascarados.",
            }

        url = f"{self.API_BASE_URL}/{sid}/store"
        headers = self.get_headers(access_token=tok)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    raw_name = data.get("name")
                    if isinstance(raw_name, dict):
                        store_name = raw_name.get("es") or raw_name.get("pt") or next(iter(raw_name.values()), "")
                    else:
                        store_name = str(raw_name or "")

                    domain = str(data.get("original_domain") or data.get("url") or "")
                    return {
                        "success": True,
                        "status_code": 200,
                        "store_id": str(sid),
                        "store_name": store_name,
                        "domain": domain,
                        "message": f"Conexión exitosa con la tienda '{store_name}' (ID: {sid}) en Tiendanube.",
                    }
                elif res.status_code in (401, 403):
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "message": f"Credenciales de Tiendanube inválidas o token expirado/sin permisos ({res.status_code}): {res.text}",
                    }
                elif res.status_code == 404:
                    return {
                        "success": False,
                        "status_code": 404,
                        "message": f"Tienda {sid} no encontrada en Tiendanube. Verifica el Store ID.",
                    }
                else:
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "message": f"Error de respuesta en Tiendanube ({res.status_code}): {res.text}",
                    }
        except httpx.TimeoutException:
            return {
                "success": False,
                "status_code": 408,
                "message": f"Timeout al conectar con la API de Tiendanube tras {self.timeout} segundos.",
            }
        except httpx.RequestError as exc:
            return {
                "success": False,
                "status_code": 500,
                "message": f"Error de red al conectar con Tiendanube: {str(exc)}",
            }
        except Exception as exc:
            return {
                "success": False,
                "status_code": 500,
                "message": f"Error inesperado al verificar conexión con Tiendanube: {str(exc)}",
            }

    async def get_products(self, page: int = 1, per_page: int = 50) -> List[Dict[str, Any]]:
        """
        Obtiene el catálogo de productos paginado desde Tiendanube.
        Retorna lista vacía si la página solicitada responde 404 (más allá de la última página).
        """
        if not self.is_configured:
            raise TiendanubeClientError("Tiendanube no está configurado (faltan store_id o access_token).")

        url = f"{self.API_BASE_URL}/{self.store_id}/products"
        params = {"page": max(1, int(page)), "per_page": max(1, min(200, int(per_page)))}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, params=params, headers=self.headers)
                if res.status_code == 404:
                    return []
                if res.status_code != 200:
                    raise TiendanubeClientError(
                        f"Error al obtener productos de Tiendanube ({res.status_code}): {res.text}",
                        status_code=res.status_code,
                        response_body=res.text,
                    )
                data = res.json()
                return data if isinstance(data, list) else []
        except httpx.RequestError as exc:
            raise TiendanubeClientError(f"Error de red al obtener productos de Tiendanube: {exc}")

    @staticmethod
    def _extract_product_name(product: Dict[str, Any]) -> str:
        """Extrae el nombre en español o primer idioma disponible del producto."""
        raw_name = product.get("name")
        if isinstance(raw_name, dict):
            return str(raw_name.get("es") or raw_name.get("pt") or next(iter(raw_name.values()), "")).strip()
        return str(raw_name or "").strip()

    @classmethod
    def _match_variant_in_product(cls, product: Dict[str, Any], target_sku: str) -> Optional[Dict[str, Any]]:
        """Busca una variante cuyo SKU coincida con target_sku dentro de la estructura de producto."""
        pid = product.get("id")
        if not pid:
            return None
        variants = product.get("variants") or []
        target_clean = str(target_sku).strip().lower()

        for variant in variants:
            if not isinstance(variant, dict):
                continue
            v_sku = str(variant.get("sku") or "").strip()
            if v_sku.lower() == target_clean:
                raw_stock = variant.get("stock")
                stock_val = int(raw_stock) if raw_stock is not None else 0
                return {
                    "product_id": str(pid),
                    "variant_id": str(variant.get("id", "")),
                    "sku": v_sku or target_sku,
                    "stock": stock_val,
                    "name": cls._extract_product_name(product),
                }
        return None

    async def find_variant_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        """
        Localiza la variante y producto asociados a un SKU en Tiendanube.
        1. Consulta GET /v1/{store_id}/products/sku/{sku} (endpoint oficial de búsqueda por SKU).
        2. Si no lo halla o responde 404/vacío, recorre get_products(page=1, per_page=100) como respaldo.
        Retorna dict con {product_id, variant_id, sku, stock, name} o None si no existe.
        """
        if not self.is_configured:
            raise TiendanubeClientError("Tiendanube no está configurado (faltan store_id o access_token).")

        clean_sku = str(sku).strip()
        if not clean_sku:
            return None

        # 1. Búsqueda directa por SKU
        url = f"{self.API_BASE_URL}/{self.store_id}/products/sku/{clean_sku}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, dict):
                        match = self._match_variant_in_product(data, clean_sku)
                        if match:
                            return match
                    elif isinstance(data, list):
                        for prod in data:
                            if isinstance(prod, dict):
                                match = self._match_variant_in_product(prod, clean_sku)
                                if match:
                                    return match
        except httpx.RequestError as exc:
            logger.warning(f"Error de red consultando SKU '{clean_sku}' directo en Tiendanube: {exc}")

        # 2. Respaldo por paginación del catálogo
        try:
            products = await self.get_products(page=1, per_page=100)
            for prod in products:
                if isinstance(prod, dict):
                    match = self._match_variant_in_product(prod, clean_sku)
                    if match:
                        return match
        except Exception as exc:
            logger.warning(f"Error en respaldo de catálogo por SKU '{clean_sku}' en Tiendanube: {exc}")

        return None

    async def get_stock(self, sku: str, variant_ref: Optional[str] = None) -> int:
        """
        Consulta el stock numérico disponible para un SKU.
        Si se especifica variant_ref en formato 'product_id:variant_id', consulta directamente la variante.
        De lo contrario, localiza la variante mediante find_variant_by_sku.
        """
        if not self.is_configured:
            raise TiendanubeClientError("Tiendanube no está configurado (faltan store_id o access_token).")

        if variant_ref and ":" in str(variant_ref):
            parts = str(variant_ref).split(":", 1)
            pid = parts[0].strip()
            vid = parts[1].strip()
            if pid and vid:
                url = f"{self.API_BASE_URL}/{self.store_id}/products/{pid}/variants/{vid}"
                try:
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        res = await client.get(url, headers=self.headers)
                        if res.status_code == 200:
                            v_data = res.json()
                            raw_stock = v_data.get("stock")
                            return int(raw_stock) if raw_stock is not None else 0
                        elif res.status_code != 404:
                            raise TiendanubeClientError(
                                f"Error al consultar stock de variante {vid} ({res.status_code}): {res.text}",
                                status_code=res.status_code,
                                response_body=res.text,
                            )
                except httpx.RequestError as exc:
                    raise TiendanubeClientError(f"Error de red al consultar variante {variant_ref}: {exc}")

        variant_info = await self.find_variant_by_sku(sku)
        if not variant_info:
            raise TiendanubeClientError(f"No se encontró variante para SKU '{sku}' en Tiendanube.")
        return int(variant_info.get("stock", 0))

    async def update_stock(
        self,
        sku: str,
        quantity: int,
        variant_ref: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Actualiza el stock disponible de una variante en Tiendanube mediante:
        PUT https://api.tiendanube.com/v1/{store_id}/products/{pid}/variants/{vid}
        Body: {"stock": max(0, int(quantity))}
        """
        if not self.is_configured:
            raise TiendanubeClientError("Tiendanube no está configurado (faltan store_id o access_token).")

        pid: Optional[str] = None
        vid: Optional[str] = None

        if variant_ref and ":" in str(variant_ref):
            parts = str(variant_ref).split(":", 1)
            p_cand, v_cand = parts[0].strip(), parts[1].strip()
            if p_cand and v_cand:
                pid = p_cand
                vid = v_cand

        if not pid or not vid:
            variant_info = await self.find_variant_by_sku(sku)
            if not variant_info:
                raise TiendanubeClientError(
                    f"No se encontró variante para SKU '{sku}' en Tiendanube para actualizar stock."
                )
            pid = str(variant_info["product_id"])
            vid = str(variant_info["variant_id"])

        new_stock = max(0, int(quantity))
        url = f"{self.API_BASE_URL}/{self.store_id}/products/{pid}/variants/{vid}"
        payload = {"stock": new_stock}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.put(url, json=payload, headers=self.headers)
                if res.status_code != 200:
                    raise TiendanubeClientError(
                        f"Error al actualizar stock en Tiendanube ({res.status_code}): {res.text}",
                        status_code=res.status_code,
                        response_body=res.text,
                    )

                logger.info(
                    f"[Tiendanube] Stock actualizado para SKU '{sku}' "
                    f"(PID: {pid}, VID: {vid}) -> {new_stock} unidades."
                )
                return {
                    "success": True,
                    "sku": sku,
                    "new_stock": new_stock,
                    "product_id": str(pid),
                    "variant_id": str(vid),
                    "variant_ref": f"{pid}:{vid}",
                }
        except httpx.RequestError as exc:
            raise TiendanubeClientError(f"Error de red al actualizar stock en Tiendanube: {exc}")

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Obtiene los datos detallados de una orden en Tiendanube mediante:
        GET https://api.tiendanube.com/v1/{store_id}/orders/{order_id}
        """
        if not self.is_configured:
            raise TiendanubeClientError("Tiendanube no está configurado (faltan store_id o access_token).")

        oid = str(order_id).strip()
        if not oid:
            raise TiendanubeClientError("El order_id no puede estar vacío.")

        url = f"{self.API_BASE_URL}/{self.store_id}/orders/{oid}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=self.headers)
                if res.status_code != 200:
                    raise TiendanubeClientError(
                        f"Error al obtener la orden {oid} en Tiendanube ({res.status_code}): {res.text}",
                        status_code=res.status_code,
                        response_body=res.text,
                    )
                return res.json()
        except httpx.RequestError as exc:
            raise TiendanubeClientError(f"Error de red al obtener orden {oid} en Tiendanube: {exc}")

    @staticmethod
    def verify_webhook_hmac(raw_body: bytes, hmac_header: str, secret: str) -> bool:
        """
        Verifica la autenticidad de un webhook entrante de Tiendanube calculando el HMAC-SHA256
        y comparándolo de forma segura contra el encabezado 'x-linkedstore-hmac-sha256'.
        """
        if not raw_body or not hmac_header or not secret:
            return False
        try:
            computed_signature = hmac.new(
                secret.strip().encode("utf-8"),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(computed_signature, hmac_header.strip())
        except Exception as exc:
            logger.warning(f"Error verificando firma HMAC de webhook Tiendanube: {exc}")
            return False


# Instancia global por defecto
tiendanube_client = TiendanubeClient()
