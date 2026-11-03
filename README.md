# 🛒 Supple Store

Tienda online de suplementos deportivos desarrollada como proyecto full-stack.

El sistema permite visualizar productos por categorías, administrar el catálogo desde un panel de administración, gestionar un carrito de compras para invitados o usuarios registrados y realizar pagos mediante Mercado Pago.

---

# 🚀 Tecnologías utilizadas

## Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)

## Backend
- Node.js
- Express.js

## Base de datos
- PostgreSQL

## Librerías
- bcryptjs
- jsonwebtoken
- cookie-parser
- uuid
- pg
- Mercado Pago SDK

---

# 📂 Estructura del proyecto

```text
supple-store/
│
├── backend/
│   ├── db/
│   │   ├── database.js
│   │   ├── init.js
│   │   └── schema.sql
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── productos.js
│   │   ├── carrito.js
│   │   ├── auth.js
│   │   ├── pagos.js
│   │   └── admin-sesion.js
│   │
│   └── server.js
│
├── frontend/
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   │
│   ├── js/
│   │   ├── api.js
│   │   ├── productos.js
│   │   ├── carrito.js
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── hero3d.js
│   │   └── login.js
│   │
│   ├── img/
│   ├── admin.html
│   ├── index.html
│   ├── pago-exitoso.html
│   ├── pago-fallido.html
│   └── pago-pendiente.html
│
├── package.json
└── README.md
```

---

# ✨ Funcionalidades actuales

## Catálogo

- Listado dinámico de productos.
- Productos obtenidos desde PostgreSQL.
- Filtro por categorías.
- Búsqueda de productos.
- Productos activos e inactivos.

---

## Panel de Administración

Permite administrar completamente el catálogo.

Actualmente incluye:

- Listado de productos.
- Estadísticas.
- Crear productos.
- Editar productos.
- Eliminar productos.
- Activar o desactivar publicaciones.
- Filtro por categoría.

---

## Carrito de compras

Implementado completamente desde el backend.

Características:

- Funciona para invitados.
- Funciona para usuarios registrados.
- Cookie segura para visitantes.
- Agregar productos.
- Modificar cantidades.
- Eliminar productos.
- Cálculo automático del total.

---

## Usuarios

- Registro.
- Inicio de sesión.
- JWT.
- Contraseñas encriptadas con bcrypt.

---

## Pagos

Integración con Mercado Pago Checkout Pro.

Incluye:

- Creación de preferencias.
- Redirección al checkout.
- Páginas de:

- Pago exitoso
- Pago pendiente
- Pago rechazado

---

# 🗄 Base de datos

El proyecto utiliza PostgreSQL.

Tablas principales:

- usuarios
- categorias
- marcas
- productos
- carritos
- carrito_items

---

# ⚙ Instalación

Clonar el proyecto:

```bash
git clone https://github.com/Maxi-Conte/supple-store.git
```

Entrar a la carpeta:

```bash
cd supple-store
```

Instalar dependencias:

```bash
npm install
```

Crear el archivo `.env` utilizando `.env.example`.

Crear las tablas y aplicar las migraciones:

```bash
npm run db:setup
```

En una base que ya existe, alcanza con `npm run db:migrate` (se puede correr varias veces).

Hacer un respaldo de la base en `backups/`:

```bash
npm run db:backup
```

Iniciar el servidor:

```bash
npm start
```

o en desarrollo:

```bash
npm run dev
```

---

# Variables de entorno

Todas están explicadas en `.env.example`. Las principales:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET`, `ADMIN_SESSION_SECRET` | Firmar sesiones de clientes y del panel |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Acceso al panel administrativo |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` | Mercado Pago y firma del webhook |
| `FRONTEND_URL` | URL pública. Con `https://` se activan el retorno y las notificaciones de Mercado Pago |
| `SMTP_*`, `MAIL_FROM`, `MAIL_TIENDA` | Envío de emails y a dónde llegan los avisos de venta |
| `ENVIO_COSTO`, `ENVIO_GRATIS_DESDE`, `RETIRO_DIRECCION` | Costo de envío y retiro en local |
| `NEGOCIO_*` | Datos legales, WhatsApp y redes |
| `GA_MEASUREMENT_ID`, `META_PIXEL_ID` | Analítica (opcional) |

---

# 🚀 Publicación en Render

1. En Render: **New → Blueprint** y elegir el repositorio. Usa `render.yaml`: crea la base y el servidor, y corre `npm run db:setup` en cada deploy.
2. Completar en Render las variables marcadas como secretas (Mercado Pago, SMTP, admin, negocio).
3. Poner en `FRONTEND_URL` la URL https que da Render (o el dominio propio).
4. En Mercado Pago → Tus integraciones → Webhooks: configurar `https://TU-DOMINIO/api/pagos/webhook` con el evento **Pagos** y copiar la clave secreta en `MP_WEBHOOK_SECRET`.
5. Cambiar las credenciales `TEST-` por las de producción.
6. Respaldos: el plan gratis de Render no guarda copias. Hacer `npm run db:backup` apuntando a la base de Render o pasar a un plan pago con backups diarios.

> El plan gratis de Render apaga el servidor cuando no tiene visitas y la base gratuita vence a los 30 días. Para vender de verdad conviene un plan pago.

---

# Estado actual del proyecto

## Implementado

- Backend REST
- PostgreSQL
- CRUD de productos
- Panel de administración
- Carrito persistente
- Login
- Registro
- Mercado Pago
- Categorías
- Marcas
- API completa
- Checkout con datos de entrega, envío o retiro
- Cupones de descuento
- Gestión de pedidos, reintegros por Mercado Pago y avisos por email
- Mi cuenta con historial de pedidos
- Recuperación de contraseña
- Páginas legales y botón de arrepentimiento
- SEO (sitemap, robots, vista previa al compartir) y analítica opcional

---

# Próximas mejoras

- Panel de administración más avanzado.
- Dashboard con gráficos.
- Gestión de clientes.
- Carga de imágenes desde el administrador.
- Responsive para dispositivos móviles.
- Filtros por marca y precio.

---

# Autor

Desarrollado por **Máximo Conte**.

Proyecto realizado con fines educativos y como portfolio de desarrollo web Full Stack.