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

Inicializar la base de datos:

```bash
npm run db:init
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

El proyecto requiere:

```env
DATABASE_URL=

JWT_SECRET=

MP_ACCESS_TOKEN=

MP_PUBLIC_KEY=
```

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

---

# Próximas mejoras

- Historial de compras.
- Panel de administración más avanzado.
- Dashboard con gráficos.
- Gestión de pedidos.
- Gestión de clientes.
- Recuperación de contraseña.
- Carga de imágenes desde el administrador.
- Responsive para dispositivos móviles.
- Deploy en Render.

---

# Autor

Desarrollado por **Máximo Conte**.

Proyecto realizado con fines educativos y como portfolio de desarrollo web Full Stack.