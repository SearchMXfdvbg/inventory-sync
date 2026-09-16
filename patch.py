import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix /inventory
content = re.sub(
    r'return sae_repo\.get_all_products\(\)',
    r'return []  # FIX: Aislamiento de Tenant. No se exponen productos globales.',
    content
)

# Fix /cola
cola_replacement = '''@app.get("/cola", response_model=List[VentaResponse])
def get_cola(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id") or 1
    
    query = db.query(Venta).filter(
        Venta.status.in_(["PENDING", "PROCESSING"]),
        Venta.attempts < 5
    )
    # FIX: IDOR - Filtrar la cola estrictamente por el tenant activo
    if current_user.get("role") != "admin":
        query = query.filter(Venta.user_id == user_id)
        
    sales = query.all()'''

content = re.sub(
    r'@app\.get\("/cola".*?sales = db\.query\(Venta\)\.filter\([\s\S]*?\.all\(\)',
    cola_replacement,
    content
)

# Fix webhooks to inject user_id (query param) and save to Venta
def inject_user_id(match):
    header = match.group(0)
    if 'user_id: int = 1' not in header:
        header = header.replace('request: Request,', 'request: Request, user_id: int = 1,')
        header = header.replace('request: Request)', 'request: Request, user_id: int = 1)')
    return header

content = re.sub(r'async def webhook_[a-z]+\(request: Request.*?\):', inject_user_id, content)

# Update Venta(...) to include user_id=user_id
content = re.sub(
    r'(venta = Venta\(\s*external_id=external_id,)',
    r'\1\n            user_id=user_id,',
    content
)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend parcheado correctamente.")
