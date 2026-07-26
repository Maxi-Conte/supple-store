const express = require("express");

const {
  MercadoPagoConfig,
  Preference,
  Payment
} = require("mercadopago");

const db = require("../db/database");

const {
  identificarVisitante
} = require("../middleware/auth");

const router = express.Router();

/* ==================================================
   CONFIGURACIÓN DE MERCADO PAGO
================================================== */

const accessToken =
  process.env.MP_ACCESS_TOKEN?.trim();

if (!accessToken) {
  throw new Error(
    "Falta MP_ACCESS_TOKEN en el archivo .env"
  );
}

const mpClient = new MercadoPagoConfig({
  accessToken
});

/* ==================================================
   FUNCIONES AUXILIARES
================================================== */

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatearPeso(pesoGramos) {
  const peso = Number(pesoGramos);

  if (!peso) return null;

  if (peso >= 1000) {
    const kilos = peso / 1000;

    return Number.isInteger(kilos)
      ? `${kilos} kg`
      : `${kilos.toFixed(1)} kg`;
  }

  return `${peso} g`;
}

function crearTituloMercadoPago(item) {
  const datos = [
    item.nombre,
    item.sabor,
    formatearPeso(item.peso_gramos)
  ].filter(Boolean);

  return datos.join(" - ");
}

/* ==================================================
   CREAR PREFERENCIA
   POST /api/pagos/crear-preferencia
================================================== */

