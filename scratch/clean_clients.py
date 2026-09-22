import re

def clean_client(filepath, exception_name):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove mock dict (handle indentation gracefully)
    content = re.sub(r'(\n\s*self\._mock_stocks:\s*Dict\[str,\s*int\]\s*=\s*\{[\s\S]*?\})', '', content)
    
    # Replace get_access_token mock return
    content = re.sub(
        r'(        if not self\.is_configured:\n            return "mock[^"]*"\n)',
        f'        if not self.is_configured:\\n            raise {exception_name}("API no configurada.")\\n',
        content
    )
    
    # Remove mock fallback in update_stock
    content = re.sub(
        r'(\n\s*if not self\.is_configured:\n\s*self\._mock_stocks\[sku\] = quantity\n[^\n]*\n\s*return True\n)',
        '',
        content
    )
    content = re.sub(
        r'(\n\s*if not self\.is_configured:\n\s*self\._mock_stocks\[sku\] = quantity\n[^\n]*\n\s*return \{[\s\S]*?\}\n)',
        '',
        content
    )
    
    # Remove mock fallback in get_stock
    content = re.sub(
        r'(\n\s*if not self\.is_configured:\n\s*return self\._mock_stocks\.get\(sku, 10\)\n)',
        '',
        content
    )
    content = re.sub(
        r'return self\._mock_stocks\.get\(sku, 10\)',
        'return 0',
        content
    )
    
    # Remove mock fallback in get_order
    content = re.sub(
        r'(\n\s*if not self\.is_configured:\n\s*return \{[\s\S]*?\}\n\s*\]\n\s*\})',
        '',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

clean_client('amazon_client.py', 'AmazonClientError')
clean_client('ebay_client.py', 'EbayClientError')
clean_client('kaufland_client.py', 'KauflandClientError')
