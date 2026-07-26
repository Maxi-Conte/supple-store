const express = require("express");
const db = require("../db/database");
const {
  identificarVisitante
} = require("../middleware/auth");

const router = express.Router();

router.use(identificarVisitante);

/* ==================================================
   OBTENER O CREAR CARRITO
================================================== */

async function obtenerOCrearCarrito(req) {
  if (req.esInvitado) {
    const existente = await db.query(
      `
        SELECT id
        FROM carritos
        WHERE session_token = $1
      `,
      [req.guestToken]
    );

    if (existente.rows.length > 0) {
      return existente.rows[0].id;
    }

    const nuevo = await db.query(
      `
        INSERT INTO carritos (session_token)
        VALUES ($1)
        RETURNING id
      `,
      [req.guestToken]
    );

    return nuevo.rows[0].id;
  }

  const existente = await db.query(
    `
      SELECT id
      FROM carritos
      WHERE usuario_id = $1
    `,
    [req.usuarioId]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id;
  }

  const nuevo = await db.query(
    `
      INSERT INTO carritos (usuario_id)
      VALUES ($1)
      RETURNING id
    `,
    [req.usuarioId]
  );

  return nuevo.rows[0].id;
}

/* ==================================================
   OBTENER CARRITO
   GET /api/carrito
================================================== */

router.get("/", async (req, res) => {
  try {
    const carritoId = await obtenerOCrearCarrito(req);

    const resultado = await db.query(
      `
        SELECT
          ci.id AS item_id,
          ci.cantidad,

          p.id AS producto_id,
          p.nombre,
          p.slug,
          p.imagen_url,
          p.dato_destacado,

          pv.id AS variante_id,
          pv.sabor,
          pv.peso_gramos,
          pv.precio,
          pv.stock,
          pv.sku,

          (
            pv.precio * ci.cantidad
          ) AS subtotal

        FROM carrito_items ci

        JOIN productos p
          ON p.id = ci.producto_id

        JOIN producto_variantes pv
          ON pv.id = ci.variante_id

        WHERE ci.carrito_id = $1

        ORDER BY ci.id ASC
      `,
      [carritoId]
    );

    const items = resultado.rows.map((item) => ({
      ...item,

      cantidad: Number(item.cantidad),
      precio: Number(item.precio),
      stock: Number(item.stock),

      peso_gramos:
        item.peso_gramos !== null
          ? Number(item.peso_gramos)
          : null,

      subtotal: Number(item.subtotal)
    }));

    const total = items.reduce(
      (acumulador, item) =>
        acumulador + item.subtotal,
      0
    );

    res.json({
      items,
      total: Number(total.toFixed(2))
    });
  } catch (error) {
    console.error(
      "Error al obtener el carrito:",
      error
    );

    res.status(500).json({
      error: "Error al obtener el carrito."
    });
  }
});

/* ==================================================
   AGREGAR AL CARRITO
   POST /api/carrito/items

   Body:
   {
     producto_id,
     variante_id,
     cantidad
   }
================================================== */

router.post("/items", async (req, res) => {
  const productoId = Number(req.body.producto_id);
  const varianteId = Number(req.body.variante_id);
  const cantidad = Number(req.body.cantidad ?? 1);

  if (
    !Number.isInteger(productoId) ||
    productoId <= 0
  ) {
    return res.status(400).json({
      error: "El producto seleccionado no es válido."
    });
  }

  if (
    !Number.isInteger(varianteId) ||
    varianteId <= 0
  ) {
    return res.status(400).json({
      error: "La variante seleccionada no es válida."
    });
  }

  if (
    !Number.isInteger(cantidad) ||
    cantidad < 1
  ) {
    return res.status(400).json({
      error: "La cantidad debe ser al menos 1."
    });
  }

  try {
    /*
      Verificamos que la variante exista, esté activa
      y realmente pertenezca al producto seleccionado.
    */

    const varianteResult = await db.query(
      `
        SELECT
          pv.id,
          pv.producto_id,
          pv.sabor,
          pv.peso_gramos,
          pv.precio,
          pv.stock,
          pv.activo AS variante_activa,
          p.activo AS producto_activo

        FROM producto_variantes pv

        JOIN productos p
          ON p.id = pv.producto_id

        WHERE pv.id = $1
          AND pv.producto_id = $2
      `,
      [varianteId, productoId]
    );

    if (varianteResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "La variante seleccionada no pertenece al producto."
      });
    }

    const variante = varianteResult.rows[0];

    if (
      variante.variante_activa !== true ||
      variante.producto_activo !== true
    ) {
      return res.status(409).json({
        error:
          "El producto seleccionado no está disponible."
      });
    }

    const stockDisponible =
      Number(variante.stock) || 0;

    const precio =
      Number(variante.precio) || 0;

    if (precio <= 0) {
      return res.status(409).json({
        error:
          "Esta variante todavía no tiene un precio disponible."
      });
    }

    const carritoId = await obtenerOCrearCarrito(req);

    /*
      Revisamos si esa misma variante ya estaba
      dentro del carrito.
    */

    const itemExistente = await db.query(
      `
        SELECT id, cantidad
        FROM carrito_items

        WHERE carrito_id = $1
          AND variante_id = $2
      `,
      [carritoId, varianteId]
    );

    const cantidadActual =
      itemExistente.rows.length > 0
        ? Number(itemExistente.rows[0].cantidad)
        : 0;

    const cantidadFinal =
      cantidadActual + cantidad;

    if (cantidadFinal > stockDisponible) {
      return res.status(409).json({
        error:
          `No hay stock suficiente. Stock disponible: ${stockDisponible}.`
      });
    }

    let item;

    if (itemExistente.rows.length > 0) {
      const actualizado = await db.query(
        `
          UPDATE carrito_items

          SET
            cantidad = $1,
            producto_id = $2

          WHERE id = $3

          RETURNING *
        `,
        [
          cantidadFinal,
          productoId,
          itemExistente.rows[0].id
        ]
      );

      item = actualizado.rows[0];
    } else {
      const insertado = await db.query(
        `
          INSERT INTO carrito_items (
            carrito_id,
            producto_id,
            variante_id,
            cantidad
          )

          VALUES ($1, $2, $3, $4)

          RETURNING *
        `,
        [
          carritoId,
          productoId,
          varianteId,
          cantidad
        ]
      );

      item = insertado.rows[0];
    }

    res.status(201).json({
      ok: true,
      mensaje: "Producto agregado al carrito.",
      item
    });
  } catch (error) {
    console.error(
      "Error al agregar el producto al carrito:",
      error
    );

    res.status(500).json({
      error:
        "Error al agregar el producto al carrito."
    });
  }
});

