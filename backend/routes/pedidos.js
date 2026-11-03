const express = require("express");
const db = require("../db/database");

const {
  verificarAdmin
} = require("../middleware/admin-auth");

const {
  ESTADOS_PEDIDO,
  ESTADOS_CON_STOCK_DESCONTADO,
  obtenerOrdenCompleta,
  devolverStockOrden
} = require("../utils/pedidos");

const {
  enviarActualizacionPedido
} = require("../utils/mailer");

const router = express.Router();

router.use(verificarAdmin);

/*
  Estados que el administrador puede asignar a mano.
  pendiente / rechazado / pagado los define Mercado Pago.
*/
const ESTADOS_GESTIONABLES = [
  "preparando",
  "enviado",
  "listo_retiro",
  "entregado",
  "cancelado"
];

/* ==================================================
   ADMIN - LISTAR PEDIDOS
   GET /api/admin/pedidos?estado=pagado
   Sin estado: todos menos los pagos pendientes/rechazados
================================================== */

router.get("/", async (req, res) => {
  try {
    const estado = String(req.query.estado || "");

    let filtro = `
      WHERE o.estado NOT IN ('pendiente', 'rechazado')
    `;

    const parametros = [];

    if (estado === "todos") {
      filtro = "";
    } else if (ESTADOS_PEDIDO[estado]) {
      filtro = "WHERE o.estado = $1";
      parametros.push(estado);
    }

    const resultado = await db.query(
      `
        SELECT
          o.id,
          o.estado,
          o.total,
          o.subtotal,
          o.costo_envio,
          o.metodo_entrega,
          o.nombre_comprador,
          COALESCE(o.email_comprador, u.email) AS email_comprador,
          o.telefono,
          o.dni,
          o.direccion,
          o.ciudad,
          o.provincia,
          o.codigo_postal,
          o.notas,
          o.codigo_seguimiento,
          o.mp_payment_id,
          o.creado_en,
          o.actualizado_en,

          COALESCE(
            json_agg(
              json_build_object(
                'nombre_producto', oi.nombre_producto,
                'sabor', oi.sabor,
                'peso_gramos', oi.peso_gramos,
                'cantidad', oi.cantidad,
                'precio_unitario', oi.precio_unitario
              )
              ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'
          ) AS items

        FROM ordenes o

        LEFT JOIN usuarios u
          ON u.id = o.usuario_id

        LEFT JOIN orden_items oi
          ON oi.orden_id = o.id

        ${filtro}

        GROUP BY o.id, u.email

        ORDER BY o.creado_en DESC

        LIMIT 200
      `,
      parametros
    );

    res.json(
      resultado.rows.map((orden) => ({
        ...orden,
        total: Number(orden.total),
        subtotal: Number(orden.subtotal ?? orden.total),
        costo_envio: Number(orden.costo_envio) || 0
      }))
    );
  } catch (error) {
    console.error(
      "Error al obtener los pedidos:",
      error
    );

    res.status(500).json({
      error: "Error al obtener los pedidos."
    });
  }
});

/* ==================================================
   ADMIN - CAMBIAR ESTADO DE UN PEDIDO
   PATCH /api/admin/pedidos/:id/estado
   { estado, codigo_seguimiento }
================================================== */

router.patch("/:id/estado", async (req, res) => {
  const ordenId = Number(req.params.id);

  const nuevoEstado = String(
    req.body.estado || ""
  );

  const codigoSeguimiento = String(
    req.body.codigo_seguimiento || ""
  ).trim().slice(0, 120);

  if (
    !Number.isInteger(ordenId) ||
    ordenId <= 0
  ) {
    return res.status(400).json({
      error: "El número de pedido no es válido."
    });
  }

  if (!ESTADOS_GESTIONABLES.includes(nuevoEstado)) {
    return res.status(400).json({
      error: "El estado elegido no es válido."
    });
  }

  const cliente = await db.connect();

  try {
    await cliente.query("BEGIN");

    const actualResult = await cliente.query(
      `
        SELECT estado, metodo_entrega
        FROM ordenes
        WHERE id = $1
        FOR UPDATE
      `,
      [ordenId]
    );

    if (actualResult.rows.length === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        error: "Pedido no encontrado."
      });
    }

    const actual = actualResult.rows[0];

    if (actual.estado === "cancelado") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        error: "El pedido ya está cancelado."
      });
    }

    /*
      Un pedido sin pago aprobado solo se puede cancelar.
    */
    if (
      !ESTADOS_CON_STOCK_DESCONTADO.includes(actual.estado) &&
      nuevoEstado !== "cancelado"
    ) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        error: "El pedido todavía no tiene el pago aprobado."
      });
    }

    if (
      nuevoEstado === "enviado" &&
      actual.metodo_entrega === "retiro"
    ) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        error: "Este pedido es para retirar: usá \"Listo para retirar\"."
      });
    }

    if (
      nuevoEstado === "listo_retiro" &&
      actual.metodo_entrega !== "retiro"
    ) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        error: "Este pedido es con envío: usá \"Enviado\"."
      });
    }

    await cliente.query(
      `
        UPDATE ordenes

        SET
          estado = $1,
          codigo_seguimiento = COALESCE(NULLIF($2, ''), codigo_seguimiento),
          actualizado_en = CURRENT_TIMESTAMP

        WHERE id = $3
      `,
      [nuevoEstado, codigoSeguimiento, ordenId]
    );

    /*
      Si se cancela un pedido que ya había descontado
      stock, lo devolvemos. El reintegro del dinero se
      hace desde Mercado Pago.
    */
    const stockDevuelto =
      nuevoEstado === "cancelado" &&
      ESTADOS_CON_STOCK_DESCONTADO.includes(actual.estado);

    if (stockDevuelto) {
      await devolverStockOrden(ordenId, cliente);
    }

    await cliente.query("COMMIT");

    const orden = await obtenerOrdenCompleta(ordenId);

    /*
      Solo avisamos al cliente de una cancelación
      si el pedido estaba pagado.
    */
    const debeAvisar =
      nuevoEstado !== actual.estado &&
      (nuevoEstado !== "cancelado" || stockDevuelto);

    let mailEnviado = false;

    if (debeAvisar) {
      try {
        await enviarActualizacionPedido(orden);
        mailEnviado = Boolean(orden.email_comprador) &&
          nuevoEstado !== "preparando";
      } catch (errorMail) {
        console.error(
          `No se pudo avisar al cliente del pedido #${ordenId}:`,
          errorMail.message
        );
      }
    }

    let mensaje = `Pedido #${ordenId}: ${ESTADOS_PEDIDO[nuevoEstado]}.`;

    if (mailEnviado) {
      mensaje += " Le avisamos al cliente por email.";
    }

    if (stockDevuelto) {
      mensaje += " El stock fue devuelto. Recordá hacer el reintegro desde Mercado Pago.";
    }

    res.json({ mensaje });
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});

    console.error(
      "Error al actualizar el pedido:",
      error
    );

    res.status(500).json({
      error: "Error al actualizar el pedido."
    });
  } finally {
    cliente.release();
  }
});

module.exports = router;
