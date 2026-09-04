# Sincronizador de Inventario Omnicanal (SAE - Shopify - Mercado Libre)

Este sistema automatiza la sincronización de inventario en tiempo real entre el sistema ERP **CONTPAQi SAE** (fuente de verdad), la tienda **Shopify** (Admin GraphQL API 2026-07) y las publicaciones de **Mercado Libre**.

---

## 1. Arquitectura del Sistema

La arquitectura está diseñada bajo los principios de tolerancia a fallos, consistencia eventual, idempotencia y alta disponibilidad para evitar discrepancias de stock (como sobreventas o decrementos duplicados).

```mermaid
graph TD
    %% Componentes
    Shopify[Shopify Store] -- Webhook: order/create --> API[FastAPI webhook receiver]
    ML[Mercado Libre] -- Webhook: orders --> API
    
    API -- 1. Validar e Insertar --> DB[(SQLite Local)]
    
    subgraph Worker Process (Saga Orchestrator)
        WK[worker.py] -- 2. Reclamar Venta PENDING --> DB
        WK -- 3. Decrementar Stock --> SAE[CONTPAQi SAE SQL Server]
        WK -- 4. Ajustar Inventario (Idempotente) --> Shopify
        WK -- 5. Actualizar Stock Absoluto --> ML
        WK -- 6. Marcar como PROCESSED --> DB
    end
    
    %% Estilos
    style SAE fill:#f9f,stroke:#333,stroke-width:2px
    style DB fill:#bbf,stroke:#333,stroke-width:2px
```

### Componentes Clave:
1. **CONTPAQi SAE como Fuente de Verdad:**
   El stock real e inmutable reside en la base de datos de CONTPAQi SAE. Toda venta en línea debe reservarse y decrementarse primero en SAE.
2. **Worker con Estados Persistentes (Saga Orchestrator):**
   El worker (`worker.py`) procesa las ventas registradas por la API de forma asíncrona. Utiliza un patrón Saga en el que cada paso se registra en una base de datos SQLite local (`models.Venta`):
   * `sae_decremented`: Indica si el stock se restó en SAE.
   * `shopify_synced`: Indica si se notificó a Shopify.
   * `ml_synced`: Indica si se notificó a Mercado Libre.
   Si cualquiera de estos pasos falla, el worker aplica un **backoff exponencial** y reintenta el paso exacto que falló, garantizando consistencia eventual sin reiniciar toda la transacción.
3. **Idempotencia y Prevención de Doble Decremento:**
   * **Shopify:** Se envía una clave de idempotencia única basada en el origen y el ID externo (`shopify_sale_{origen}_{external_id}`) a la API de Shopify. Si la llamada se reintenta por fallas de red, Shopify ignora el segundo ajuste.
   * **Mercado Libre:** Se lee el stock absoluto de SAE tras el decremento y se establece como el stock absoluto final en Mercado Libre. Al ser una asignación absoluta (`PUT /items/{id}`), no existe riesgo de doble decremento relativo.
   * **Base de Datos Local:** Se aplica un constraint de unicidad en `origen` + `external_id`. Webhooks duplicados enviados por las plataformas son ignorados de inmediato (`HTTP 202 Accepted` por idempotencia).

---

## 2. Instalación y Configuración Local

### Requisitos Previos:
* Python 3.12 instalado.
* (Para producción) Driver de SQL Server instalado en el sistema (por ejemplo, [Microsoft ODBC Driver for SQL Server](https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server)).

### Paso 1: Clonar e instalar dependencias
```bash
# Crear entorno virtual
python -m venv venv
source venv/Scripts/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### Paso 2: Configurar Variables de Entorno
Copia el archivo `.env.example` como `.env` y edita los valores correspondientes:
```env
DATABASE_URL=sqlite:///./data/database.db
SAE_DATA_PATH=data/productos.json

SHOP_DOMAIN=tu-tienda.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_tu_token_de_acceso
SHOPIFY_API_VERSION=2026-07
SHOPIFY_LOCATION_ID=gid://shopify/Location/tu_location_id
SHOPIFY_API_SECRET=shpss_tu_secret_para_webhooks

