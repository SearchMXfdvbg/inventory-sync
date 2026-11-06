# Documentación Oficial — Inventory Sync

**Centro de Control y Sincronización de Inventario Multicanal en Tiempo Real**

---

## 1. Resumen Ejecutivo

**Inventory Sync** es una plataforma integral de gestión y sincronización automática de existencias diseñada para negocios que venden en múltiples canales al mismo tiempo: tiendas en línea propias, marketplaces nacionales e internacionales, puntos de venta físicos y almacenes centrales.

Su objetivo principal es **eliminar por completo las sobreventas** (vender unidades que ya se agotaron en otro canal), proteger la reputación comercial del vendedor, evitar penalizaciones por cancelación de pedidos y ahorrar decenas de horas semanales de captura manual.

> **El problema que resuelve de raíz:** Cuando solo queda **1 pieza disponible** de un artículo y dos compradores intentan adquirirla casi al mismo tiempo en distintas tiendas (por ejemplo, en Mercado Libre y en tu tienda en línea), Inventory Sync reserva la pieza para la primera compra confirmada y actualiza o pausa de inmediato la disponibilidad en el resto de los canales.

### Beneficios Clave para el Negocio
* **0% Ventas Dobles:** Descuento inmediato en cascada en cuanto ocurre una compra o un ajuste en bodega.
* **Protección de Reputación:** Evita cancelaciones forzadas que hunden el posicionamiento de tus publicaciones o generan multas de hasta el 15% sobre la venta.
* **Un Solo Lugar de Control:** Visualiza, compara y corrige las existencias de todas tus tiendas desde una sola pantalla.
* **Puente entre Mostrador Físico y Ventas en Línea:** Conecta tu almacén real, hojas de Excel de caja o sistema administrativo CONTPAQi SAE con tus tiendas digitales.
* **Trazabilidad y Respaldo Total:** Cada pieza sumada o restada queda registrada con responsable, fecha, hora y motivo, con puntos de restauración en un clic ante errores humanos.

---

## 2. ¿Cómo Funciona Inventory Sync?

### El Concepto de «Inventario Principal»
Dentro de Inventory Sync, la empresa elige cuál será su **Inventario Principal (Origen de Referencia)** —es decir, la fuente oficial que manda sobre las existencias reales del negocio (por ejemplo, tu almacén central, Shopify o tu tienda base):

1. **Cuando entra una venta en cualquier canal:** El sistema recibe el aviso de compra al instante, descuenta las piezas vendidas del **Inventario Principal** y envía el nuevo saldo actualizado a todas las demás tiendas conectadas.
2. **Cuando recibes mercancía o ajustas bodega:** Modificas la cantidad central (en pantalla, por Excel o desde tu almacén) y todas tus tiendas publican la nueva existencia automáticamente.
3. **Cuando auditas o concilias:** Las cifras del Inventario Principal sirven como referencia oficial para detectar y corregir cualquier desfase en las demás plataformas.

### Ejemplo Real: Compra Simultánea de Última Pieza
1. Queda **1 última unidad** disponible en almacén.
2. Dos clientes intentan comprarla casi al mismo segundo en dos canales distintos (por ejemplo, Shopify y Mercado Libre).
3. **Inventory Sync** confirma la primera orden recibida, reduce el saldo maestro a **0 unidades** y envía de inmediato la actualización a **0 unidades** (pausando la publicación) en Mercado Libre, Amazon, Tiendanube y los demás canales conectados.
4. **Resultado:** Cero sobreventas, cero reclamos y reputación comercial intacta.

---

## 3. Canales y Sistemas Compatibles

Inventory Sync unifica canales digitales regionales, globales y herramientas de operación física:

| Canal / Sistema | Tipo de Canal | Alcance Principal | Qué Sincroniza |
| :--- | :--- | :--- | :--- |
| **Mercado Libre** | Marketplace | México y Latinoamérica | Importación de publicaciones, descuento automático por venta, actualización de stock y conciliación. |
| **Amazon** | Marketplace Global | México, EE. UU. y Europa | Vinculación de catálogo, recepción de órdenes, actualización continua de inventario y conciliación. |
| **Shopify** | Tienda Propia | Global (múltiples sucursales) | Importación de catálogo y variantes, recepción de pedidos pagados, ajuste por almacén y conciliación. |
| **Tiendanube** | Tienda Propia | México y Latinoamérica | Importación de productos y variantes (tallas/colores), pedidos en tiempo real y actualización de stock. |
| **TikTok Shop** | Comercio Social | Ventas en video y transmisiones | Descuento inmediato ante compras en vivo, actualización de vitrina y control de existencias. |
| **eBay** | Marketplace Global | EE. UU. y Europa (Alemania, España, etc.) | Recepción de pedidos, actualización de unidades publicadas y verificación de diferencias. |
| **Kaufland** | Marketplace Europeo | Alemania, Polonia, Chequia, Austria, Eslovaquia | Sincronización de ofertas por país, descuento de órdenes y alineación de inventario. |
| **CONTPAQi SAE** | Sistema Administrativo | Bodega física y sucursales | Lectura y descuento sobre el inventario administrativo real de la empresa con freno ante stock cero. |
| **Excel + App Local** | Hoja de Cálculo / Mostrador | Caja física y carga masiva | Importación/exportación inteligente de catálogos y sincronizador automático de escritorio cada 60 segundos. |

---

## 4. Guía Completa de Módulos y Pantallas

### 4.1. Panel Principal (`Dashboard`)
Es la vista ejecutiva al iniciar sesión. Resume en segundos el estado operativo de todo el negocio:
* **Estado del Sistema y Canales Activos:** Muestra cuántas tiendas están conectadas y si la sincronización automática está activa o pausada.
* **Indicadores Clave:**
  * *Stock Total Físico:* Total de unidades sumadas en tu almacén central.
  * *Stock Crítico (menos de 5 unidades):* Artículos próximos a agotarse que requieren resurtido.
  * *Ventas Recientes (últimas 24 horas):* Volumen de pedidos procesados automáticamente.
  * *Discrepancias de Stock:* Productos donde alguna tienda muestra un número distinto al almacén.
* **Gráfica de los Últimos 7 Días:** Ritmo diario de unidades vendidas.
* **Alertas Recientes y Últimas Ventas:** Accesos rápidos para revisar productos críticos o verificar que los pedidos recientes ya se descontaron en todas tus tiendas.

### 4.2. Catálogo Maestro (`Inventario`)
Es el centro de administración de todos tus productos y sus existencias tienda por tienda:
* **Vista Comparativa en Tabla:** Muestra en una misma fila el código SKU, nombre, marca, **Stock Central Físico** y la existencia publicada en cada canal conectado, marcando visualmente si está **Sincronizado** o **Desfasado**.
* **Edición Rápida en Línea:** Haz clic en el icono de lápiz sobre cualquier producto para ajustar su existencia física y propagar el cambio de inmediato a todas las tiendas.
* **Importación Directa desde Tiendas:** Botones dedicados (**Importar de ML**, **Sync Shopify**, **Sync Tiendanube**) para traer tu catálogo actual sin capturarlo desde cero.
* **Carga y Exportación con Excel:**
  * *Plantilla:* Descarga un formato limpio listo para llenar.
  * *Importar:* Sube archivos Excel con miles de productos; el sistema detecta automáticamente columnas como SKU, Nombre, Stock, Categoría, Marca, Precio, Costo y Código de Barras.
  * *Exportar / Exportar Selección:* Descarga todo tu inventario o únicamente los productos filtrados.
* **Filtros Inteligentes:** Filtra en un clic por *Todos*, *En Stock*, *Stock Bajo*, *Agotados*, *Sobre-Stock* o *Desfasados*, además de búsqueda por categoría, marca o rango de unidades.

### 4.3. Ficha Detallada de Producto
Al abrir cualquier artículo del catálogo puedes inspeccionar:
* Existencias centrales frente a las existencias individuales en cada canal.
* Precio de venta, costo y cálculo automático de **Margen Bruto** de ganancia.
* Códigos de vinculación exactos con los que ese producto vive en cada tienda externa.
* Accesos directos a su **Historial de Movimientos** y a **Auditar en Conciliación**.

### 4.4. Historial de Pedidos (`Ventas`)
Concentra cronológicamente todas las compras recibidas sin importar en qué tienda ocurrieron:
* Identifica fecha, hora exacta, tienda de origen, número de orden de la plataforma, código SKU y piezas compradas.
* Muestra el estado de procesamiento (*Confirmado*, *Procesando*, *Pendiente* o *Con incidencia*) y el conteo de intentos realizados hasta confirmar que todas las demás tiendas actualizaron su stock.
* Permite buscar por número de orden o SKU y filtrar por canal o estado.

