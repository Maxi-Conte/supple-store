const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generarToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos: nombre, email y password son obligatorios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const existente = await db.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const resultado = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email.toLowerCase(), hash]
    );

    const usuario = resultado.rows[0];
    const token = generarToken(usuario.id);
    res.status(201).json({ usuario, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la cuenta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios.' });
  }

  try {
    const resultado = await db.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    const usuario = resultado.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = generarToken(usuario.id);
    res.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

module.exports = router;