/* ==================================================
   ACTUALIZAR CANTIDAD
   PUT /api/carrito/items/:itemId

   Body:
   {
     cantidad
   }
================================================== */

router.put("/items/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const cantidad = Number(req.body.cantidad);

  if (
    !Number.isInteger(itemId) ||
    itemId <= 0
  ) {
    return res.status(400).json({
      error: "El artículo del carrito no es válido."
    });
  }

  if (
    !Number.isInteger(cantidad) ||
    cantidad < 1
  ) {
    return res.status(400).json({
      error:
        "La cantidad debe ser al menos 1. Para eliminar el producto, usá el botón Quitar."
    });
  }

  try {
    const carritoId = await obtenerOCrearCarrito(req);

    /*
      Comprobamos que el artículo pertenezca al carrito
      actual y obtenemos el stock de su variante.
    */

    const itemResult = await db.query(
      `
        SELECT
          ci.id,
          ci.variante_id,
          pv.stock,
          pv.activo

        FROM carrito_items ci

        JOIN producto_variantes pv
          ON pv.id = ci.variante_id

        WHERE ci.id = $1
          AND ci.carrito_id = $2
      `,
      [itemId, carritoId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "El producto no se encontró en tu carrito."
      });
    }

    const item = itemResult.rows[0];
    const stockDisponible = Number(item.stock) || 0;

    if (item.activo !== true) {
      return res.status(409).json({
        error:
          "Esta variante ya no está disponible."
      });
    }

    if (cantidad > stockDisponible) {
      return res.status(409).json({
        error:
          `No hay stock suficiente. Stock disponible: ${stockDisponible}.`
      });
    }

    const resultado = await db.query(
      `
        UPDATE carrito_items

        SET cantidad = $1

        WHERE id = $2
          AND carrito_id = $3

        RETURNING *
      `,
      [cantidad, itemId, carritoId]
    );

    res.json({
      ok: true,
      item: resultado.rows[0]
    });
  } catch (error) {
    console.error(
      "Error al actualizar la cantidad:",
      error
    );

    res.status(500).json({
      error:
        "Error al actualizar la cantidad."
    });
  }
});

/* ==================================================
   ELIMINAR ARTÍCULO
   DELETE /api/carrito/items/:itemId
================================================== */

router.delete("/items/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);

  if (
    !Number.isInteger(itemId) ||
    itemId <= 0
  ) {
    return res.status(400).json({
      error: "El artículo del carrito no es válido."
    });
  }

  try {
    const carritoId = await obtenerOCrearCarrito(req);

    const resultado = await db.query(
      `
        DELETE FROM carrito_items

        WHERE id = $1
          AND carrito_id = $2

        RETURNING id
      `,
      [itemId, carritoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error:
          "El producto no se encontró en tu carrito."
      });
    }

    res.json({
      ok: true,
      mensaje: "Producto eliminado del carrito."
    });
  } catch (error) {
    console.error(
      "Error al eliminar el artículo:",
      error
    );

    res.status(500).json({
      error:
        "Error al eliminar el artículo."
    });
  }
});

module.exports = router;