const crypto = require("crypto");
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

const {
  calcularCostoEnvio,
  validarDatosComprador
} = require("../utils/envio");

const {
  obtenerOrdenCompleta,
  descontarStockOrden
} = require("../utils/pedidos");

const {
  enviarConfirmacionPedido,
  enviarAvisoNuevaVenta
} = require("../utils/mailer");

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

/*
  Mercado Pago solo acepta back_urls y notification_url
  con una URL pública. En localhost las dejamos afuera.
*/
function obtenerUrlPublica() {
  const url = String(
    process.env.FRONTEND_URL || ""
  ).trim().replace(/\/+$/, "");

  return url.startsWith("https://")
    ? url
    : null;
}

/* ==================================================
   VALIDAR FIRMA DEL WEBHOOK
   https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

   Si MP_WEBHOOK_SECRET no está cargado (desarrollo),
   se omite la validación.
================================================== */

let avisoFirmaMostrado = false;

function firmaWebhookValida(req, dataId) {
  const secreto =
    process.env.MP_WEBHOOK_SECRET?.trim();

  if (!secreto) {
    if (!avisoFirmaMostrado) {
      console.warn(
        "⚠️ Falta MP_WEBHOOK_SECRET: el webhook no valida la firma de Mercado Pago."
      );

      avisoFirmaMostrado = true;
    }

    return true;
  }

  const cabecera = String(
    req.headers["x-signature"] || ""
  );

  const requestId = String(
    req.headers["x-request-id"] || ""
  );

  const partes = Object.fromEntries(
    cabecera
      .split(",")
      .map((parte) =>
        parte.split("=").map((valor) => valor.trim())
      )
  );

  if (!partes.ts || !partes.v1) {
    return false;
  }

  /* Los ids alfanuméricos se firman en minúscula */
  const manifiesto =
    `id:${String(dataId).toLowerCase()};` +
    `request-id:${requestId};` +
    `ts:${partes.ts};`;

  const esperado = crypto
    .createHmac("sha256", secreto)
    .update(manifiesto)
    .digest("hex");

  const recibido = Buffer.from(partes.v1);
  const calculado = Buffer.from(esperado);

  return (
    recibido.length === calculado.length &&
    crypto.timingSafeEqual(recibido, calculado)
  );
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
      /* ==========================================
         VALIDAR DATOS DEL COMPRADOR Y ENTREGA
      ========================================== */

      const validacion =
        validarDatosComprador(req.body);

      if (validacion.error) {
        return res.status(400).json({
          error: validacion.error
        });
      }

      const comprador = validacion.datos;

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

      const subtotal = items.reduce(
        (acumulador, item) =>
          acumulador +
          item.precio * item.cantidad,
        0
      );

      const costoEnvio = calcularCostoEnvio(
        comprador.metodo_entrega,
        subtotal
      );

      const total = subtotal + costoEnvio;

      /* ==========================================
         CREAR LA ORDEN
      ========================================== */

      const ordenResult = await db.query(
        `
          INSERT INTO ordenes (
            usuario_id,
            carrito_id,
            email_comprador,
            nombre_comprador,
            telefono,
            dni,
            metodo_entrega,
            direccion,
            ciudad,
            provincia,
            codigo_postal,
            notas,
            subtotal,
            costo_envio,
            total,
            estado
          )

          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            'pendiente'
          )

          RETURNING id
        `,
        [
          req.esInvitado
            ? null
            : req.usuarioId,

          carritoId,
          comprador.email,
          comprador.nombre,
          comprador.telefono,
          comprador.dni,
          comprador.metodo_entrega,
          comprador.direccion || null,
          comprador.ciudad || null,
          comprador.provincia || null,
          comprador.codigo_postal || null,
          comprador.notas || null,
          subtotal,
          costoEnvio,
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

      const itemsMercadoPago = items.map((item) => ({
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
      }));

      if (costoEnvio > 0) {
        itemsMercadoPago.push({
          id: "envio",
          title: "Envío a domicilio",
          quantity: 1,
          unit_price: costoEnvio,
          currency_id: "ARS"
        });
      }

      /*
        back_urls, auto_return y notification_url
        solo se activan cuando FRONTEND_URL es una
        URL pública con HTTPS.
      */

      const urlPublica = obtenerUrlPublica();

      const urlsRetorno = urlPublica
        ? {
            back_urls: {
              success: `${urlPublica}/pago-exitoso.html?orden=${ordenId}`,
              failure: `${urlPublica}/pago-fallido.html?orden=${ordenId}`,
              pending: `${urlPublica}/pago-pendiente.html?orden=${ordenId}`
            },

            auto_return: "approved",

            notification_url:
              `${urlPublica}/api/pagos/webhook`
          }
        : {};

      const resultado =
        await preference.create({
          body: {
            items: itemsMercadoPago,

            payer: {
              name: comprador.nombre,
              email: comprador.email
            },

            external_reference:
              String(ordenId),

            ...urlsRetorno,

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
      Mercado Pago manda el id también en la URL
      (?data.id=...) y es el que usa para firmar.
    */

    const pagoId =
      req.query["data.id"] || data?.id;

    /*
      Mercado Pago puede enviar otros tipos
      de notificaciones. Solo procesamos pagos.
    */

    if (
      type !== "payment" ||
      !pagoId
    ) {
      return res.sendStatus(200);
    }

    if (!firmaWebhookValida(req, pagoId)) {
      console.error(
        "Webhook rechazado: firma de Mercado Pago inválida."
      );

      return res.sendStatus(401);
    }

    const payment = new Payment(mpClient);

    const info = await payment.get({
      id: pagoId
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
      const cliente = await db.connect();

      let ordenPagada = false;

      try {
        await cliente.query("BEGIN");

        /*
          Solo actualizamos si la orden todavía no
          tenía el pago registrado.

          Esto evita descontar stock dos veces cuando
          Mercado Pago repite una notificación.
        */

        const ordenActualizada = await cliente.query(
          `
            UPDATE ordenes

            SET
              estado = 'pagado',
              mp_payment_id = $1,
              actualizado_en = CURRENT_TIMESTAMP

            WHERE id = $2
              AND estado IN ('pendiente', 'rechazado')

            RETURNING carrito_id
          `,
          [
            String(info.id),
            ordenId
          ]
        );

        if (ordenActualizada.rows.length > 0) {
          await descontarStockOrden(
            ordenId,
            cliente
          );

          /* La compra ya está hecha: vaciamos el carrito */

          const carritoId =
            ordenActualizada.rows[0].carrito_id;

          if (carritoId) {
            await cliente.query(
              `
                DELETE FROM carrito_items
                WHERE carrito_id = $1
              `,
              [carritoId]
            );
          }

          ordenPagada = true;
        }

        await cliente.query("COMMIT");
      } catch (error) {
        await cliente.query("ROLLBACK");
        throw error;
      } finally {
        cliente.release();
      }

      if (ordenPagada) {
        /*
          Los mails se mandan sin frenar la respuesta
          a Mercado Pago. Si fallan, queda en el log.
        */

        obtenerOrdenCompleta(ordenId)
          .then((orden) =>
            Promise.allSettled([
              enviarConfirmacionPedido(orden),
              enviarAvisoNuevaVenta(orden)
            ])
          )
          .then((resultados) => {
            resultados
              .filter((r) => r.status === "rejected")
              .forEach((r) =>
                console.error(
                  `No se pudo enviar un mail del pedido #${ordenId}:`,
                  r.reason?.message || r.reason
                )
              );
          })
          .catch((error) =>
            console.error(
              `Error preparando los mails del pedido #${ordenId}:`,
              error
            )
          );
      }

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
          mp_payment_id = $2,
          actualizado_en = CURRENT_TIMESTAMP

        WHERE id = $3
          AND estado IN ('pendiente', 'rechazado')
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