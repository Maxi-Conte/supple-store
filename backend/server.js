require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const carritoRoutes = require('./routes/carrito');
const pagosRoutes = require('./routes/pagos');
const adminSesionRoutes = require('./routes/admin-sesion');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json({
  type: 'application/json',
  limit: '10mb'
}));
app.use(cookieParser());

// API
app.use('/api/auth', authRoutes);
app.use('/api', productosRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/admin', adminSesionRoutes);

// Config pública que el frontend necesita (public key de MP, nunca el access token)
app.get('/api/config', (req, res) => {
  res.json({ mpPublicKey: process.env.MP_PUBLIC_KEY });
});

// Frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
