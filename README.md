# Subastas Mario Parra

Aplicación web para consultar y gestionar subastas. Incluye una interfaz en React, una API en FastAPI y una base de datos MongoDB.

## Requisitos

- Node.js
- Python 3.10+
- MongoDB local o MongoDB Atlas

## Iniciar el proyecto

1. Instala las dependencias de la aplicación:

   ```bash
   npm install
   ```

2. Configura la base de datos. Copia el archivo de ejemplo y añade la URI de conexión de MongoDB:

   ```bash
   cp .env.example .env
   ```

   Edita `MONGODB_URI` en `.env` con tu dirección de conexión.

3. Instala las dependencias de la API:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r backend/requirements.txt
   ```

4. Inicia la aplicación y la API:

   ```bash
   npm run dev:full
   ```
