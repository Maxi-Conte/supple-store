const crypto = require("crypto");
const express = require("express");
const db = require("../db/database");

const {
  enviarConstanciaArrepentimiento,
  enviarAvisoArrepentimiento
} = require("../utils/mailer");

const router = express.Router();

/*
  Código de trámite que exige la Res. 424/2020:
  ARR-XXXXXX (sin caracteres que se confundan)
*/
function generarCodigoTramite() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);

  let codigo = "ARR-";

  for (const byte of bytes) {
    codigo += letras[byte % letras.length];
  }

  return codigo;
}

/* ==================================================
   BOTÓN DE ARREPENTIMIENTO
   POST /api/arrepentimiento
================================================== */

router.post("/", async (req, res) => {
  const nombre = String(req.body.nombre || "").trim().slice(0, 150);
  const email = String(req.body.email || "").trim().slice(0, 255);
  const telefono = String(req.body.telefono || "").trim().slice(0, 40);
  const motivo = String(req.body.motivo || "").trim().slice(0, 1000);

  const ordenTexto = String(req.body.orden_id || "")
    .replace(/\D/g, "");

  const ordenId = ordenTexto
    ? Number(ordenTexto)
    : null;

  if (nombre.length < 3) {
    return res.status(400).json({
      error: "Ingresá tu nombre y apellido."
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: "Ingresá un correo electrónico válido."
    });
  }

  if (!ordenId) {
    return res.status(400).json({
      error: "Ingresá el número de pedido que figura en el email de confirmación."
    });
  }

  try {
    let solicitud = null;

    /* Reintentamos si por casualidad el código ya existe */
    for (let intento = 0; intento < 3 && !solicitud; intento++) {
      try {
        const resultado = await db.query(
          `
            INSERT INTO solicitudes_arrepentimiento (
              codigo,
              nombre,
              email,
              telefono,
              orden_id,
              motivo
            )

            VALUES ($1, $2, $3, $4, $5, $6)

            RETURNING *
          `,
          [
            generarCodigoTramite(),
            nombre,
            email,
            telefono || null,
            ordenId,
            motivo || null
          ]
        );

        solicitud = resultado.rows[0];
      } catch (error) {
        if (error.code !== "23505") throw error;
      }
    }

    /*
      Los mails no frenan la respuesta: el código
      se muestra en pantalla igual.
    */
    Promise.allSettled([
      enviarConstanciaArrepentimiento(solicitud),
      enviarAvisoArrepentimiento(solicitud)
    ]).then((resultados) => {
      resultados
        .filter((r) => r.status === "rejected")
        .forEach((r) =>
          console.error(
            `No se pudo enviar un mail del trámite ${solicitud.codigo}:`,
            r.reason?.message || r.reason
          )
        );
    });

    res.status(201).json({
      codigo: solicitud.codigo,
      mensaje:
        `Recibimos tu solicitud. Tu código de trámite es ${solicitud.codigo}. ` +
        "Te enviamos una copia por email y nos vamos a comunicar con vos para coordinar la devolución."
    });
  } catch (error) {
    console.error(
      "Error al registrar la solicitud de arrepentimiento:",
      error
    );

    res.status(500).json({
      error: "No pudimos registrar la solicitud. Escribinos por email o WhatsApp."
    });
  }
});

module.exports = router;
