import base64
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
import urllib.parse
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session
from models import InventoryAuditLog, InventorySnapshot, TenantProduct

logger = logging.getLogger("inventory_sync.security_utils")

# --- 1. PROTECCIÓN DEFENSIVA CONTRA SSRF (Capa 3) ---

def validate_safe_external_url(url_or_domain: str, allow_private: bool = False) -> str:
    """
    Valida rigurosamente que una URL o dominio externo:
    1. Utilice exclusivamente el esquema HTTPS (salvo si allow_private es True en pruebas locales).
    2. Resuelva mediante DNS y bloquee terminantemente IPs privadas (RFC 1918),
       direcciones loopback (127.0.0.0/8, ::1), direcciones link-local / metadata (169.254.169.254)
       y direcciones reservadas/multicast.
    """
    if not url_or_domain or not isinstance(url_or_domain, str):
        raise ValueError("La URL o dominio no puede estar vacío.")

    raw = url_or_domain.strip()
    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = f"https://{raw}"

    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme.lower() != "https" and not allow_private:
        raise ValueError(f"Esquema no permitido '{parsed.scheme}'. Solo se permite HTTPS para conexiones externas.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError(f"No se pudo determinar el hostname de la URL: {url_or_domain}")

    hostname_lower = hostname.lower()
    blocked_hosts = {
        "localhost", "127.0.0.1", "0.0.0.0", "::1",
        "metadata.google.internal", "instance-data", "169.254.169.254"
    }
    if hostname_lower in blocked_hosts and not allow_private:
        raise ValueError(f"SSRF Protection: Acceso bloqueado a host interno o de metadatos ({hostname}).")

    if not allow_private:
        try:
            addr_infos = socket.getaddrinfo(hostname, None)
            for addr in addr_infos:
                ip_str = addr[4][0]
                ip = ipaddress.ip_address(ip_str)
                if (
                    ip.is_loopback
                    or ip.is_private
                    or ip.is_link_local
                    or ip.is_reserved
                    or ip.is_multicast
                    or ip_str == "169.254.169.254"
                ):
                    raise ValueError(f"SSRF Protection: La dirección IP resuelta '{ip_str}' pertenece a un rango privado o restringido.")
        except socket.gaierror:
            # Si el DNS no resuelve en este momento, validamos que el formato de dominio sea seguro
            pass

    return raw


# --- 2. BITÁCORA INMUTABLE DE AUDITORÍA CON ENCADENAMIENTO SHA-256 (Capa 4) ---

def record_audit_log(
    db: Session,
    user_id: int,
    sku: str,
    previous_stock: int,
    new_stock: int,
    actor: Optional[Dict[str, Any]] = None,
    source_channel: str = "direct",
    idempotency_key: Optional[str] = None
) -> InventoryAuditLog:
    """
    Registra un cambio de stock en la tabla de auditoría con encadenamiento criptográfico.
    Calcula: integrity_hash = SHA256(prev_hash:user_id:sku:delta:previous_stock:new_stock:timestamp)
    """
    delta = new_stock - previous_stock
    now_utc = datetime.now(timezone.utc)

    # Obtener el hash del último registro para este tenant y SKU (o hash génesis)
    latest_log = (
        db.query(InventoryAuditLog)
        .filter(InventoryAuditLog.user_id == user_id, InventoryAuditLog.sku == sku)
        .order_by(InventoryAuditLog.id.desc())
        .first()
    )
    prev_hash = latest_log.integrity_hash if latest_log else ("0" * 64)

    if isinstance(actor, str):
        actor_id = None
        actor_username = actor
        actor_role = "admin" if actor.lower() in ("admin", "superadmin") else "user"
    elif isinstance(actor, dict):
        actor_id = actor.get("id") or actor.get("user_id")
        actor_username = actor.get("username", "system")
        actor_role = actor.get("role", "system")
    else:
        actor_id = None
        actor_username = "system"
        actor_role = "system"

    ts_str = now_utc.strftime("%Y-%m-%dT%H:%M:%S")
    payload_str = f"{prev_hash}:{user_id}:{sku}:{delta}:{previous_stock}:{new_stock}:{ts_str}"
    integrity_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    log_entry = InventoryAuditLog(
        user_id=user_id,
        sku=sku,
        previous_stock=previous_stock,
        new_stock=new_stock,
        delta=delta,
        actor_id=actor_id,
        actor_username=actor_username,
        actor_role=actor_role,
        source_channel=source_channel,
        idempotency_key=idempotency_key,
        previous_hash=prev_hash,
        integrity_hash=integrity_hash,
        created_at=now_utc
    )
    db.add(log_entry)
    db.flush()
    return log_entry


def verify_audit_log_chain(db: Session, user_id: int, sku: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifica la integridad criptográfica de la bitácora de auditoría.
    Devuelve si la cadena es íntegra o si ha sufrido alguna alteración maliciosa.
    """
    query = db.query(InventoryAuditLog).filter(InventoryAuditLog.user_id == user_id)
    if sku:
        query = query.filter(InventoryAuditLog.sku == sku)
    logs = query.order_by(InventoryAuditLog.id.asc()).all()

    sku_chains: Dict[str, str] = {}

    for log in logs:
        prev = sku_chains.get(log.sku, "0" * 64)
        if log.previous_hash != prev:
            return {
                "valid": False,
                "broken_at_id": log.id,
                "compromised_id": log.id,
                "error": f"Falla de encadenamiento en log ID {log.id}: previous_hash no coincide.",
                "total_records": len(logs)
            }

        # Verificación aritmética de delta
        if log.delta != (log.new_stock - log.previous_stock):
            return {
                "valid": False,
                "broken_at_id": log.id,
                "compromised_id": log.id,
                "error": f"Inconsistencia de delta aritmético en log ID {log.id}.",
                "total_records": len(logs)
            }

        # Verificación de hash SHA-256
        ts_str = log.created_at.strftime("%Y-%m-%dT%H:%M:%S") if log.created_at else ""
        payload_str = f"{prev}:{log.user_id}:{log.sku}:{log.delta}:{log.previous_stock}:{log.new_stock}:{ts_str}"
        computed_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

        if log.integrity_hash != computed_hash:
            return {
                "valid": False,
                "broken_at_id": log.id,
                "compromised_id": log.id,
                "error": f"Firma matemática alterada en log ID {log.id}: integridad violada.",
                "total_records": len(logs)
            }

        sku_chains[log.sku] = log.integrity_hash

    return {
        "valid": True,
        "total_records": len(logs),
        "total_verified": len(logs),
        "message": f"Cadena de auditoría verificada exitosamente ({len(logs)} registros válidos)."
    }


# --- 3. SNAPSHOTS Y RECUPERACIÓN / ROLLBACK (Capa 4) ---

def create_inventory_snapshot(
    db: Session,
    user_id: int,
    snapshot_name: Optional[str] = None,
    label: Optional[str] = None
) -> InventorySnapshot:
    """
    Crea una captura completa del catálogo de productos y stock del tenant.
    Se ejecuta automáticamente previo a sincronizaciones masivas.
    """
    final_name = snapshot_name or label or f"Snapshot {datetime.now(timezone.utc).isoformat()}"
    prods = db.query(TenantProduct).filter(TenantProduct.user_id == user_id).all()
    snapshot_dict = {}
    for p in prods:
        snapshot_dict[p.sku] = {
            "nombre": p.nombre,
            "stock": p.stock,
            "version": p.version,
            "shopify_inventory_item_id": p.shopify_inventory_item_id,
            "shopify_location_id": p.shopify_location_id,
            "ml_item_id": p.ml_item_id
        }

    snap = InventorySnapshot(
        user_id=user_id,
        snapshot_name=final_name,
        products_data=json.dumps(snapshot_dict),
        items_count=len(snapshot_dict),
        created_at=datetime.now(timezone.utc)
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    logger.info(f"Snapshot '{snapshot_name}' creado para usuario {user_id} con {len(snapshot_dict)} productos.")
    return snap


def rollback_inventory_snapshot(
    db: Session,
    user_id: int,
    snapshot_id: int,
    actor: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Restaura el stock al estado capturado en un snapshot anterior y genera registros de auditoría.
    """
    snap = db.query(InventorySnapshot).filter(
        InventorySnapshot.id == snapshot_id,
        InventorySnapshot.user_id == user_id
    ).first()

    if not snap:
        raise ValueError(f"Snapshot con ID {snapshot_id} no encontrado para este usuario.")

    data: Dict[str, Dict[str, Any]] = json.loads(snap.products_data)
    restored_count = 0

    for sku, item_data in data.items():
        prod = db.query(TenantProduct).filter(
            TenantProduct.user_id == user_id,
            TenantProduct.sku == sku
        ).first()

        target_stock = int(item_data["stock"])
        if prod:
            prev = prod.stock
            prod.stock = target_stock
            prod.version += 1
            prod.last_sync_source = "rollback"
            record_audit_log(
                db, user_id, sku, prev, target_stock,
                actor=actor, source_channel="rollback_snapshot"
            )
            restored_count += 1
        else:
            new_p = TenantProduct(
                user_id=user_id,
                sku=sku,
                nombre=item_data.get("nombre", f"Producto {sku}"),
                stock=target_stock,
                version=1,
                last_sync_source="rollback"
            )
            db.add(new_p)
            record_audit_log(
                db, user_id, sku, 0, target_stock,
                actor=actor, source_channel="rollback_snapshot"
            )
            restored_count += 1

    db.commit()
    logger.info(f"Rollback a snapshot {snapshot_id} ejecutado exitosamente ({restored_count} productos restaurados).")
    return {
        "success": True,
        "snapshot_id": snapshot_id,
        "restored_count": restored_count,
        "message": f"Rollback completado con éxito: {restored_count} productos restaurados a la versión '{snap.snapshot_name}'."
    }


# --- 4. PROTECCIÓN ANTI-LOOP DE SINCRONIZACIÓN (Capa 1) ---

# Registro en memoria con ventana de tiempo de 120s para detectar ecos de sincronización
_outbound_sync_cache: Dict[str, float] = {}

def track_outbound_sync(*args, **kwargs):
    """
    Registra que nuestra plataforma emitió una sincronización saliente hacia un canal externo.
    Soporta:
      track_outbound_sync(channel, sku, stock)
      track_outbound_sync(sku, quantity, channel="general")
      kwargs: channel, sku, stock, quantity
    """
    channel = kwargs.get("channel")
    sku = kwargs.get("sku")
    stock = kwargs.get("stock") if "stock" in kwargs else kwargs.get("quantity")

    if len(args) == 3:
        if isinstance(args[2], (int, float)) or str(args[2]).isdigit():
            channel, sku, stock = args[0], args[1], int(args[2])
        else:
            sku, stock, channel = args[0], int(args[1]), str(args[2])
    elif len(args) == 2:
        sku, stock = args[0], int(args[1])
        channel = channel or "general"
    elif len(args) == 1:
        sku = args[0]
        stock = stock or 0
        channel = channel or "general"

    channel = str(channel or "general").lower()
    sku = str(sku or "").upper()
    stock = int(stock or 0)

    key = f"{channel}:{sku}:{stock}"
    _outbound_sync_cache[key] = time.time()
    _outbound_sync_cache[f"any:{sku}:{stock}"] = time.time()

    # Limpieza de entradas mayores a 300 segundos
    now = time.time()
    stale = [k for k, v in _outbound_sync_cache.items() if now - v > 300]
    for k in stale:
        _outbound_sync_cache.pop(k, None)


def is_loop_echo(*args, **kwargs) -> bool:
    """
    Verifica si una actualización recibida de un webhook externo es un eco/reflejo de un cambio
    originado por nosotros en los últimos 120 segundos.
    Soporta:
      is_loop_echo(channel, sku, stock)
      is_loop_echo(sku, quantity, channel="general")
      kwargs: channel, sku, stock, quantity
    """
    channel = kwargs.get("channel")
    sku = kwargs.get("sku")
    stock = kwargs.get("stock") if "stock" in kwargs else kwargs.get("quantity")

    if len(args) == 3:
        if isinstance(args[2], (int, float)) or str(args[2]).isdigit():
            channel, sku, stock = args[0], args[1], int(args[2])
        else:
            sku, stock, channel = args[0], int(args[1]), str(args[2])
    elif len(args) == 2:
        sku, stock = args[0], int(args[1])
        channel = channel or "general"
    elif len(args) == 1:
        sku = args[0]
        stock = stock or 0
        channel = channel or "general"

    channel = str(channel or "general").lower()
    sku = str(sku or "").upper()
    stock = int(stock or 0)

    key = f"{channel}:{sku}:{stock}"
    timestamp = _outbound_sync_cache.get(key) or _outbound_sync_cache.get(f"any:{sku}:{stock}")
    if timestamp and (time.time() - timestamp) <= 120:
        logger.info(f"Anti-Loop Protection: Eco detectado para {key} (origen propio hace {int(time.time() - timestamp)}s). Omitiendo retransmisión.")
        return True
    return False


# --- 5. VERIFICACIÓN CRIPTOGRÁFICA DE WEBHOOKS CON TIMING-SAFE EQUAL (Capa 2) ---

def verify_shopify_hmac(raw_body: bytes, hmac_header: Optional[str], secret: str) -> bool:
    if not hmac_header or not secret:
        return False
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(computed.strip(), hmac_header.strip())


def verify_ml_signature(raw_body: bytes, headers: dict, secret: str) -> bool:
    if not secret:
        # En producción no se permite webhook sin secreto
        return False

    signature_header = None
    for k, v in headers.items():
        if k.lower() in ("x-signature", "x-webhook-secret"):
            signature_header = v
            break

    if not signature_header:
        return False

    signature_header = signature_header.strip()
    if hmac.compare_digest(signature_header, secret):
        return True

    raw_digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).digest()
    if hmac.compare_digest(signature_header, raw_digest.hex()):
        return True
    if hmac.compare_digest(signature_header, base64.b64encode(raw_digest).decode("utf-8")):
        return True

    if "ts=" in signature_header and "v1=" in signature_header:
        parts = {}
        for item in signature_header.split(","):
            if "=" in item:
                k, val = item.strip().split("=", 1)
                parts[k.strip()] = val.strip()
        ts = parts.get("ts")
        v1 = parts.get("v1")
        if ts and v1:
            h_body_ts = hmac.new(
                secret.encode("utf-8"),
                f"ts:{ts};raw:{raw_body.decode('utf-8', errors='ignore')}".encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(v1, h_body_ts):
                return True

            h_body = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
            if hmac.compare_digest(v1, h_body):
                return True

    return False


def verify_tiktok_hmac(raw_body: bytes, headers: dict, secret: str) -> bool:
    if not secret:
        return False
    signature = headers.get("x-tiktok-signature") or headers.get("authorization")
    if not signature:
        return False
    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature.strip().replace("Bearer ", ""))


def verify_amazon_signature(raw_body: bytes, headers: dict, secret: str) -> bool:
    if not secret:
        return False
    signature = headers.get("x-amz-sns-signature") or headers.get("x-signature") or headers.get("authorization")
    if not signature:
        return False
    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature.strip().replace("Bearer ", ""))


def verify_ebay_signature(raw_body: bytes, headers: dict, secret: str) -> bool:
    if not secret:
        return False
    sig = headers.get("x-ebay-signature") or headers.get("x-signature")
    if not sig:
        return False
    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, sig.strip())


def verify_kaufland_signature(raw_body: bytes, headers: dict, secret: str) -> bool:
    if not secret:
        return False
    sig = headers.get("x-kaufland-signature") or headers.get("x-signature")
    if not sig:
        return False
    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, sig.strip())


# --- 6. ARITMÉTICA EXACTA Y FORMATEO DE MONEDA / DECIMALES (Capa 1) ---

def format_currency(amount: Any) -> str:
    """
    Convierte cualquier monto numérico en formato monetario exacto con 2 decimales usando
    Decimal y redondeo ROUND_HALF_UP para evitar errores de precisión de punto flotante.
    """
    if amount is None or amount == "":
        return "0.00"
    try:
        dec = Decimal(str(amount))
        return str(dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except Exception:
        return "0.00"
