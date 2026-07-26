const express = require('express');
const db = require('../db/database');
const { identificarVisitante } = require('../middleware/auth');

const router = express.Router();
router.use(identificarVisitante);

// Busca el carrito del visitante actual (usuario o invitado) o lo crea si no existe
async function obtenerOCrearCarrito(req) {

    if (req.esInvitado) {

        const existente = await db.query(
            `SELECT id
             FROM carritos
             WHERE session_token = $1`,
            [req.guestToken]
        );

        if (existente.rows.length > 0) {
            return existente.rows[0].id;
        }

        const nuevo = await db.query(
            `INSERT INTO carritos (session_token)
             VALUES ($1)
             RETURNING id`,
            [req.guestToken]
        );

        return nuevo.rows[0].id;

    } else {

        const existente = await db.query(
            `SELECT id
             FROM carritos
             WHERE usuario_id = $1`,
            [req.usuarioId]
        );

        if (existente.rows.length > 0) {
            return existente.rows[0].id;
        }

        const nuevo = await db.query(
            `INSERT INTO carritos (usuario_id)
             VALUES ($1)
             RETURNING id`,
            [req.usuarioId]
        );

        return nuevo.rows[0].id;

    }

}

// GET /api/carrito -> contenido actual del carrito
router.get('/', async (req, res) => {
  try {
    const carritoId = await obtenerOCrearCarrito(req);
    const items = await db.query(
      `SELECT ci.id AS item_id, ci.cantidad, p.id AS producto_id, p.nombre, p.precio,
              p.imagen_url, p.stock, p.dato_destacado
       FROM carrito_items ci
       JOIN productos p ON p.id = ci.producto_id
       WHERE ci.carrito_id = $1
       ORDER BY ci.id`,
      [carritoId]
    );

    const total = items.rows.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0);
    res.json({ items: items.rows, total: Number(total.toFixed(2)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el carrito.' });
  }
});

// POST /api/carrito/items { producto_id, cantidad }
router.post('/items', async (req, res) => {
  const { producto_id, cantidad = 1 } = req.body;
  if (!producto_id || cantidad < 1) {
    return res.status(400).json({ error: 'producto_id y cantidad (>=1) son obligatorios.' });
  }

  try {
    const producto = await db.query('SELECT stock FROM productos WHERE id = $1 AND activo = true', [producto_id]);
    if (producto.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    if (producto.rows[0].stock < cantidad) {
      return res.status(409).json({ error: 'No hay stock suficiente.' });
    }

    const carritoId = await obtenerOCrearCarrito(req);

    await db.query(
      `INSERT INTO carrito_items (carrito_id, producto_id, cantidad)
       VALUES ($1, $2, $3)
       ON CONFLICT (carrito_id, producto_id)
       DO UPDATE SET cantidad = carrito_items.cantidad + EXCLUDED.cantidad`,
      [carritoId, producto_id, cantidad]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar el producto al carrito.' });
  }
});

// PUT /api/carrito/items/:itemId { cantidad }
router.put('/items/:itemId', async (req, res) => {
  const { cantidad } = req.body;
  if (!cantidad || cantidad < 1) {
    return res.status(400).json({ error: 'La cantidad debe ser al menos 1. Para eliminar, usá DELETE.' });
  }
  try {
    await db.query('UPDATE carrito_items SET cantidad = $1 WHERE id = $2', [cantidad, req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la cantidad.' });
  }
});

// DELETE /api/carrito/items/:itemId
router.delete('/items/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM carrito_items WHERE id = $1', [req.params.itemId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el ítem.' });
  }
});

module.exports = router;
