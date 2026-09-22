import os
import re

def clean_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content, flags=re.MULTILINE)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned {filepath}")
    else:
        print(f"No changes in {filepath}")

# Config
clean_file('config.py', [
    (r'SAE_REPOSITORY_TYPE:\s*str\s*=\s*"mock"', 'SAE_REPOSITORY_TYPE: str = "database"')
])

# auth.py (remove demo mode bypass)
auth_replacements = [
    (r'\s*x_demo_mode = request.headers.get\("X-Demo-Mode"\)\s*if x_demo_mode == "true":\s*logger.info\("Bypass de autenticación por Demo Mode."\)\s*return \{[^\}]+\}\s*', '\n'),
    (r'\s*# Demo Mode Bypass Removed.*?\n', '\n'),
    (r'\s*\* Permite bypass con header \'X-Demo-Mode: true\'.\s*', '\n')
]
clean_file('auth.py', auth_replacements)

# api.ts (remove demo mode logic)
api_replacements = [
    (r'export const isDemoMode = \(\): boolean => false;\n', ''),
    (r'export const setDemoMode = \(_enabled: boolean\): void => \{\n.*?\n\};\n', ''),
    (r"\s*'demo_mode',\n", '\n'),
    (r"\s*// Como Vercel no tiene base de datos persistente.*?\n", '\n')
]
clean_file('api.ts', api_replacements)

# amazon_client.py
amazon_replacements = [
    (r'\s*self._mock_stocks:\s*Dict\[str,\s*int\]\s*=\s*\{[\s\S]*?\}\s*', '\n        pass\n'),
    (r'\s*if not self.is_configured:\n\s*return "mock-lwa-access-token"\n', '\n        if not self.is_configured:\n            raise AmazonClientError("Amazon SP-API no está configurado.")\n'),
    (r'\s*if not self.is_configured:\n\s*self._mock_stocks\[sku\] = quantity\n.*?\n\s*return \{[\s\S]*?\}\n', '\n'),
    (r'\s*if not self.is_configured:\n\s*return self._mock_stocks.get\(sku, 10\)\n', '\n'),
    (r'\s*return self._mock_stocks.get\(sku, 10\)', 'return 0'),
    (r'\s*if not self.is_configured:\n\s*return \{[\s\S]*?\}\n\s*\}\n', '\n')
]
clean_file('amazon_client.py', amazon_replacements)

# ebay_client.py
ebay_replacements = [
    (r'\s*self._mock_stocks:\s*Dict\[str,\s*int\]\s*=\s*\{[\s\S]*?\}\s*', '\n        pass\n'),
    (r'\s*if not self.is_configured:\n\s*return "mock-ebay-access-token"\n', '\n        if not self.is_configured:\n            raise EbayClientError("eBay no está configurado.")\n'),
    (r'\s*if not self.is_configured:\n\s*self._mock_stocks\[sku\] = quantity\n.*?\n\s*return True\n', '\n'),
    (r'\s*if not self.is_configured:\n\s*return self._mock_stocks.get\(sku, 10\)\n', '\n'),
    (r'\s*return self._mock_stocks.get\(sku, 10\)', 'return 0'),
    (r'\s*if not self.is_configured:\n\s*return \{[\s\S]*?\}\n\s*\}\n', '\n')
]
clean_file('ebay_client.py', ebay_replacements)

# kaufland_client.py
kaufland_replacements = [
    (r'\s*self._mock_stocks:\s*Dict\[str,\s*int\]\s*=\s*\{[\s\S]*?\}\s*', '\n        pass\n'),
    (r'\s*if not self.is_configured:\n\s*return \{"Kaufland-Client-Key": "mock-kaufland-client-key"\}\n', '\n        if not self.is_configured:\n            raise KauflandClientError("Kaufland no está configurado.")\n'),
    (r'\s*if not self.is_configured:\n\s*self._mock_stocks\[sku\] = quantity\n.*?\n\s*return True\n', '\n'),
    (r'\s*if not self.is_configured:\n\s*return self._mock_stocks.get\(sku, 10\)\n', '\n'),
    (r'\s*return self._mock_stocks.get\(sku, 10\)', 'return 0'),
    (r'\s*if not self.is_configured:\n\s*return \{[\s\S]*?\}\n\s*\}\n', '\n')
]
clean_file('kaufland_client.py', kaufland_replacements)

# delete demo.py if it exists
if os.path.exists('demo.py'):
    os.remove('demo.py')
    print('Deleted demo.py')

# Clean test_auth.py
test_auth_path = 'tests/test_auth.py'
if os.path.exists(test_auth_path):
    with open(test_auth_path, 'r', encoding='utf-8') as f:
        test_auth = f.read()
    test_auth = re.sub(r'def test_demo_mode_bypass_header\(\):[\s\S]*?(?=def test_|$)', '', test_auth)
    with open(test_auth_path, 'w', encoding='utf-8') as f:
        f.write(test_auth)
    print("Cleaned tests/test_auth.py")

