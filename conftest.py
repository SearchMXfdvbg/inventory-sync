import os
import pytest

# Configurar credenciales y variables de entorno para tests automatizados
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ADMIN_API_KEY", "admin-secret-token")
os.environ.setdefault("ADMIN_PASSWORD", "AdminSecure2026!")
os.environ.setdefault("SECRET_KEY", "inventory-sync-secret-key-change-in-production-2026")

@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(items, config):
    for item in items:
        item.add_marker(pytest.mark.prod)
        if hasattr(item, "extra_keyword_matches"):
            item.extra_keyword_matches.add("prod")