ML_ACCESS_TOKEN=APP_USR-tu_access_token
ML_USER_ID=tu_user_id
ML_SITE_ID=MLM
```

### Paso 3: Ejecutar la API y el Worker
* **Iniciar el Servidor API:**
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
* **Iniciar el Worker de Sincronización:**
  ```bash
  python worker.py
  ```

---

## 3. Ejecución de la Demo Interactiva (`demo.py`)

Para facilitar las pruebas de la lógica de negocio, reintentos e idempotencia sin configurar credenciales reales, se incluye una simulación interactiva completa:

```bash
python demo.py
```

### Flujo de la Demo:
1. Genera una base de datos SQLite temporal (`data/test_demo.db`) y un archivo JSON mock de SAE (`data/test_productos_demo.json`) con **10 unidades** iniciales del producto `SKU001`.
2. Envía un webhook simulado de Shopify por una venta de **2 unidades** de `SKU001`.
3. Valida que el webhook registre la venta en estado `PENDING`.
4. Ejecuta un ciclo del worker:
   * Decrementa el stock en SAE a **8 unidades**.
   * Actualiza Shopify a **8 unidades** (usando mocks del cliente).
   * Actualiza Mercado Libre a **8 unidades**.
   * Transiciona el estado a `PROCESSED`.
5. Envía exactamente el mismo webhook de venta de Shopify (mismo ID) para verificar la **idempotencia**. El sistema lo detecta como duplicado, no añade registros a la base de datos y mantiene el stock de SAE en **8 unidades** sin realizar decrementos adicionales.
6. Limpia los archivos de prueba creados al finalizar.

---

## 4. Guía de Shopify Partners (Admin GraphQL API 2026-07)

Para conectar el sistema con Shopify, debes obtener un Token de Acceso del API Admin y el identificador de la ubicación (Location ID):

### 1. Crear una Tienda de Desarrollo (Development Store):
1. Inicia sesión en tu cuenta de [Shopify Partners](https://partners.shopify.com/).
2. Ve a la sección **Stores** en el menú de la izquierda.
3. Haz clic en **Add store** > **Create development store**.
4. Selecciona **Create a store for testing and build** y completa los datos requeridos.

### 2. Crear una Custom App y Obtener Credenciales:
1. Desde el panel de administración de tu tienda de desarrollo, ve a **Settings** > **Apps and sales channels**.
2. Haz clic en **Develop apps** > **Create an app**.
3. Nombra la aplicación (ej. `Sincronizador de Inventario`) y haz clic en **Create app**.
4. En la pestaña **Configuration**, selecciona **Admin API integration** y haz clic en **Configure**.
5. Otorga los siguientes permisos (Scopes):
   * `write_inventory`
   * `read_inventory`
   * `read_orders`
6. Haz clic en **Save** y luego en la pestaña **API credentials** haz clic en **Install app**.
7. Copia el **Admin API access token** (empieza con `shpat_`) y el **API secret key** (utilizado para verificar las firmas HMAC de los webhooks).

### 3. Obtener el Location ID de Shopify:
El Location ID es obligatorio para ajustar el inventario de un producto en una ubicación específica. Puedes consultarlo ejecutando una consulta GraphQL desde el panel de desarrollo de Shopify o con la siguiente consulta:

```graphql
query {
  locations(first: 5) {
    edges {
      node {
        id
        name
        isActive
      }
    }
  }
}
```

La respuesta te dará un ID con el formato: `gid://shopify/Location/1234567890`. Cópialo en la variable `SHOPIFY_LOCATION_ID` del archivo `.env`.

---

## 5. Guía de Usuarios de Prueba en Mercado Libre

Para realizar pruebas seguras en Mercado Libre sin afectar cuentas productivas, debes trabajar con usuarios de prueba (Test Users):

