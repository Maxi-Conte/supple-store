# FORJA — Tienda de suplementos

Proyecto full-stack: catálogo por categorías, carrito (invitado o logueado) y pagos con Mercado Pago (tarjetas y cuotas vía Checkout Pro).

## Stack

- **Frontend:** HTML + CSS + JavaScript vanilla
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Pagos:** Mercado Pago (SDK oficial, Checkout Pro)

## Estructura

```
supple-store/
├── backend/
│   ├── server.js          # servidor Express
│   ├── db/                # schema.sql, conexión e inicialización
│   ├── middleware/auth.js # identifica usuario logueado o invitado
│   └── routes/            # auth, productos, carrito, pagos
├── frontend/
│   ├── index.html
│   ├── pago-exitoso.html / pago-fallido.html / pago-pendiente.html
│   ├── css/styles.css
│   └── js/                # api.js, auth.js, productos.js, carrito.js
└── package.json
```

## 1. Instalación local

```bash
cd supple-store
npm install
cp .env.example .env
```

Editá `.env` con:
- `DATABASE_URL`: cadena de conexión a tu Postgres local (podés levantar uno rápido con Docker: `docker run --name pg-forja -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`)
- `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY`: las credenciales de **Test** que sacás en https://www.mercadopago.com.ar/developers/panel
- `JWT_SECRET`: cualquier string largo y random

## 2. Inicializar la base de datos

```bash
npm run db:init
```

Esto crea las tablas y carga categorías + productos de ejemplo (Whey, Isolate, Creatina, Pre-entreno, BCAA, Multivitamínico). Editá `backend/db/schema.sql` para cambiar el catálogo inicial, o insertá productos directamente contra la tabla `productos` una vez que el negocio esté andando.

## 3. Correr en desarrollo

```bash
npm run dev
```

Abrí http://localhost:3000

## 4. Probar el flujo de pago

Con las credenciales de **Test**, Mercado Pago te deja pagar con tarjetas de prueba ficticias (las conseguís en su documentación oficial de "tarjetas de prueba"). Nunca uses tarjetas reales contra el ambiente de test.

## 5. Deploy en Render o Railway

1. Subí este proyecto a un repo de GitHub.
2. En Render/Railway: creá un servicio de **PostgreSQL** primero (te da un `DATABASE_URL` automáticamente).
3. Creá el servicio web apuntando a este repo:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Variables de entorno a configurar en el panel del servicio:
   - `DATABASE_URL` (la que te dio el Postgres administrado)
   - `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` (usá las de **producción** cuando estés listo para cobrar de verdad)
   - `JWT_SECRET`
   - `FRONTEND_URL` → la URL pública que te asigna Render/Railway (ej. `https://forja.onrender.com`)
   - `NODE_ENV=production`
5. Una vez desplegado, corré la inicialización de la base contra la DB de producción:
   ```bash
   DATABASE_URL="la-url-de-produccion" npm run db:init
   ```
6. En el panel de Mercado Pago, configurá la **notification_url** (webhook) apuntando a `https://tu-dominio/api/pagos/webhook` — esto ya se envía automáticamente en cada preferencia creada, pero conviene verificarlo en el panel también.

## Notas de seguridad importantes

- **Nunca** se manejan números de tarjeta en este código: todo pasa por el Checkout de Mercado Pago, así evitamos la certificación PCI-DSS que exige manipular datos de tarjetas directamente.
- El `MP_ACCESS_TOKEN` es secreto y solo vive en el backend. El `MP_PUBLIC_KEY` es el único dato de Mercado Pago que es seguro exponer al frontend (se sirve vía `/api/config`).
- Las contraseñas se guardan con hash (`bcryptjs`), nunca en texto plano.
- El carrito de invitado se identifica con una cookie `httpOnly` (no accesible desde JS), así se reduce el riesgo de robo de sesión.

## Próximos pasos sugeridos

- Panel de administración simple para cargar/editar productos sin tocar SQL a mano.
- Página de detalle de producto individual (`/producto/:slug`).
- Envío de emails de confirmación de compra (ej. con Resend o SendGrid).
- Migrar el catálogo de ejemplo por tus productos e imágenes reales.
