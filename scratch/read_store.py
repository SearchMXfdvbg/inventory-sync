import httpx
import json

r = httpx.get("https://haros.store/products.json?limit=50")
print("Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    products = data.get("products", [])
    print(f"Total productos obtenidos: {len(products)}")
    for p in products:
        title = p.get("title")
        handle = p.get("handle")
        variants = p.get("variants", [])
        variant_info = [f"ID:{v.get('id')} SKU:{v.get('sku')} Price:{v.get('price')}" for v in variants]
        print(f"- {title} (Handle: {handle})")
        for vi in variant_info:
            print(f"    * {vi}")
