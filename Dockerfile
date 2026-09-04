# Dockerfile para Sincronizador de Inventario (FastAPI + Worker)
# Utiliza la imagen base oficial de Python 3.12 slim para asegurar una compilación rápida y compatibilidad.
FROM python:3.12-slim

# Evita que Python escriba archivos .pyc en el disco y asegura logs inmediatos
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo en el contenedor
WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar/ejecutar librerías como pyodbc (para conectar con CONTPAQi SAE en producción)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    unixodbc \
    unixodbc-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requisitos e instalar las dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código fuente del proyecto al directorio de trabajo
COPY . /app/

# Crear la carpeta de datos y logs necesaria para SQLite y bitácoras de persistencia
RUN mkdir -p /app/data /app/logs

# Exponer el puerto por defecto (8000)
EXPOSE 8000

# Por defecto, ejecuta el servidor FastAPI con uvicorn.
# NOTA: Para ejecutar este contenedor como Worker en su lugar, se puede hacer override del CMD al iniciar el contenedor:
# CMD override: 'python worker.py'
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
