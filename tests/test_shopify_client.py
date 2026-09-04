import pytest
from unittest.mock import patch, AsyncMock
import httpx
from shopify_client import (
    ShopifyClient,
    ShopifyTimeoutError,
    ShopifyRateLimitError,
    ShopifyHTTPError,
    ShopifyGraphQLError,
    ShopifyUserError
)

@pytest.mark.asyncio
async def test_adjust_inventory_success():
    client = ShopifyClient(shop_domain="test.myshopify.com", access_token="test_token", api_version="2026-07")
    
    mock_response_data = {
        "data": {
            "inventoryAdjustQuantities": {
                "inventoryAdjustmentGroup": {
                    "id": "gid://shopify/InventoryAdjustmentGroup/111",
                    "createdAt": "2026-08-30T10:00:00Z",
                    "reason": "correction",
                    "referenceDocumentUri": "ref_uri"
                },
                "userErrors": []
            }
        }
    }
    
    mock_response = httpx.Response(200, json=mock_response_data)
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        result = await client.adjust_inventory(
            inventory_item_id="gid://shopify/InventoryItem/123",
            location_id="gid://shopify/Location/456",
            delta=5,
            idempotency_key="key-123",
            reference_uri="ref_uri"
        )
        
        assert result == mock_response_data
        mock_post.assert_called_once()
        # Verificar que se mandaron las cabeceras y payload correctos
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["X-Shopify-Access-Token"] == "test_token"
        assert "mutation AdjustInventory" in kwargs["json"]["query"]
        assert kwargs["json"]["variables"]["idempotencyKey"] == "key-123"

@pytest.mark.asyncio
async def test_adjust_inventory_graphql_errors():
    client = ShopifyClient(shop_domain="test.myshopify.com", access_token="test_token")
    
    mock_response_data = {
        "errors": [
            {
                "message": "Parse error on \")\""
            }
        ]
    }
    mock_response = httpx.Response(200, json=mock_response_data)
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(ShopifyGraphQLError) as exc_info:
            await client.adjust_inventory(
                inventory_item_id="gid://shopify/InventoryItem/123",
                location_id="gid://shopify/Location/456",
                delta=5,
                idempotency_key="key-123",
                reference_uri="ref_uri"
            )
        assert "Parse error on" in str(exc_info.value)

@pytest.mark.asyncio
async def test_adjust_inventory_user_errors():
    client = ShopifyClient()
    
    mock_response_data = {
        "data": {
            "inventoryAdjustQuantities": {
                "inventoryAdjustmentGroup": None,
                "userErrors": [
                    {
                        "field": ["input", "changes", "0", "inventoryItemId"],
                        "message": "Inventory item does not exist."
                    }
                ]
            }
        }
    }
    mock_response = httpx.Response(200, json=mock_response_data)
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(ShopifyUserError) as exc_info:
            await client.adjust_inventory(
                inventory_item_id="gid://shopify/InventoryItem/123",
                location_id="gid://shopify/Location/456",
                delta=5,
                idempotency_key="key-123",
                reference_uri="ref_uri"
            )
        assert "Inventory item does not exist" in str(exc_info.value)

@pytest.mark.asyncio
async def test_adjust_inventory_rate_limit():
    client = ShopifyClient()
    mock_response = httpx.Response(429)
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(ShopifyRateLimitError):
            await client.adjust_inventory(
                inventory_item_id="gid://shopify/InventoryItem/123",
                location_id="gid://shopify/Location/456",
                delta=5,
                idempotency_key="key-123",
                reference_uri="ref_uri"
            )

@pytest.mark.asyncio
async def test_adjust_inventory_http_error():
    client = ShopifyClient()
    mock_response = httpx.Response(500, content=b"Internal Server Error")
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        with pytest.raises(ShopifyHTTPError) as exc_info:
            await client.adjust_inventory(
                inventory_item_id="gid://shopify/InventoryItem/123",
                location_id="gid://shopify/Location/456",
                delta=5,
                idempotency_key="key-123",
                reference_uri="ref_uri"
            )
        assert exc_info.value.status_code == 500
        assert "500" in str(exc_info.value)

@pytest.mark.asyncio
async def test_adjust_inventory_timeout():
    client = ShopifyClient()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Connection timed out")
        
        with pytest.raises(ShopifyTimeoutError):
            await client.adjust_inventory(
                inventory_item_id="gid://shopify/InventoryItem/123",
                location_id="gid://shopify/Location/456",
                delta=5,
                idempotency_key="key-123",
                reference_uri="ref_uri"
            )
