import re
with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix webhook_ml missing user_id definition
replacement = '''async def webhook_ml(
    request: Request,
    webhook_data: MercadoLibreWebhook, 
    user_id: int = 1,
    db: Session = Depends(get_db)
):'''
content = content.replace('''async def webhook_ml(
    request: Request,
    webhook_data: MercadoLibreWebhook, 
    db: Session = Depends(get_db)
):''', replacement)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("webhook_ml patched")
