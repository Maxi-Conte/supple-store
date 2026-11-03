require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const carritoRoutes = require('./routes/carrito');
const pagosRoutes = require('./routes/pagos');
const adminSesionRoutes = require('./routes/admin-sesion');
const pedidosRoutes = require('./routes/pedidos');
const cuponesRoutes = require('./routes/cupones');
const arrepentimientoRoutes = require('./routes/arrepentimiento');
const seoRoutes = require('./routes/seo');
const { obtenerConfigEnvio } = require('./utils/envio');
const { obtenerConfigNegocio } = require('./utils/negocio');

const app = express();
const PORT = process.env.PORT || 3000;

// Render / Railway ponen un proxy adelante: necesario para saber la IP real
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Cabeceras de seguridad. La CSP queda apagada porque el sitio carga
// Three.js desde un CDN y redirige a Mercado Pago.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json({
  type: 'application/json',
  limit: '10mb'
}));
app.use(cookieParser());

// Límite de intentos para login, registro y formularios sensibles.
// Cada ruta tiene su propio contador por IP (ventana de 15 minutos).
function limiteIntentos(limit, opciones = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' },
    ...opciones
  });
}

// En los logins solo cuentan los intentos fallidos
const soloFallidos = { skipSuccessfulRequests: true };

app.use('/api/auth/login', limiteIntentos(10, soloFallidos));
app.use('/api/admin/login', limiteIntentos(10, soloFallidos));
app.use('/api/auth/registro', limiteIntentos(10));
app.use('/api/auth/solicitar-recuperacion', limiteIntentos(5));
app.use('/api/auth/restablecer-password', limiteIntentos(10));
app.use('/api/arrepentimiento', limiteIntentos(5));
app.use('/api/pagos/validar-cupon', limiteIntentos(30));

// Límite general para el resto de la API
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' }
}));

// API
app.use('/api/auth', authRoutes);
app.use('/api', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/admin/pedidos', pedidosRoutes);
app.use('/api/admin/cupones', cuponesRoutes);
app.use('/api/admin', adminSesionRoutes);
app.use('/api/arrepentimiento', arrepentimientoRoutes);

// Config pública que el frontend necesita (public key de MP, nunca el access token)
app.get('/api/config', (req, res) => {
  res.json({
    mpPublicKey: process.env.MP_PUBLIC_KEY,
    envio: obtenerConfigEnvio(),
    ...obtenerConfigNegocio()
  });
});

// robots.txt y sitemap.xml
app.use(seoRoutes);

// index.html con la URL pública del sitio en las etiquetas para compartir
const rutaIndex = path.join(__dirname, '..', 'frontend', 'index.html');
let indexHtml = null;

function enviarIndex(req, res) {
  if (!indexHtml || process.env.NODE_ENV !== 'production') {
    const urlSitio = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
    indexHtml = fs.readFileSync(rutaIndex, 'utf8').replaceAll('__URL_SITIO__', urlSitio);
  }
  res.type('html').send(indexHtml);
}

app.get(['/', '/index.html'], enviarIndex);

// Frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  enviarIndex(req, res);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