1. Inicia sesión en el [Portal de Desarrolladores de Mercado Libre](https://developers.mercadolibre.com/).
2. Ve a la sección **Mi Aplicación** o **Dev Center**.
3. Asegúrate de tener una aplicación creada (si no, crea una con la configuración básica).
4. Ve a la sección **Herramientas** > **Cuentas de prueba** (Test Users).
5. Haz clic en **Crear usuario de prueba** para generar:
   * Un usuario **Vendedor de prueba** (anota sus credenciales).
   * Un usuario **Comprador de prueba**.
6. Inicia sesión en un navegador en modo incógnito con el usuario vendedor de prueba para autorizar tu aplicación y generar el **Access Token** de prueba (`APP_USR-xxxx`).
7. Asocia el `seller_sku` de tu publicación de prueba de Mercado Libre con el SKU correspondiente de SAE.

---

## 6. Sustitución de `SAEMockRepository` por `SAERepository` en Producción

Gracias a la implementación del principio de **Inversión de Dependencias (Dependency Inversion)**, el núcleo del sincronizador (`worker.py` y `main.py`) no tiene ninguna dependencia directa con la base de datos de SAE ni con su almacenamiento físico. Ambos usan la interfaz abstracta `SAERepository`.

Para conectar el sistema a la base de datos de producción de **CONTPAQi SAE** (alojada en SQL Server), se implementan dos pasos sencillos sin modificar una sola línea de lógica en `worker.py`.

### Paso A: Crear la implementación productiva (`sae_db.py`)

Crea un archivo llamado `sae_db.py` en el directorio del proyecto con el siguiente código, el cual utiliza `SQLAlchemy` y `pyodbc` para interactuar de forma segura y atómica con las tablas reales de Aspel/CONTPAQi SAE (`INVE01` para el inventario de la empresa 1):

```python
# sae_db.py
from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sae_mock import SAERepository, ProductNotFoundError, InsufficientStockError

class SAEDatabaseRepository(SAERepository):
    """
    Implementación en producción para conectar directamente con SQL Server de CONTPAQi SAE.
    Mapea a la tabla INVE01 (donde CVE_ART es el SKU y EXIST es el stock disponible).
    """
    def __init__(self, db_url: str):
        # Configuración de pool de conexiones optimizado para producción
        self.engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True
        )
        self.Session = sessionmaker(bind=self.engine)

    def get_product(self, sku: str) -> Dict[str, Any]:
        with self.Session() as session:
            # Obtiene los datos del producto directamente de la tabla INVE01 de SAE
            query = text("SELECT CVE_ART, DESCR, EXIST FROM INVE01 WHERE CVE_ART = :sku")
            result = session.execute(query, {"sku": sku}).fetchone()
            if not result:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")

            # Para asociar los IDs de Shopify y Mercado Libre, se consulta una tabla de
            # mapeos local dentro de la base de datos del sincronizador o una tabla personalizada en SAE:
            mapping_query = text(
                "SELECT shopify_inventory_item_id, shopify_location_id, ml_item_id "
                "FROM PRODUCT_MAPPINGS WHERE sku = :sku"
            )
            mapping = session.execute(mapping_query, {"sku": sku}).fetchone()

            return {
                "sku": result.CVE_ART,
                "nombre": result.DESCR,
                "stock": int(result.EXIST),
                "shopify_inventory_item_id": mapping.shopify_inventory_item_id if mapping else None,
                "shopify_location_id": mapping.shopify_location_id if mapping else None,
                "ml_item_id": mapping.ml_item_id if mapping else None
            }

    def get_stock(self, sku: str) -> int:
        with self.Session() as session:
            query = text("SELECT EXIST FROM INVE01 WHERE CVE_ART = :sku")
            result = session.execute(query, {"sku": sku}).fetchone()
            if not result:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
            return int(result.EXIST)

    def set_stock(self, sku: str, quantity: int) -> None:
        with self.Session() as session:
            query = text("UPDATE INVE01 SET EXIST = :quantity WHERE CVE_ART = :sku")
            result = session.execute(query, {"quantity": quantity, "sku": sku})
            if result.rowcount == 0:
                raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
            session.commit()

    def decrement_stock(self, sku: str, quantity: int) -> int:
        with self.Session() as session:
            # decrement_stock se realiza a nivel base de datos de manera atómica para evitar condiciones de carrera
            query = text(
                "UPDATE INVE01 SET EXIST = EXIST - :quantity "
                "WHERE CVE_ART = :sku AND EXIST >= :quantity"
            )
            result = session.execute(query, {"quantity": quantity, "sku": sku})
            if result.rowcount == 0:
                # Si no afectó filas, consultamos la causa (inexistencia o stock insuficiente)
                check_query = text("SELECT EXIST FROM INVE01 WHERE CVE_ART = :sku")
                current = session.execute(check_query, {"sku": sku}).fetchone()
                if not current:
                    raise ProductNotFoundError(f"El SKU '{sku}' no existe en CONTPAQi SAE.")
                raise InsufficientStockError(
                    f"Stock insuficiente en SAE. Disponible: {current.EXIST}, Solicitado: {quantity}"
                )
            
            session.commit()
            
            # Obtener el stock actualizado
            return self.get_stock(sku)
```

### Paso B: Habilitar la Inyección Dinámica en `sae_mock.py`

Modifica el método constructor `__new__` en la clase `SAEMockRepository` dentro de `sae_mock.py` para devolver dinámicamente la instancia de base de datos cuando se detecte el entorno productivo:

```python
# Modificación en sae_mock.py
class SAEMockRepository(SAERepository):
    def __new__(cls, *args, **kwargs):
        import os
        # Evaluamos el entorno para decidir qué repositorio instanciar
        if os.getenv("SAE_REPOSITORY_TYPE") == "production":
            from sae_db import SAEDatabaseRepository
            from config import settings
            # Se asume que en producción agregaste 'SAE_DATABASE_URL' a tu .env
            db_url = os.getenv("SAE_DATABASE_URL", settings.DATABASE_URL)
            return SAEDatabaseRepository(db_url)
        
        # Flujo por defecto de pruebas locales / JSON mock
        return super().__new__(cls)
```

Con este patrón (un Proxy/Factory dinámico basado en `__new__`), **`worker.py` y `main.py` siguen ejecutando `sae = SAEMockRepository()`**, pero reciben de forma transparente la conexión productiva a SQL Server de SAE.

---

## 7. Lista de Chequeo (Checklist) para Demostración al Cliente

Utiliza esta checklist estructurada para guiar la demostración en vivo del sistema ante el cliente, probando cada flujo y asegurando la aceptación:

| Paso | Flujo a Validar | Acción en Demostración | Resultado Esperado | ¿Aprobado? |
| :--- | :--- | :--- | :--- | :---: |
| **1** | **Lectura Inicial** | Consultar `/reconcile/SKU001` vía curl o Swagger. | Muestra el stock sincronizado en SAE, Shopify y Mercado Libre. | [ ] |
| **2** | **Recepción de Webhook** | Simular compra en Shopify enviando webhook `/webhook/shopify` de cantidad 2. | La API responde `HTTP 202 Accepted` de inmediato. Se crea una fila en `Venta` en estado `PENDING`. | [ ] |
| **3** | **Idempotencia (Webhook)** | Reenviar exactamente el mismo webhook con el mismo ID. | La API responde `HTTP 202 Accepted` pero el log confirma: *"Venta duplicada detectada... Omitiendo registro"*. No se duplica la fila en base de datos. | [ ] |
| **4** | **Procesamiento de Saga** | Ejecutar una iteración del worker (`python worker.py --once`). | El worker procesa la venta: decrementa SAE a 8, ajusta Shopify a 8 y actualiza Mercado Libre a 8. La fila se marca como `PROCESSED`. | [ ] |
| **5** | **Verificación Final** | Consultar `/reconcile/SKU001` nuevamente. | Los tres sistemas muestran stock de **8 unidades**. Se confirma alineación total. | [ ] |
| **6** | **Gestión de Errores** | Simular error temporal en un canal externo (ej. apagar conexión a internet de Shopify) y correr el worker. | El worker guarda el error en `last_error`, mantiene la venta en `PROCESSING` y aplica backoff exponencial para el reintento. | [ ] |
| **7** | **Prevención de Sobrevendido**| Enviar una venta de cantidad mayor al stock disponible en SAE (ej. cantidad 15). | El worker detecta el error en el paso de SAE, detiene el procesamiento de la venta y la marca como `FAILED` para revisión manual. | [ ] |