### 4.5. Monitoreo en Vivo (`Sincronización`)
Permite observar en tiempo real qué está haciendo el motor automático con cada operación:
* **Cola Activa y Diagrama de Flujo:** Muestra visualmente el recorrido desde que se registra la venta en el canal de origen, se descuenta en el almacén central y se replica hacia cada tienda conectada.
* **Línea de Tiempo Paso a Paso:** Desglosa cada etapa completada con hora exacta y confirmación por tienda.

### 4.6. Gobernanza y Auditoría (`Conciliación`)
Diseñado para gerentes de operaciones y encargados de almacén que necesitan certeza absoluta en sus números:
* **Mapa Comparativo de Existencias:** Enfrenta cara a cara el saldo del almacén central contra cada canal conectado, señalando al instante dónde existe una diferencia.
* **Corrección Puntual o Masiva:**
  * *Conciliar solo este canal:* Iguala únicamente la tienda seleccionada con la cifra del almacén.
  * *Sincronizar todo el inventario:* Alinea el catálogo completo en todos los canales activos.
  * *Resolver conflicto manualmente:* Asistente para elegir qué tienda tiene el dato correcto o escribir una cifra definitiva dejando constancia del motivo.
* **Reglas de Protección por Canal (Colchones de Seguridad):**
  * *Porcentaje de publicación:* Ejemplo, mostrar en un marketplace únicamente el **90%** de tu inventario real.
  * *Reserva fija de unidades:* Ejemplo, guardar siempre **3 piezas de colchón** sin publicar para absorber ventas de mostrador o picos de alta demanda.
* **Botón de Pausa de Emergencia:** Congela temporalmente la salida de actualizaciones hacia tus tiendas con un solo clic y permite reanudarla cuando termines de revisar bodega.
* **Exportar Diferencias:** Descarga en Excel un reporte de auditoría únicamente con los productos que presentaron descuadres.

### 4.7. Centro de Alertas (`Alertas`)
Reúne todos los avisos preventivos clasificados en gravedad **Alta**, **Media** y **Baja**:
* **Stock Agotado (0 unidades):** Artículos que ya quedaron sin inventario físico.
* **Nivel Crítico (menos de 5 unidades):** Aviso temprano para reordenar a proveedores.
* **Desalineación entre Tiendas:** Productos con cantidades distintas entre canales.
* **Incidencias de Comunicación:** Avisos cuando alguna tienda externa requiere reconexión o revisión.

### 4.8. Configuración de Tiendas (`Canales e Integraciones`)
Desde esta pantalla conectas o desconectas tus canales sin depender de soporte externo:
1. **Selección de Inventario Principal:** Eliges qué canal o almacén manda como referencia maestra.
2. **Conexión Rápida en 1 Clic:** En canales compatibles como **Mercado Libre** y **Tiendanube**, basta pulsar **Conectar** e iniciar sesión con tu cuenta comercial para autorizar el enlace automáticamente.
3. **Conexión por Credenciales Comerciales:** En **Shopify**, **Amazon**, **TikTok Shop**, **eBay** y **Kaufland**, ingresas los datos de tu cuenta de vendedor siguiendo las instrucciones en pantalla.
4. **Botón «Probar Conexión en Vivo»:** Verifica al instante que tus datos son válidos y muestra el nombre oficial de tu tienda conectada antes de empezar a sincronizar.
5. **Aplicación Local de Escritorio (Para Mostrador o Almacén):**
   * Descargas el programa para computadora de tienda desde la misma pantalla.
   * Copias tu **Código de Vinculación**, eliges tu archivo Excel local de inventario, defines cada cuántos segundos quieres sincronizar (por ejemplo, cada 60 segundos) y presionas **Iniciar Sincronización Automática**.
   * Incluye botón para **descargar a tu Excel local** las ventas ocurridas en línea.

### 4.9. Centro de Ayuda Integrado (`Tickets de Soporte`)
Canal directo de comunicación con el equipo de soporte desde adentro de la plataforma con plantillas rápidas para **Activación de Cuenta**, **Apoyo para Vincular Tiendas** o **Incidencia Urgente**, seguimiento conversacional e historial completo.

---

## 5. Blindaje Operativo y Seguridad del Inventario

