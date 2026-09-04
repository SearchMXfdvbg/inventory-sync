import pytest
from unittest.mock import patch, AsyncMock
import httpx
from ml_client import (
    MLClient,
    MLTimeoutError,
    MLRateLimitError,
    MLHTTPError
)

@pytest.mark.asyncio
async def test_update_stock_success():
    client = MLClient(access_token="test_ml_token")
    mock_response_data = {"id": "MLM123456", "available_quantity": 10}
    mock_response = httpx.Response(200, json=mock_response_data)
    
    with patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put:
        mock_put.return_value = mock_response
        
        result = await client.update_stock(item_id="MLM123456", quantity=10)
        
        assert result == mock_response_data
        mock_put.assert_called_once_with(
            "https://api.mercadolibre.com/items/MLM123456",
            headers={"Authorization": "Bearer test_ml_token", "Content-Type": "application/json"},
            json={"available_quantity": 10}
        )

@pytest.mark.asyncio
async def test_update_stock_rate_limit():
    client = MLClient()
    mock_response = httpx.Response(429)
    
    with patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put:
        mock_put.return_value = mock_response
        
        with pytest.raises(MLRateLimitError):
            await client.update_stock(item_id="MLM123456", quantity=10)

@pytest.mark.asyncio
async def test_update_stock_http_error():
    client = MLClient()
    mock_response = httpx.Response(400, content=b"Bad Request")
    
    with patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put:
        mock_put.return_value = mock_response
        
        with pytest.raises(MLHTTPError) as exc_info:
            await client.update_stock(item_id="MLM123456", quantity=10)
        assert exc_info.value.status_code == 400

@pytest.mark.asyncio
async def test_update_stock_timeout():
    client = MLClient()
    
    with patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put:
        mock_put.side_effect = httpx.TimeoutException("Connection timed out")
        
        with pytest.raises(MLTimeoutError):
            await client.update_stock(item_id="MLM123456", quantity=10)


@pytest.mark.asyncio
async def test_get_order_success():
    client = MLClient(access_token="test_ml_token")
    mock_response_data = {
        "id": 123456789,
        "status": "paid",
        "order_items": [
            {
                "item": {
                    "id": "MLM123456",
                    "title": "Laptop Gamer Antigravity",
                    "seller_custom_field": "SKU001"
                },
                "quantity": 1
            }
        ]
    }
    mock_response = httpx.Response(200, json=mock_response_data)
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        result = await client.get_order(order_id="123456789")
        
        assert result == mock_response_data
        mock_get.assert_called_once_with(
            "https://api.mercadolibre.com/orders/123456789",
            headers={"Authorization": "Bearer test_ml_token", "Content-Type": "application/json"}
        )

@pytest.mark.asyncio
async def test_get_order_rate_limit():
    client = MLClient()
    mock_response = httpx.Response(429)
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        with pytest.raises(MLRateLimitError):
            await client.get_order(order_id="123456789")

@pytest.mark.asyncio
async def test_get_order_http_error():
    client = MLClient()
    mock_response = httpx.Response(404, content=b"Not Found")
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        with pytest.raises(MLHTTPError) as exc_info:
            await client.get_order(order_id="123456789")
        assert exc_info.value.status_code == 404

@pytest.mark.asyncio
async def test_get_order_timeout():
    client = MLClient()
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Connection timed out")
        
        with pytest.raises(MLTimeoutError):
            await client.get_order(order_id="123456789")