router.post(
  "/crear-preferencia",
  identificarVisitante,
  async (req, res) => {
    let ordenId = null;
    let preferenciaCreada = false;

    try {
      const emailComprador = String(
        req.body.email_comprador || ""
      ).trim();

      if (
        emailComprador &&
        !emailValido(emailComprador)
      ) {
        return res.status(400).json({
          error:
            "Ingresá un correo electrónico válido."
        });
      }

      /* ==========================================
         BUSCAR EL CARRITO DEL VISITANTE
      ========================================== */

      const filtro = req.esInvitado
        ? {
            columna: "session_token",
            valor: req.guestToken
          }
        : {
            columna: "usuario_id",
            valor: req.usuarioId
          };

      const carritoResult = await db.query(
        `
          SELECT id
          FROM carritos
          WHERE ${filtro.columna} = $1
        `,
        [filtro.valor]
      );

      if (carritoResult.rows.length === 0) {
        return res.status(400).json({
          error: "El carrito está vacío."
        });
      }

      const carritoId =
        carritoResult.rows[0].id;

      /* ==========================================
         OBTENER ITEMS Y VARIANTES
      ========================================== */

      const itemsResult = await db.query(
        `
          SELECT
            p.id AS producto_id,
            p.nombre,

            pv.id AS variante_id,
            pv.sabor,
            pv.peso_gramos,
            pv.precio,
            pv.stock,
            pv.activo AS variante_activa,

            ci.cantidad

          FROM carrito_items ci

          JOIN productos p
            ON p.id = ci.producto_id

          JOIN producto_variantes pv
            ON pv.id = ci.variante_id

          WHERE ci.carrito_id = $1
            AND p.activo = TRUE

          ORDER BY ci.id ASC
        `,
        [carritoId]
      );

      if (itemsResult.rows.length === 0) {
        return res.status(400).json({
          error: "El carrito está vacío."
        });
      }

      const items = itemsResult.rows.map(
        (item) => ({
          ...item,

          producto_id:
            Number(item.producto_id),

          variante_id:
            Number(item.variante_id),

          peso_gramos:
            item.peso_gramos !== null
              ? Number(item.peso_gramos)
              : null,

          precio:
            Number(item.precio) || 0,

          stock:
            Number(item.stock) || 0,

          cantidad:
            Number(item.cantidad) || 0
        })
      );

      /* ==========================================
         VALIDAR PRECIO, STOCK Y DISPONIBILIDAD
      ========================================== */

      for (const item of items) {
        if (item.variante_activa !== true) {
          return res.status(409).json({
            error:
              `La variante de ${item.nombre} ya no está disponible.`
          });
        }

        if (item.precio <= 0) {
          return res.status(409).json({
            error:
              `${item.nombre} todavía no tiene un precio válido.`
          });
        }

        if (item.cantidad > item.stock) {
          return res.status(409).json({
            error:
              `No hay stock suficiente de ${crearTituloMercadoPago(
                item
              )}. Stock disponible: ${item.stock}.`
          });
        }
      }

      /* ==========================================
         CALCULAR TOTAL REAL
      ========================================== */

      const total = items.reduce(
        (acumulador, item) =>
          acumulador +
          item.precio * item.cantidad,
        0
      );

      /* ==========================================
         CREAR LA ORDEN
      ========================================== */

      const ordenResult = await db.query(
        `
          INSERT INTO ordenes (
            usuario_id,
            email_comprador,
            total,
            estado
          )

          VALUES ($1, $2, $3, 'pendiente')

          RETURNING id
        `,
        [
          req.esInvitado
            ? null
            : req.usuarioId,

          emailComprador || null,

          total
        ]
      );

      ordenId = ordenResult.rows[0].id;

      /* ==========================================
         GUARDAR ITEMS DE LA ORDEN
      ========================================== */

      for (const item of items) {
        await db.query(
          `
            INSERT INTO orden_items (
              orden_id,
              producto_id,
              variante_id,
              nombre_producto,
              sabor,
              peso_gramos,
              precio_unitario,
              cantidad
            )

            VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8
            )
          `,
          [
            ordenId,
            item.producto_id,
            item.variante_id,
            item.nombre,
            item.sabor || null,
            item.peso_gramos,
            item.precio,
            item.cantidad
          ]
        );
      }

      /* ==========================================
         CREAR PREFERENCIA DE MERCADO PAGO
      ========================================== */

      const preference =
        new Preference(mpClient);

      const resultado =
        await preference.create({
          body: {
            items: items.map((item) => ({
              /*
                Usamos variante_id para identificar
                exactamente lo que se está comprando.
              */

              id: String(item.variante_id),

              title:
                crearTituloMercadoPago(item),

              quantity: item.cantidad,

              unit_price: item.precio,

              currency_id: "ARS"
            })),

            payer: emailComprador
              ? {
                  email: emailComprador
                }
              : undefined,

            external_reference:
              String(ordenId),

            /*
              En localhost dejamos desactivados:

              back_urls
              auto_return
              notification_url

              Los activaremos cuando Kratos tenga
              una URL pública con HTTPS.
            */

            payment_methods: {
              installments: 12
            }
          }
        });

      preferenciaCreada = true;

      /* ==========================================
         GUARDAR ID DE LA PREFERENCIA
      ========================================== */

      await db.query(
        `
          UPDATE ordenes

          SET mp_preference_id = $1

          WHERE id = $2
        `,
        [
          resultado.id,
          ordenId
        ]
      );

      res.json({
        orden_id: ordenId,

        init_point:
          resultado.init_point,

        sandbox_init_point:
          resultado.sandbox_init_point
      });
    } catch (error) {
      /*
        Si la preferencia todavía no llegó a crearse,
        eliminamos la orden incompleta.

        orden_items se elimina automáticamente por
        ON DELETE CASCADE.
      */

      if (
        ordenId &&
        !preferenciaCreada
      ) {
        try {
          await db.query(
            `
              DELETE FROM ordenes
              WHERE id = $1
            `,
            [ordenId]
          );
        } catch (errorLimpieza) {
          console.error(
            "No se pudo eliminar la orden incompleta:",
            errorLimpieza
          );
        }
      }

      console.error(
        "Error al crear la preferencia:"
      );

      console.error(error);

      res.status(500).json({
        error:
          "Error al crear la preferencia de pago."
      });
    }
  }
);

/* ==================================================
   WEBHOOK DE MERCADO PAGO
   POST /api/pagos/webhook
================================================== */