1. **Modo Mantenimiento con «Cero Pérdida de Ventas»:** Durante conteos físicos anuales, las compras entrantes no se pierden ni se rechazan; quedan retenidas en orden mientras pausas los envíos salientes y se procesan automáticamente al finalizar el conteo.
2. **Reintentos Inteligentes ante Caídas Externas:** Si un marketplace tarda en responder, las demás tiendas se actualizan normal y el sistema reintenta automáticamente a los **5 s, 20 s, 1 min y 3 min**. Si continúa sin respuesta, resguarda el pedido en una bandeja de atención para reenviarlo en un clic sin descontar nunca dos veces.
3. **Escudo contra Rebotes o Descuentos Dobles:** El sistema identifica sus propias actualizaciones para evitar ciclos repetitivos entre tiendas.
4. **Puntos de Restauración (Copias de Seguridad):** Genera respaldos automáticos antes de cualquier carga masiva de Excel (y manuales cuando tú decidas), permitiendo regresar todo tu inventario a un estado anterior con un solo clic.
5. **Bitácora de Auditoría Inalterable:** Registra permanentemente producto, stock anterior, stock nuevo, diferencia, responsable, motivo comercial, fecha y hora exacta de cada movimiento.

---

## 6. Perfiles de Usuario y Control de Permisos

| Perfil | Puesto Recomendado | Qué Puede Hacer en la Plataforma |
| :--- | :--- | :--- |
| **Administrador General** | Dirección de Plataforma (Multiempresa) | Alta y activación de empresas clientes, asignación de planes, límites de catálogo y supervisión global. |
| **Administrador de Empresa** | Dueño de Negocio / Director de Operaciones | Control total de su empresa: conectar tiendas, crear reglas por canal, activar Modo Mantenimiento y restaurar copias de seguridad. |
| **Gerente de Almacén** | Jefe de Bodega / Logística | Cargar hojas de Excel, registrar recepciones de mercancía, ajustar conteos físicos y resolver discrepancias entre tiendas. |
| **Operador** | Auxiliar de Bodega / Mostrador | Consultar catálogo y pedidos en vivo, y registrar entradas o salidas físicas indicando motivo comercial. |
| **Consulta / Auditor** | Contabilidad / Finanzas / Auditoría | Acceso estricto de solo lectura a reportes, existencias e historial de movimientos, sin permiso para modificar ningún dato. |

---

## 7. Esquema Comercial y Planes

Inventory Sync ofrece **14 días de prueba sin riesgo** y comprobante fiscal CFDI 4.0:

* **Plan Básico (hasta 200 SKUs):** Para emprendedores y marcas emergentes con catálogos compactos.
* **Plan Todo Incluido / Pro (SKUs ilimitados):** Todos los canales, cargas masivas en Excel, reglas de reserva por tienda, copias de seguridad, bitácora completa y soporte directo ($299 MXN/mes en promoción durante los primeros 6 meses; regular $499 MXN/mes).
* **Plan Corporativo / Enterprise (hasta 39,000+ SKUs):** Para distribuidoras, refaccionarias y mayoristas con catálogos masivos, integración administrativa con almacén físico y atención prioritaria.

---

## 8. Preguntas Frecuentes (FAQ)

* **¿Necesito volver a capturar todos mis productos desde cero?**
  No. Puedes importar tu catálogo actual desde Mercado Libre, Shopify o Tiendanube con un clic, o subir tu archivo Excel actual con reconocimiento automático de columnas.
* **¿Cómo sabe el sistema qué productos son iguales entre mis tiendas?**
  Por el **código SKU** de cada artículo. Mientras uses el mismo código SKU en tus distintos canales, Inventory Sync los enlaza y mantiene parejos en automático.
* **¿Qué pasa si también vendo en mostrador físico?**
  Conecta CONTPAQi SAE o instala la **Aplicación Local de Escritorio** en tu computadora de caja para sincronizar tu archivo Excel local cada 60 segundos con la nube.
* **¿Qué pasa si subo por error un Excel con cantidades equivocadas?**
  El sistema crea una copia de seguridad automática antes de cada carga masiva; con un clic restauras todo tu inventario al momento exacto anterior.
* **¿Cobran comisión por cada venta?**
  En los planes estándar de suscripción mensual pagas únicamente tu tarifa fija mensual, sin comisiones por pedido sincronizado.
