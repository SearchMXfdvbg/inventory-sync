import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

# Create directory for SQLite if it is a file-based sqlite database
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    # check_same_thread=False is needed only for SQLite to allow multiple threads to access it
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Vulnerabilidad #17: Configuración de concurrencia e integridad en SQLite
# Se activa Write-Ahead Logging (WAL) y synchronous=NORMAL para evitar bloqueos
# y mejorar el rendimiento concurrente de lectura/escritura.
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Dependency helper to obtain database session.
    Yields the session and ensures it gets closed after request lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_and_migrate():
    """
    Inicializa el esquema de base de datos aplicando migraciones progresivas mediante migrations.py.
    """
    from migrations import upgrade_db
    return upgrade_db(engine)


def rollback_db():
    """
    Ejecuta el rollback de emergencia de la base de datos (< 60s).
    """
    from migrations import downgrade_db
    return downgrade_db(engine)