router.post("/webhook", async (req, res) => {
  try {
    const {
      type,
      data
    } = req.body || {};

    /*
      Mercado Pago puede enviar otros tipos
      de notificaciones. Solo procesamos pagos.
    */

    if (
      type !== "payment" ||
      !data?.id
    ) {
      return res.sendStatus(200);
    }

    const payment = new Payment(mpClient);

    const info = await payment.get({
      id: data.id
    });

    const ordenId = Number(
      info.external_reference
    );

    if (
      !Number.isInteger(ordenId) ||
      ordenId <= 0
    ) {
      console.error(
        "Webhook sin una orden válida:",
        info.external_reference
      );

      return res.sendStatus(200);
    }

    const estado =
      info.status === "approved"
        ? "pagado"
        : info.status === "rejected"
          ? "rechazado"
          : "pendiente";

    /* ==========================================
       PAGO APROBADO
    ========================================== */

    if (estado === "pagado") {
      /*
        Solo actualizamos si la orden todavía no estaba
        marcada como pagada.

        Esto evita descontar stock dos veces cuando
        Mercado Pago repite una notificación.
      */

      const ordenActualizada = await db.query(
        `
          UPDATE ordenes

          SET
            estado = 'pagado',
            mp_payment_id = $1

          WHERE id = $2
            AND estado <> 'pagado'

          RETURNING id
        `,
        [
          String(info.id),
          ordenId
        ]
      );

      if (
        ordenActualizada.rows.length === 0
      ) {
        return res.sendStatus(200);
      }

      const itemsResult = await db.query(
        `
          SELECT
            producto_id,
            variante_id,
            cantidad

          FROM orden_items

          WHERE orden_id = $1
            AND variante_id IS NOT NULL
        `,
        [ordenId]
      );

      for (const item of itemsResult.rows) {
        const resultadoStock =
          await db.query(
            `
              UPDATE producto_variantes

              SET stock = stock - $1

              WHERE id = $2
                AND stock >= $1

              RETURNING id, stock
            `,
            [
              Number(item.cantidad),
              Number(item.variante_id)
            ]
          );

        if (
          resultadoStock.rows.length === 0
        ) {
          console.error(
            "No se pudo descontar el stock de la variante:",
            {
              orden_id: ordenId,
              variante_id:
                item.variante_id,
              cantidad:
                item.cantidad
            }
          );
        }
      }

      /*
        Sincronizamos la columna antigua productos.stock
        para que el panel administrador todavía muestre
        un total coherente.
      */

      await db.query(
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

      return res.sendStatus(200);
    }

    /* ==========================================
       PAGO PENDIENTE O RECHAZADO
    ========================================== */

    await db.query(
      `
        UPDATE ordenes

        SET
          estado = $1,
          mp_payment_id = $2

        WHERE id = $3
          AND estado <> 'pagado'
      `,
      [
        estado,
        String(info.id),
        ordenId
      ]
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(
      "Error en webhook de Mercado Pago:",
      error
    );

    /*
      Respondemos 200 para evitar reintentos
      infinitos durante un error interno.
    */

    res.sendStatus(200);
  }
});

/* ==================================================
   CONSULTAR ORDEN
   GET /api/pagos/orden/:id
================================================== */

router.get("/orden/:id", async (req, res) => {
  const ordenId = Number(req.params.id);

  if (
    !Number.isInteger(ordenId) ||
    ordenId <= 0
  ) {
    return res.status(400).json({
      error: "El número de orden no es válido."
    });
  }

  try {
    const resultado = await db.query(
      `
        SELECT
          id,
          total,
          estado,
          creado_en

        FROM ordenes

        WHERE id = $1
      `,
      [ordenId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: "Orden no encontrada."
      });
    }

    const orden = resultado.rows[0];

    res.json({
      ...orden,
      total: Number(orden.total)
    });
  } catch (error) {
    console.error(
      "Error al consultar la orden:",
      error
    );

    res.status(500).json({
      error: "Error al consultar la orden."
    });
  }
});

module.exports = router;