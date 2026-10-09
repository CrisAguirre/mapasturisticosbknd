# mapasturisticosBKND — Backend (Node + Express + MongoDB)

API para **Caminos de Fogón y Palabra**. Vive al lado del front (`../mapasturisticos`).

## Requisitos
- Node 18+
- MongoDB Atlas (ver `MONGODB_URI` en `.env`)

## Uso

```bash
npm install
npm run dev    # desarrollo con --watch en http://localhost:4000
npm start      # producción
```

## Variables de entorno (`.env`)

| Var | Uso |
| --- | --- |
| `PORT` | Puerto de la API (defecto 4000) |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas |
| `FRONTEND_URL` | URL(s) del front permitidas por CORS, separadas por coma |
| `JWT_SECRET` | Secreto para firmar tokens de `Entrar` |
| `ADMIN_USER` | Usuario único administrador (ej. `admin`) |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt de la clave del admin (generar con bcrypt, costo 10) |

Ejemplo:
```env
PORT=4000
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/mapasturisticos?appName=Cluster0
FRONTEND_URL=http://localhost:5173
JWT_SECRET=un-secreto-largo
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=$2b$10$hash-bcrypt-de-la-clave
```

> En Render, estas mismas variables deben configurarse en el dashboard
> (Environment). Sin `ADMIN_USER` / `ADMIN_PASSWORD_HASH` el login no funciona.

## Endpoints

- `GET /api/health` → `{ ok, db, time }`
- `POST /api/auth/register` → `403` (registro público deshabilitado: usuario único)
- `POST /api/auth/login` (`{ user | username | email, password }`) → `{ token, user }`
- `GET /api/auth/me` (header `Authorization: Bearer <token>`) → `{ user }`
