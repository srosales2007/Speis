# SPEIS — Sitio web

Sitio estático (HTML/CSS/JS, sin framework ni build) con un proxy serverless en
Vercel que muestra propiedades en vivo desde el CRM **Wasi**.

## Estructura

- `index.html` — página principal (intro, equipo, logros, proyectos, testimonios).
- `propiedades.html` — listado de propiedades **en vivo** desde Wasi (con filtros).
- `propiedad.html` — detalle de una propiedad (galería, descripción, mapa).
- `styles.css` — todos los estilos. `script.js` — todo el comportamiento.
- `api/` — funciones serverless (Node) que hacen de proxy a Wasi.
  - `api/_lib/wasi.js` — cliente único de Wasi (endpoints, auth, paginación,
    verificación de `status`, mapa de tipos, normalización).
  - `api/properties.js` — `GET /api/properties` → listado activo.
  - `api/property.js` — `GET /api/property?id=…` → detalle.

## Integración con Wasi

- El front-end **solo** llama a `/api/properties` y `/api/property?id=…`.
  Nunca llama a `api.wasi.co` directamente.
- Las credenciales viven solo en el servidor (variables de entorno) y **nunca**
  llegan al navegador.
- Solo se muestran propiedades **visibles** (estado distinto de Inactivo/Eliminado)
  y **disponibles** (`id_availability = 1`); las vendidas o despublicadas
  desaparecen del sitio automáticamente. Las **destacadas** (Outstanding) sí se
  muestran.

## Variables de entorno

| Variable          | Descripción                       |
| ----------------- | --------------------------------- |
| `WASI_ID_COMPANY` | `id_company` de la cuenta de Wasi |
| `WASI_TOKEN`      | `wasi_token` de la cuenta de Wasi |

### En Vercel
Project → **Settings → Environment Variables** → agregar `WASI_ID_COMPANY` y
`WASI_TOKEN` (entornos Production + Preview) → **Redeploy**.

### En local
1. `cp .env.example .env` y completar los valores reales.
2. `npm install` (instala solo la CLI de Vercel; sin dependencias de runtime).
3. `npm run dev` (ejecuta `vercel dev` para servir el sitio **y** las funciones).

> `python -m http.server` sigue sirviendo el sitio, pero **no** ejecuta `/api`;
> para probar las propiedades en vivo usar `vercel dev`.

`.env` está en `.gitignore` — nunca se sube. Solo se versiona `.env.example`.
