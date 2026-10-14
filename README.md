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

2. Configura la base de datos. En Windows, copia el archivo de ejemplo con PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   En macOS/Linux, usa `cp .env.example .env`. En ambos casos, edita `MONGODB_URI` en `.env` con tu dirección de conexión.

3. Crea y activa el entorno virtual. En Windows (PowerShell):

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r backend/requirements.txt
   ```

   En macOS/Linux:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r backend/requirements.txt
   ```

4. Con el entorno virtual todavía activo en esa terminal, inicia la aplicación y la API:

   ```bash
   npm run dev:full
   ```
