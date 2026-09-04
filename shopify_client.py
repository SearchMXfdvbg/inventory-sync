import logging
import httpx
from typing import Optional, Dict, Any, List
from config import settings

logger = logging.getLogger("inventory_sync.shopify_client")

class ShopifyError(Exception):
    """Clase base para errores de Shopify."""
    pass

class ShopifyTimeoutError(ShopifyError):
    """Se lanza cuando ocurre un timeout en la petición a Shopify."""
    pass

class ShopifyRateLimitError(ShopifyError):
    """Se lanza cuando se alcanza el límite de peticiones (HTTP 429) en Shopify."""
    pass

class ShopifyHTTPError(ShopifyError):
    """Se lanza cuando ocurre un error HTTP (no rate limit)."""
    def __init__(self, message: str, status_code: int, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

class ShopifyGraphQLError(ShopifyError):
    """Se lanza cuando la API de Shopify responde con errores de GraphQL (campo 'errors')."""
    def __init__(self, message: str, errors: list):
        super().__init__(message)
        self.errors = errors

class ShopifyUserError(ShopifyError):
    """Se lanza cuando la API de Shopify responde con errores de usuario (campo 'userErrors')."""
    def __init__(self, message: str, user_errors: list):
        super().__init__(message)
        self.user_errors = user_errors

class ShopifyClient:
    def __init__(
        self,
        shop_domain: Optional[str] = None,
        access_token: Optional[str] = None,
        api_version: Optional[str] = None,
        timeout: float = 10.0
    ):
        self._shop_domain = shop_domain
        self._access_token = access_token
        self._api_version = api_version
        self.timeout = timeout

    @property
    def shop_domain(self) -> str:
        return self._shop_domain or settings.SHOP_DOMAIN

    @shop_domain.setter
    def shop_domain(self, value: str):
        self._shop_domain = value

    @property
    def access_token(self) -> str:
        return self._access_token or settings.SHOPIFY_ACCESS_TOKEN

    @access_token.setter
    def access_token(self, value: str):
        self._access_token = value

    @property
    def api_version(self) -> str:
        return self._api_version or settings.SHOPIFY_API_VERSION

    @api_version.setter
    def api_version(self, value: str):
        self._api_version = value

    @property
    def url(self) -> str:
        return f"https://{self.shop_domain}/admin/api/{self.api_version}/graphql.json"

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }


    async def adjust_inventory(
        self,
        inventory_item_id: str,
        location_id: str,
        delta: int,
        idempotency_key: str,
        reference_uri: str
    ) -> Dict[str, Any]:
        """
        Ajusta la cantidad de inventario para un producto en Shopify usando la mutación GraphQL
        inventoryAdjustQuantities de forma idempotente.
        
        Args:
            inventory_item_id: El ID del item de inventario en Shopify (gid://shopify/InventoryItem/...)
            location_id: El ID de la ubicación en Shopify (gid://shopify/Location/...)
            delta: La cantidad a ajustar (puede ser positiva o negativa)
            idempotency_key: Una clave única para evitar duplicados en reintentos
            reference_uri: URI del documento de referencia externa para auditoría
            
        Returns:
            La respuesta JSON de la API de Shopify
        """
        # Definición de la mutación GraphQL con idempotencia
        mutation = """
        mutation AdjustInventory($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) @idempotent(key: $idempotencyKey) {
          inventoryAdjustQuantities(input: $input) {
            inventoryAdjustmentGroup {
              id
              createdAt
              reason
              referenceDocumentUri
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        
        # Variables de la mutación
        variables = {
            "idempotencyKey": idempotency_key,
            "input": {
                "name": "available",
                "reason": "correction",
                "referenceDocumentUri": reference_uri,
                "changes": [
                    {
                        "delta": delta,
                        "inventoryItemId": inventory_item_id,
                        "locationId": location_id
                    }
                ]
            }
        }
        
        payload = {
            "query": mutation,
            "variables": variables
        }
        
        logger.info(
            f"Enviando ajuste de inventario a Shopify. Item: {inventory_item_id}, Location: {location_id}, "
            f"Delta: {delta}, IdempotencyKey: {idempotency_key}"
        )
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.url, headers=self.headers, json=payload)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout en la petición a Shopify: {exc}")
                raise ShopifyTimeoutError(f"Timeout al comunicarse con Shopify: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al comunicarse con Shopify: {exc}")
                raise ShopifyHTTPError(f"Error de red al comunicarse con Shopify: {exc}", status_code=0) from exc

            # Manejo de rate limit (429)
            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Shopify.")
                raise ShopifyRateLimitError("Límite de peticiones alcanzado en Shopify (HTTP 429).")
                
            # Manejo de otros errores HTTP
            if response.status_code != 200:
                logger.error(f"Error HTTP en Shopify. Status: {response.status_code}, Body: {response.text}")
                raise ShopifyHTTPError(
                    f"Error de servidor al comunicarse con Shopify: {response.status_code}",
                    status_code=response.status_code,
                    response_body=response.text
                )
                
            try:
                res_data = response.json()
            except ValueError as exc:
                logger.error(f"La respuesta de Shopify no es un JSON válido: {response.text}")
                raise ShopifyHTTPError("Respuesta inválida de Shopify (no JSON)", status_code=response.status_code, response_body=response.text) from exc
                
            # 1. Verificar errores generales de GraphQL
            if "errors" in res_data:
                errors = res_data["errors"]
                logger.error(f"Errores de GraphQL devueltos por Shopify: {errors}")
                raise ShopifyGraphQLError(f"Error en la consulta GraphQL de Shopify: {errors[0].get('message', 'Sin mensaje')}", errors)
                
            # 2. Verificar errores de usuario devueltos por la mutación
            data = res_data.get("data", {})
            mutation_result = data.get("inventoryAdjustQuantities") or {}
            user_errors = mutation_result.get("userErrors")
            
            if user_errors:
                logger.error(f"Errores de usuario en la mutación de Shopify: {user_errors}")
                err_msg = ", ".join([f"{err.get('field')}: {err.get('message')}" for err in user_errors])
                raise ShopifyUserError(f"Errores de usuario en ajuste de inventario Shopify: {err_msg}", user_errors)
                
            logger.info(f"Ajuste de inventario en Shopify completado con éxito para Item: {inventory_item_id}")
            return res_data

    async def get_stock(self, inventory_item_id: str, location_id: str) -> int:
        """
        Obtiene el stock disponible ('available') de un item de inventario en Shopify
        para una ubicación dada usando una consulta GraphQL.
        """
        # Aseguramos formato GID
        if not inventory_item_id.startswith("gid://shopify/InventoryItem/"):
            inventory_item_id = f"gid://shopify/InventoryItem/{inventory_item_id}"
        if not location_id.startswith("gid://shopify/Location/"):
            location_id = f"gid://shopify/Location/{location_id}"

        query = """
        query getInventoryAtLocation($inventoryItemId: ID!, $locationId: ID!) {
          inventoryItem(id: $inventoryItemId) {
            id
            inventoryLevel(locationId: $locationId) {
              id
              quantities(names: ["available"]) {
                name
                quantity
              }
            }
          }
        }
        """
        
        variables = {
            "inventoryItemId": inventory_item_id,
            "locationId": location_id
        }
        
        payload = {
            "query": query,
            "variables": variables
        }
        
        logger.info(f"Obteniendo stock de Shopify. Item: {inventory_item_id}, Location: {location_id}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.url, headers=self.headers, json=payload)
            except httpx.TimeoutException as exc:
                logger.error(f"Timeout al obtener stock en Shopify: {exc}")
                raise ShopifyTimeoutError(f"Timeout al comunicarse con Shopify: {exc}") from exc
            except httpx.RequestError as exc:
                logger.error(f"Error de red al obtener stock en Shopify: {exc}")
                raise ShopifyHTTPError(f"Error de red al comunicarse con Shopify: {exc}", status_code=0) from exc

            if response.status_code == 429:
                logger.error("Rate limit (HTTP 429) alcanzado en Shopify.")
                raise ShopifyRateLimitError("Límite de peticiones alcanzado en Shopify (HTTP 429).")
                
            if response.status_code != 200:
                logger.error(f"Error HTTP en Shopify. Status: {response.status_code}, Body: {response.text}")
                raise ShopifyHTTPError(
                    f"Error de servidor al comunicarse con Shopify: {response.status_code}",
                    status_code=response.status_code,
                    response_body=response.text
                )
                
            try:
                res_data = response.json()
            except ValueError as exc:
                logger.error(f"La respuesta de Shopify no es un JSON válido: {response.text}")
                raise ShopifyHTTPError("Respuesta inválida de Shopify (no JSON)", status_code=response.status_code, response_body=response.text) from exc
                
            if "errors" in res_data:
                errors = res_data["errors"]
                logger.error(f"Errores de GraphQL devueltos por Shopify: {errors}")
                raise ShopifyGraphQLError(f"Error en la consulta GraphQL de Shopify: {errors[0].get('message', 'Sin mensaje')}", errors)
                
            data = res_data.get("data", {})
            inventory_item = data.get("inventoryItem")
            if not inventory_item:
                logger.error(f"Item de inventario no encontrado: {inventory_item_id}")
                return 0

            inventory_level = inventory_item.get("inventoryLevel")
            if not inventory_level:
                logger.info(f"No hay nivel de inventario para Item: {inventory_item_id} en Location: {location_id}")
                return 0
                
            quantities = inventory_level.get("quantities") or []
            for qty in quantities:
                if qty.get("name") == "available":
                    return int(qty.get("quantity", 0))
                    
            return 0

    async def get_products_debug(self) -> Dict[str, Any]:
        """
        Consulta todos los productos y ubicaciones de Shopify para facilitar la depuración y mapeo de IDs.
        """
        query = """
        query {
          products(first: 50) {
            nodes {
              title
              variants(first: 50) {
                nodes {
                  title
                  sku
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
          locations(first: 10) {
            nodes {
              id
              name
              isActive
            }
          }
        }
        """
        payload = {"query": query}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.url, headers=self.headers, json=payload)
            if response.status_code != 200:
                raise ShopifyHTTPError(f"Error HTTP {response.status_code}", response.status_code, response.text)
            return response.json()

    async def get_catalog_products(self) -> List[Dict[str, Any]]:
        """
        Consulta productos con variantes, pesos, tags, imágenes y metadatos para el editor de catálogo.
        """
        query = """
        query {
          products(first: 50) {
            nodes {
              id
              title
              vendor
              tags
              featuredImage {
                url
              }
              variants(first: 50) {
                nodes {
                  id
                  title
                  sku
                  price
                  weight
                  weightUnit
                  inventoryItem {
                    id
                  }
                }
              }
              metafields(first: 10, namespace: "custom") {
                nodes {
                  key
                  value
                }
              }
            }
          }
        }
        """
        payload = {"query": query}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.url, headers=self.headers, json=payload)
            if response.status_code != 200:
                raise ShopifyHTTPError(f"Error HTTP {response.status_code}", response.status_code, response.text)
            res_data = response.json()
            if "errors" in res_data:
                raise ShopifyGraphQLError(f"Error en GraphQL: {res_data['errors'][0].get('message')}", res_data["errors"])
            
            nodes = res_data.get("data", {}).get("products", {}).get("nodes", [])
            formatted = []
            for p in nodes:
                variants = p.get("variants", {}).get("nodes", [])
                metafields_list = p.get("metafields", {}).get("nodes", []) if p.get("metafields") else []
                meta_dict = {m.get("key"): m.get("value") for m in metafields_list}
                
                dims = meta_dict.get("dimensions", "")
                length, width, height = None, None, None
                if dims and "x" in dims:
                    parts = dims.split("x")
                    if len(parts) == 3:
                        try:
                            length, width, height = float(parts[0]), float(parts[1]), float(parts[2])
                        except Exception:
                            pass
                
                first_variant = variants[0] if variants else {}
                weight = first_variant.get("weight")
                weight_unit = first_variant.get("weightUnit") or "GRAMS"
                
                warranty = meta_dict.get("warranty") or ""
                target_audience = meta_dict.get("target_audience") or ""
                
                tags = p.get("tags") or []
                tiktok_ready = bool(weight and weight > 0 and (dims or ("tiktok_ready" in tags)))
                featured_image = p.get("featuredImage") or {}
                
                formatted.append({
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "vendor": p.get("vendor"),
                    "tags": tags,
                    "image_url": featured_image.get("url"),
                    "variants": variants,
                    "weight": weight,
                    "weight_unit": weight_unit,
                    "length": length,
                    "width": width,
                    "height": height,
                    "warranty": warranty,
                    "target_audience": target_audience,
                    "tiktok_ready": tiktok_ready
                })
            return formatted

    async def bulk_update_attributes(self, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Actualiza peso en variantes, y vendor, tags y dimensiones/garantía en productos.
        """
        product_ids = update_data.get("product_ids") or []
        variant_ids = update_data.get("variant_ids") or []
        brand = update_data.get("brand")
        weight = update_data.get("weight")
        weight_unit = update_data.get("weight_unit") or "GRAMS"
        length = update_data.get("length")
        width = update_data.get("width")
        height = update_data.get("height")
        warranty_type = update_data.get("warranty_type")
        warranty_period = update_data.get("warranty_period")
        target_audience = update_data.get("target_audience")
        
        dimensions_str = f"{length}x{width}x{height}" if (length and width and height) else None
        warranty_str = f"{warranty_type} - {warranty_period}" if (warranty_type and warranty_period) else (warranty_period or warranty_type)
        
        updated_count = 0
        details = []
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for pid in product_ids:
                product_input: Dict[str, Any] = {"id": pid}
                if brand:
                    product_input["vendor"] = brand
                
                tags_to_add = ["tiktok_ready"]
                if dimensions_str:
                    tags_to_add.append(f"dim:{dimensions_str}cm")
                if warranty_str:
                    tags_to_add.append(f"garantia:{warranty_period or '30dias'}")
                if target_audience:
                    tags_to_add.append(f"edad:{target_audience}")
                    
                product_input["tags"] = tags_to_add
                
                prod_mutation = """
                mutation productUpdate($input: ProductInput!) {
                  productUpdate(input: $input) {
                    product {
                      id
                      title
                      vendor
                      tags
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
                """
                try:
                    res = await client.post(self.url, headers=self.headers, json={"query": prod_mutation, "variables": {"input": product_input}})
                    if res.status_code == 200:
                        prod_data = res.json()
                        p_obj = prod_data.get("data", {}).get("productUpdate", {}).get("product")
                        if p_obj:
                            updated_count += 1
                            details.append({"id": pid, "status": "updated", "title": p_obj.get("title")})
                except Exception as e:
                    logger.error(f"Error al actualizar producto {pid}: {e}")
                    details.append({"id": pid, "status": "error", "error": str(e)})

                if weight is not None and weight > 0:
                    var_query = """
                    query getVariants($id: ID!) {
                      product(id: $id) {
                        variants(first: 50) {
                          nodes {
                            id
                          }
                        }
                      }
                    }
                    """
                    try:
                        v_res = await client.post(self.url, headers=self.headers, json={"query": var_query, "variables": {"id": pid}})
                        if v_res.status_code == 200:
                            v_data = v_res.json().get("data") or {}
                            product_node = v_data.get("product") or {}
                            v_nodes = product_node.get("variants", {}).get("nodes", []) if product_node else []
                            var_mutation = """
                            mutation productVariantUpdate($input: ProductVariantInput!) {
                              productVariantUpdate(input: $input) {
                                productVariant {
                                  id
                                  weight
                                  weightUnit
                                }
                                userErrors {
                                  field
                                  message
                                }
                              }
                            }
                            """
                            for v in v_nodes:
                                vid = v.get("id")
                                if not variant_ids or vid in variant_ids:
                                    v_input = {
                                        "id": vid,
                                        "weight": float(weight),
                                        "weightUnit": weight_unit
                                    }
                                    await client.post(self.url, headers=self.headers, json={"query": var_mutation, "variables": {"input": v_input}})
                    except Exception as e:
                        logger.error(f"Error al actualizar variantes de {pid}: {e}")
                        
        return {
            "success": True,
            "updated_count": updated_count,
            "message": f"{updated_count} productos actualizados con especificaciones para TikTok Shop",
            "details": details
        }

    async def test_connection(self, shop_domain: Optional[str] = None, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifica la conectividad y validez de las credenciales contra la GraphQL Admin API de Shopify.
        """
        domain = (shop_domain or self.shop_domain or "").strip()
        token = (access_token or self.access_token or "").strip()

        if not domain or "myshopify.com" not in domain or domain == "your-shop.myshopify.com":
            return {
                "success": False,
                "status_code": 400,
                "message": "Ingrese un dominio válido de Shopify (ej: mi-tienda.myshopify.com)."
            }

        if not token or token.startswith("shpat_xxxx") or len(token) < 15:
            return {
                "success": False,
                "status_code": 400,
                "message": "Ingrese un Admin API Access Token válido (ej: shpat_...)."
            }

        url = f"https://{domain}/admin/api/{self.api_version}/graphql.json"
        headers = {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json"
        }
        query = "{ shop { name myshopifyDomain currencyCode email } }"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json={"query": query})
                if resp.status_code == 200:
                    data = resp.json()
                    if "errors" in data:
                        return {
                            "success": False,
                            "status_code": 400,
                            "message": f"Shopify rechazó la consulta: {data['errors'][0].get('message', 'Error desconocido')}"
                        }
                    shop_info = data.get("data", {}).get("shop", {})
                    return {
                        "success": True,
                        "status_code": 200,
                        "shop_name": shop_info.get("name"),
                        "domain": shop_info.get("myshopifyDomain"),
                        "currency": shop_info.get("currencyCode"),
                        "message": f"¡Conexión exitosa con Shopify! Tienda: {shop_info.get('name')}"
                    }
                elif resp.status_code == 401:
                    return {
                        "success": False,
                        "status_code": 401,
                        "message": "Error 401: Access Token de Shopify inválido o revocado."
                    }
                elif resp.status_code == 404:
                    return {
                        "success": False,
                        "status_code": 404,
                        "message": f"Error 404: No se encontró la tienda '{domain}'. Verifique el subdominio de Shopify."
                    }
                else:
                    return {
                        "success": False,
                        "status_code": resp.status_code,
                        "message": f"Error HTTP {resp.status_code} al contactar Shopify."
                    }
        except Exception as e:
            return {
                "success": False,
                "status_code": 500,
                "message": f"No se pudo contactar a Shopify: {str(e)}"
            }



