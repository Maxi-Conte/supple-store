const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db = require('../db/database');
const { identificarVisitante } = require('../middleware/auth');

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

// POST /api/pagos/crear-preferencia
// Toma el carrito actual, crea una orden en estado "pendiente" y devuelve el link de pago de MP.
router.post('/crear-preferencia', identificarVisitante, async (req, res) => {
  const { email_comprador } = req.body;

  try {
    const filtro = req.esInvitado
      ? { columna: 'session_token', valor: req.guestToken }
      : { columna: 'usuario_id', valor: req.usuarioId };

    const carritoResult = await db.query(
      `SELECT id FROM carritos WHERE ${filtro.columna} = $1`,
      [filtro.valor]
    );
    if (carritoResult.rows.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío.' });
    }
    const carritoId = carritoResult.rows[0].id;

    const itemsResult = await db.query(
      `SELECT p.id, p.nombre, p.precio, ci.cantidad
       FROM carrito_items ci
       JOIN productos p ON p.id = ci.producto_id
       WHERE ci.carrito_id = $1`,
      [carritoId]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío.' });
    }

    const total = itemsResult.rows.reduce((acc, i) => acc + Number(i.precio) * i.cantidad, 0);

    // Creamos la orden en estado pendiente ANTES de mandar a MP
    const ordenResult = await db.query(
      `INSERT INTO ordenes (usuario_id, email_comprador, total, estado)
       VALUES ($1, $2, $3, 'pendiente') RETURNING id`,
      [req.esInvitado ? null : req.usuarioId, email_comprador || null, total]
    );
    const ordenId = ordenResult.rows[0].id;

    for (const item of itemsResult.rows) {
      await db.query(
        `INSERT INTO orden_items (orden_id, producto_id, nombre_producto, precio_unitario, cantidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [ordenId, item.id, item.nombre, item.precio, item.cantidad]
      );
    }

    // Armamos la preferencia de Mercado Pago (Checkout Pro)
    const preference = new Preference(mpClient);
    const resultado = await preference.create({
      body: {
        items: itemsResult.rows.map((i) => ({
          id: String(i.id),
          title: i.nombre,
          quantity: i.cantidad,
          unit_price: Number(i.precio),
          currency_id: 'ARS'
        })),
        payer: email_comprador ? { email: email_comprador } : undefined,
        external_reference: String(ordenId),
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pago-exitoso.html?orden=${ordenId}`,
          failure: `${process.env.FRONTEND_URL}/pago-fallido.html?orden=${ordenId}`,
          pending: `${process.env.FRONTEND_URL}/pago-pendiente.html?orden=${ordenId}`
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/pagos/webhook`,
        // Habilita cuotas: MP calcula automáticamente las opciones según el medio de pago del comprador
        payment_methods: {
          installments: 12
        }
      }
    });

    await db.query('UPDATE ordenes SET mp_preference_id = $1 WHERE id = $2', [resultado.id, ordenId]);

    res.json({
      orden_id: ordenId,
      init_point: resultado.init_point, // link al checkout de MP (producción)
      sandbox_init_point: resultado.sandbox_init_point // link de pruebas
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la preferencia de pago.' });
  }
});

// POST /api/pagos/webhook -> Mercado Pago llama acá para avisar cambios de estado
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const payment = new Payment(mpClient);
      const info = await payment.get({ id: data.id });

      const ordenId = info.external_reference;
      const estado = info.status === 'approved' ? 'pagado'
        : info.status === 'rejected' ? 'rechazado'
        : 'pendiente';

      await db.query(
        'UPDATE ordenes SET estado = $1, mp_payment_id = $2 WHERE id = $3',
        [estado, info.id, ordenId]
      );

      // Si se aprobó, descontamos stock
      if (estado === 'pagado') {
        const items = await db.query('SELECT producto_id, cantidad FROM orden_items WHERE orden_id = $1', [ordenId]);
        for (const item of items.rows) {
          await db.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
        }
      }
    }

    res.sendStatus(200); // MP solo necesita un 200, si no reintenta
  } catch (err) {
    console.error('Error en webhook de MP:', err);
    res.sendStatus(200); // igual respondemos 200 para que MP no reintente infinito por un error nuestro
  }
});

// GET /api/pagos/orden/:id -> para que el frontend consulte el estado
router.get('/orden/:id', async (req, res) => {
  try {
    const resultado = await db.query('SELECT id, total, estado, creado_en FROM ordenes WHERE id = $1', [req.params.id]);
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la orden.' });
  }
});

module.exports = router;
