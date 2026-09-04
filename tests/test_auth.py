import pytest
import jwt
from datetime import timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient

from main import app
from config import settings
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    authenticate_user
)
from database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup SQLite database for auth tests
auth_test_engine = create_engine("sqlite:///./data/test_auth.db", connect_args={"check_same_thread": False})
AuthTestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=auth_test_engine)

def override_auth_get_db():
    db = AuthTestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_auth_db():
    Base.metadata.create_all(bind=auth_test_engine)
    app.dependency_overrides[get_db] = override_auth_get_db
    yield
    Base.metadata.drop_all(bind=auth_test_engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)


def test_hash_password_and_verify():
    """Verifica que el hashing con PBKDF2 sea seguro, genere sal única y se verifique correctamente."""
    password = "MySecureTestPassword2026!"
    h1 = hash_password(password)
    h2 = hash_password(password)

    # Comprueba que las sales sean únicas (hashes distintos para la misma contraseña)
    assert h1 != h2
    assert h1.startswith("pbkdf2_sha256$")

    # Verificación exitosa
    assert verify_password(password, h1) is True
    assert verify_password(password, h2) is True

    # Rechazo ante contraseña incorrecta
    assert verify_password("WrongPassword!", h1) is False
    assert verify_password("", h1) is False
    assert verify_password(password, "invalid_hash") is False


def test_authenticate_user():
    """Verifica la función authenticate_user con credenciales válidas e inválidas."""
    admin_user = settings.ADMIN_USERNAME
    admin_pass = settings.ADMIN_PASSWORD

    user = authenticate_user(admin_user, admin_pass)
    assert user is not None
    assert user["username"] == admin_user
    assert user["role"] == "admin"

    # Usuario incorrecto
    assert authenticate_user("wrong_user", admin_pass) is None
    # Contraseña incorrecta
    assert authenticate_user(admin_user, "wrong_pass") is None


def test_create_access_token_and_decode():
    """Verifica la generación y firma criptográfica de tokens JWT."""
    data = {"sub": "test_subject", "role": "admin", "custom_claim": "test_val"}
    token = create_access_token(data)

    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    assert payload["sub"] == "test_subject"
    assert payload["role"] == "admin"
    assert payload["custom_claim"] == "test_val"
    assert "exp" in payload
    assert "iat" in payload


def test_login_success_and_jwt_response():
    """POST /auth/login con credenciales correctas retorna token JWT válido."""
    res = client.post("/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Decodificar el token retornado
    payload = jwt.decode(
        data["access_token"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM]
    )
    assert payload["sub"] == settings.ADMIN_USERNAME


def test_login_failure_invalid_credentials():
    """POST /auth/login con credenciales incorrectas retorna 401."""
    res = client.post("/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "wrong_password_attempt"
    })
    assert res.status_code == 401
    assert "inválidas" in res.json()["detail"]


def test_auth_me_with_valid_token():
    """GET /auth/me retorna datos del usuario cuando se envía token Bearer válido."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "admin_test"
    assert data["role"] == "admin"


def test_auth_me_with_invalid_token():
    """GET /auth/me con token inválido retorna 401."""
    res = client.get("/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res.status_code == 401
    assert "Token inválido" in res.json()["detail"]


def test_auth_me_with_expired_token():
    """GET /auth/me con token expirado retorna 401."""
    expired_token = create_access_token(
        {"sub": "expired_user"},
        expires_delta=timedelta(seconds=-60)
    )
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "Token expirado" in res.json()["detail"]


def test_protected_endpoints_with_valid_jwt():
    """Verifica que los endpoints críticos permitan acceso cuando se proporciona un Bearer token JWT válido."""
    token = create_access_token({"sub": "admin", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}

    # /inventory
    res = client.get("/inventory", headers=headers)
    assert res.status_code == 200

    # /sales
    res = client.get("/sales", headers=headers)
    assert res.status_code == 200

    # /cola
    res = client.get("/cola", headers=headers)
    assert res.status_code == 200

    # /catalog/products
    res = client.get("/catalog/products", headers=headers)
    assert res.status_code == 200


def test_protected_endpoints_blocked_in_production_without_token():
    """En producción, peticiones sin token o credenciales deben ser rechazadas con 401."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        # /inventory sin token
        res_inv = client.get("/inventory")
        assert res_inv.status_code == 401
        assert "No autenticado" in res_inv.json()["detail"]

        # /sales sin token
        res_sales = client.get("/sales")
        assert res_sales.status_code == 401

        # /cola sin token
        res_cola = client.get("/cola")
        assert res_cola.status_code == 401

        # /catalog/products sin token
        res_cat = client.get("/catalog/products")
        assert res_cat.status_code == 401


def test_demo_mode_bypass_header():
    """Header 'X-Demo-Mode: true' permite acceso a endpoints protegidos en cualquier entorno."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        demo_headers = {"X-Demo-Mode": "true"}

        res_me = client.get("/auth/me", headers=demo_headers)
        assert res_me.status_code == 200
        assert res_me.json()["username"] == "demo_user"
        assert res_me.json().get("is_demo") is True

        res_inv = client.get("/inventory", headers=demo_headers)
        assert res_inv.status_code == 200

        res_sales = client.get("/sales", headers=demo_headers)
        assert res_sales.status_code == 200


def test_invalid_auth_header_format():
    """Header de autorización malformado o no Bearer debe retornar 401."""
    res = client.get("/inventory", headers={"Authorization": "Basic admin:secret"})
    assert res.status_code == 401
    assert "Esquema de autenticación inválido" in res.json()["detail"]


def test_register_and_login_flow():
    """Registro directo de usuario nuevo con token inmediato y login exitoso."""
    import uuid
    unique_user = f"seller_{uuid.uuid4().hex[:8]}"
    unique_email = f"{unique_user}@example.com"
    payload = {
        "username": unique_user,
        "password": "Password123!",
        "email": unique_email,
        "tenant_id": "empresa-a"
    }

    # 1. Registro inicial -> Emite JWT de inmediato y activa al usuario
    res_reg = client.post("/auth/register", json=payload)
    assert res_reg.status_code == 201
    data_reg = res_reg.json()
    assert "access_token" in data_reg
    assert data_reg["user"]["username"] == unique_user
    assert data_reg["user"]["email"] == unique_email
    assert data_reg["user"]["is_active"] is True
    token = data_reg["access_token"]

    # 2. Intento de registro duplicado con mismo username -> 400
    res_dup = client.post("/auth/register", json=payload)
    assert res_dup.status_code == 400
    assert "ya está registrado" in res_dup.json()["detail"]

    # 3. Login normal con el usuario
    res_login = client.post("/auth/login", json={
        "username": unique_user,
        "password": "Password123!"
    })
    assert res_login.status_code == 200

    # 4. Consultar /auth/me con el token
    res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["username"] == unique_user


def test_register_requires_valid_email():
    """Registro sin correo o correo inválido debe ser rechazado."""
    # Sin email
    res_no_email = client.post("/auth/register", json={
        "username": "seller_noemail",
        "password": "Password123!"
    })
    assert res_no_email.status_code == 422

    # Email inválido (sin @ ni punto)
    res_invalid_email = client.post("/auth/register", json={
        "username": "seller_invalidemail",
        "password": "Password123!",
        "email": "notanemail"
    })
    assert res_invalid_email.status_code == 400


