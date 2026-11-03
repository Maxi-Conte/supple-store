const db = require("../db/database");

/* ==================================================
   ESTADOS DEL PEDIDO
================================================== */

const ESTADOS_PEDIDO = {
  pendiente: "Pago pendiente",
  rechazado: "Pago rechazado",
  pagado: "Pagado",
  preparando: "Preparando",
  enviado: "Enviado",
  listo_retiro: "Listo para retirar",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

/*
  Estados en los que el stock ya fue descontado.
  Si un pedido así se cancela, hay que devolverlo.
*/
const ESTADOS_CON_STOCK_DESCONTADO = [
  "pagado",
  "preparando",
  "enviado",
  "listo_retiro",
  "entregado"
];

/* ==================================================
   OBTENER ORDEN CON SUS ITEMS
================================================== */

async function obtenerOrdenCompleta(ordenId, cliente = db) {
  const ordenResult = await cliente.query(
    `
      SELECT
        o.*,
        u.email AS email_usuario,
        u.nombre AS nombre_usuario

      FROM ordenes o

      LEFT JOIN usuarios u
        ON u.id = o.usuario_id

      WHERE o.id = $1
    `,
    [ordenId]
  );

  if (ordenResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await cliente.query(
    `
      SELECT
        producto_id,
        variante_id,
        nombre_producto,
        sabor,
        peso_gramos,
        precio_unitario,
        cantidad

      FROM orden_items

      WHERE orden_id = $1

      ORDER BY id ASC
    `,
    [ordenId]
  );

  const orden = ordenResult.rows[0];

  return {
    ...orden,

    email_comprador:
      orden.email_comprador || orden.email_usuario,

    nombre_comprador:
      orden.nombre_comprador || orden.nombre_usuario,

    total: Number(orden.total),
    subtotal: Number(orden.subtotal ?? orden.total),
    costo_envio: Number(orden.costo_envio) || 0,

    items: itemsResult.rows.map((item) => ({
      ...item,
      precio_unitario: Number(item.precio_unitario),
      cantidad: Number(item.cantidad)
    }))
  };
}

/* ==================================================
   MOVER STOCK DE UNA ORDEN
   signo -1 descuenta, +1 devuelve
================================================== */

async function moverStockOrden(ordenId, signo, cliente = db) {
  const itemsResult = await cliente.query(
    `
      SELECT
        variante_id,
        cantidad

      FROM orden_items

      WHERE orden_id = $1
        AND variante_id IS NOT NULL
    `,
    [ordenId]
  );

  for (const item of itemsResult.rows) {
    const cantidad = Number(item.cantidad) * signo;

    const resultadoStock = await cliente.query(
      `
        UPDATE producto_variantes

        SET stock = stock + $1

        WHERE id = $2
          AND stock + $1 >= 0

        RETURNING id
      `,
      [cantidad, Number(item.variante_id)]
    );

    if (resultadoStock.rows.length === 0) {
      console.error(
        "No se pudo actualizar el stock de la variante:",
        {
          orden_id: ordenId,
          variante_id: item.variante_id,
          cantidad
        }
      );
    }
  }

  /*
    Sincronizamos la columna antigua productos.stock
    para que el panel administrador todavía muestre
    un total coherente.
  */

  await cliente.query(
    `
      UPDATE productos p

      SET stock = COALESCE(
        (
          SELECT SUM(pv.stock)

          FROM producto_variantes pv

          WHERE pv.producto_id = p.id
            AND pv.activo = TRUE
        ),
        0
      )

      WHERE p.id IN (
        SELECT DISTINCT producto_id

        FROM orden_items

        WHERE orden_id = $1
      )
    `,
    [ordenId]
  );
}

function descontarStockOrden(ordenId, cliente) {
  return moverStockOrden(ordenId, -1, cliente);
}

function devolverStockOrden(ordenId, cliente) {
  return moverStockOrden(ordenId, 1, cliente);
}

module.exports = {
  ESTADOS_PEDIDO,
  ESTADOS_CON_STOCK_DESCONTADO,
  obtenerOrdenCompleta,
  descontarStockOrden,
  devolverStockOrden
};
