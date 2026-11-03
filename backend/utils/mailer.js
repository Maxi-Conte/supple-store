const nodemailer = require("nodemailer");

/* ==================================================
   CONFIGURACIÓN DEL CORREO
================================================== */

const esDesarrollo =
  process.env.NODE_ENV === "development";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,

  port:
    Number(process.env.SMTP_PORT) || 587,

  secure:
    String(process.env.SMTP_SECURE)
      .toLowerCase() === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  tls: {
    /*
      LOCALHOST / DESARROLLO:
      permitimos la cadena de certificado que está
      interfiriendo en esta PC.

      PRODUCCIÓN:
      vuelve automáticamente a validar certificados.
    */
    rejectUnauthorized: !esDesarrollo
  }
});

/* ==================================================
   ENVIAR MAIL DE RECUPERACIÓN
================================================== */

async function enviarCorreoRecuperacion({
    destinatario,
    nombre,
    token
}) {

    const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:3000";

    const enlace = new URL(
        "/restablecer-password.html",
        frontendUrl
    );

    enlace.searchParams.set("token", token);

    await transporter.sendMail({

        from:
            process.env.MAIL_FROM ||
            process.env.SMTP_USER,

        to: destinatario,

        subject:
            "Recuperá tu contraseña — KRATOS",

        text: `
Hola ${nombre || ""}.

Recibimos una solicitud para restablecer
la contraseña de tu cuenta de KRATOS.

Ingresá al siguiente enlace:

${enlace.toString()}

El enlace caduca en 30 minutos.

Si no solicitaste este cambio,
podés ignorar este correo.

KRATOS PERFORMANCE
    `.trim(),

        html: `
      <!DOCTYPE html>

      <html lang="es">

        <body
          style="
            margin:0;
            padding:0;
            background:#121316;
            color:#f1f0ec;
            font-family:Arial,sans-serif;
          "
        >

          <div
            style="
              max-width:560px;
              margin:0 auto;
              padding:48px 24px;
            "
          >

            <div
              style="
                background:#1b1d21;
                border:1px solid #2e3238;
                border-radius:12px;
                padding:36px;
              "
            >

              <div
                style="
                  color:#e6ff4d;
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:2px;
                  margin-bottom:12px;
                "
              >
                KRATOS PERFORMANCE
              </div>

              <h1
                style="
                  margin:0 0 16px;
                  font-size:28px;
                  color:#ffffff;
                "
              >
                Recuperá tu cuenta
              </h1>

              <p
                style="
                  color:#a5a9b0;
                  line-height:1.7;
                "
              >
                Hola ${nombre || ""}.
                Recibimos una solicitud para cambiar
                la contraseña de tu cuenta.
              </p>

              <a
                href="${enlace.toString()}"
                style="
                  display:block;
                  margin:30px 0;
                  padding:15px 20px;
                  background:#e6ff4d;
                  color:#121316;
                  text-decoration:none;
                  text-align:center;
                  font-weight:800;
                  border-radius:6px;
                "
              >
                RESTABLECER CONTRASEÑA
              </a>

              <p
                style="
                  color:#7b818c;
                  font-size:13px;
                  line-height:1.6;
                "
              >
                Este enlace caduca en 30 minutos.
              </p>

              <p
                style="
                  color:#7b818c;
                  font-size:13px;
                  line-height:1.6;
                "
              >
                Si no solicitaste este cambio,
                podés ignorar este correo.
              </p>

            </div>

            <p
              style="
                text-align:center;
                color:#60656e;
                font-size:11px;
                margin-top:20px;
              "
            >
              © 2026 KRATOS PERFORMANCE
            </p>

          </div>

        </body>

      </html>
    `
    });
}

/* ==================================================
   CORREOS DE PEDIDOS
================================================== */

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatearPrecioMail(valor) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

function remitente() {
    return process.env.MAIL_FROM || process.env.SMTP_USER;
}

function describirItem(item) {
    const peso = Number(item.peso_gramos);

    const pesoTexto = !peso
        ? ""
        : peso >= 1000
            ? `${Number.isInteger(peso / 1000) ? peso / 1000 : (peso / 1000).toFixed(1)} kg`
            : `${peso} g`;

    return [item.nombre_producto, item.sabor, pesoTexto]
        .filter(Boolean)
        .join(" · ");
}

function describirEntrega(orden) {
    if (orden.metodo_entrega === "retiro") {
        return `Retiro en local: ${process.env.RETIRO_DIRECCION || "te contactamos para coordinar"}`;
    }

    return [
        orden.direccion,
        orden.ciudad,
        orden.provincia,
        orden.codigo_postal ? `CP ${orden.codigo_postal}` : ""
    ].filter(Boolean).join(", ");
}

/*
  Misma estética que el mail de recuperación.
  "contenido" ya debe venir escapado.
*/
function plantillaMail({ titulo, contenido }) {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <body style="margin:0;padding:0;background:#121316;color:#f1f0ec;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
            <div style="background:#1b1d21;border:1px solid #2e3238;border-radius:12px;padding:36px;">
              <div style="color:#e6ff4d;font-size:12px;font-weight:700;letter-spacing:2px;margin-bottom:12px;">
                KRATOS PERFORMANCE
              </div>
              <h1 style="margin:0 0 16px;font-size:26px;color:#ffffff;">
                ${titulo}
              </h1>
              ${contenido}
            </div>
            <p style="text-align:center;color:#60656e;font-size:11px;margin-top:20px;">
              © 2026 KRATOS PERFORMANCE
            </p>
          </div>
        </body>
      </html>
    `;
}

function parrafo(textoHTML) {
    return `<p style="color:#a5a9b0;line-height:1.7;margin:0 0 14px;">${textoHTML}</p>`;
}

function tablaItems(orden) {
    const filas = orden.items.map((item) => `
        <tr>
          <td style="padding:8px 0;color:#f1f0ec;border-bottom:1px solid #2e3238;">
            ${item.cantidad} × ${escaparHTML(describirItem(item))}
          </td>
          <td style="padding:8px 0;color:#f1f0ec;text-align:right;border-bottom:1px solid #2e3238;">
            ${formatearPrecioMail(item.precio_unitario * item.cantidad)}
          </td>
        </tr>
    `).join("");

    return `
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;">
        ${filas}
        ${orden.descuento > 0 ? `
        <tr>
          <td style="padding:8px 0;color:#a5a9b0;">Descuento${orden.cupon_codigo ? ` (${escaparHTML(orden.cupon_codigo)})` : ""}</td>
          <td style="padding:8px 0;color:#a5a9b0;text-align:right;">- ${formatearPrecioMail(orden.descuento)}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 0;color:#a5a9b0;">Envío</td>
          <td style="padding:8px 0;color:#a5a9b0;text-align:right;">
            ${orden.costo_envio > 0 ? formatearPrecioMail(orden.costo_envio) : "Sin cargo"}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#ffffff;font-weight:700;">Total</td>
          <td style="padding:8px 0;color:#e6ff4d;font-weight:700;text-align:right;">
            ${formatearPrecioMail(orden.total)}
          </td>
        </tr>
      </table>
    `;
}

function textoItems(orden) {
    return orden.items
        .map((item) => `- ${item.cantidad} x ${describirItem(item)}: ${formatearPrecioMail(item.precio_unitario * item.cantidad)}`)
        .concat(
            orden.descuento > 0
                ? `Descuento${orden.cupon_codigo ? ` (${orden.cupon_codigo})` : ""}: - ${formatearPrecioMail(orden.descuento)}`
                : [],
            `Envío: ${orden.costo_envio > 0 ? formatearPrecioMail(orden.costo_envio) : "Sin cargo"}`,
            `Total: ${formatearPrecioMail(orden.total)}`
        )
        .join("\n");
}

/* Al cliente, cuando se aprueba el pago */

async function enviarConfirmacionPedido(orden) {
    if (!orden.email_comprador) return;

    await transporter.sendMail({
        from: remitente(),
        to: orden.email_comprador,
        subject: `Recibimos tu pedido #${orden.id} — KRATOS`,

        text: `
Hola ${orden.nombre_comprador || ""}.

¡Gracias por tu compra! Tu pago fue aprobado y ya estamos preparando el pedido #${orden.id}.

${textoItems(orden)}

Entrega: ${describirEntrega(orden)}

Te vamos a avisar por este medio cuando el pedido esté en camino.

KRATOS PERFORMANCE
        `.trim(),

        html: plantillaMail({
            titulo: `¡Gracias por tu compra!`,
            contenido:
                parrafo(`Hola ${escaparHTML(orden.nombre_comprador || "")}. Tu pago fue aprobado y ya estamos preparando el <strong style="color:#ffffff;">pedido #${orden.id}</strong>.`) +
                tablaItems(orden) +
                parrafo(`<strong style="color:#ffffff;">Entrega:</strong> ${escaparHTML(describirEntrega(orden))}`) +
                parrafo(`Te vamos a avisar por este medio cuando el pedido esté en camino.`)
        })
    });
}

/* A la tienda, cuando entra una venta */

async function enviarAvisoNuevaVenta(orden) {
    const destino = process.env.MAIL_TIENDA || process.env.SMTP_USER;

    if (!destino) return;

    const datosCliente = [
        `Nombre: ${orden.nombre_comprador || "-"}`,
        `Email: ${orden.email_comprador || "-"}`,
        `Teléfono: ${orden.telefono || "-"}`,
        `DNI/CUIT: ${orden.dni || "-"}`,
        `Entrega: ${describirEntrega(orden)}`,
        orden.notas ? `Notas: ${orden.notas}` : ""
    ].filter(Boolean);

    await transporter.sendMail({
        from: remitente(),
        to: destino,
        replyTo: orden.email_comprador || undefined,
        subject: `🛒 Nueva venta: pedido #${orden.id} — ${formatearPrecioMail(orden.total)}`,

        text: `
Entró un pedido pagado.

${datosCliente.join("\n")}

${textoItems(orden)}

Gestionalo desde el panel administrativo.
        `.trim(),

        html: plantillaMail({
            titulo: `Nueva venta · pedido #${orden.id}`,
            contenido:
                parrafo(datosCliente.map(escaparHTML).join("<br>")) +
                tablaItems(orden) +
                parrafo(`Gestionalo desde el panel administrativo.`)
        })
    });
}

/* Al cliente, cuando cambia el estado del pedido */

const MENSAJES_ESTADO = {
    enviado: {
        asunto: "Tu pedido está en camino",
        texto: "¡Buenas noticias! Tu pedido ya fue despachado."
    },
    listo_retiro: {
        asunto: "Tu pedido está listo para retirar",
        texto: "Tu pedido ya está listo. Podés pasar a retirarlo."
    },
    entregado: {
        asunto: "Tu pedido fue entregado",
        texto: "Tu pedido figura como entregado. ¡Esperamos que lo disfrutes!"
    },
    cancelado: {
        asunto: "Tu pedido fue cancelado",
        texto: "Tu pedido fue cancelado. Si tenés dudas sobre el reintegro, respondé este correo."
    }
};

async function enviarActualizacionPedido(orden) {
    const mensaje =
        orden.estado === "cancelado" && orden.reintegrado_en
            ? {
                asunto: "Tu pedido fue cancelado y reintegrado",
                texto: "Tu pedido fue cancelado y te devolvimos el pago por Mercado Pago. El dinero puede tardar unos días en verse reflejado según tu medio de pago."
            }
            : MENSAJES_ESTADO[orden.estado];

    if (!mensaje || !orden.email_comprador) return;

    const extras = [];

    if (orden.estado === "enviado" && orden.codigo_seguimiento) {
        extras.push(`Código de seguimiento: ${orden.codigo_seguimiento}`);
    }

    if (orden.estado === "listo_retiro") {
        extras.push(`Lugar de retiro: ${process.env.RETIRO_DIRECCION || "te contactamos para coordinar"}`);
    }

    await transporter.sendMail({
        from: remitente(),
        to: orden.email_comprador,
        subject: `${mensaje.asunto} (#${orden.id}) — KRATOS`,

        text: `
Hola ${orden.nombre_comprador || ""}.

${mensaje.texto}

Pedido #${orden.id}
${extras.join("\n")}

KRATOS PERFORMANCE
        `.trim(),

        html: plantillaMail({
            titulo: escaparHTML(mensaje.asunto),
            contenido:
                parrafo(`Hola ${escaparHTML(orden.nombre_comprador || "")}. ${escaparHTML(mensaje.texto)}`) +
                parrafo(`<strong style="color:#ffffff;">Pedido #${orden.id}</strong>`) +
                (extras.length
                    ? parrafo(extras.map(escaparHTML).join("<br>"))
                    : "")
        })
    });
}

/* Botón de arrepentimiento: constancia al cliente */

async function enviarConstanciaArrepentimiento(solicitud) {
    await transporter.sendMail({
        from: remitente(),
        to: solicitud.email,
        subject: `Recibimos tu solicitud de arrepentimiento (${solicitud.codigo}) — KRATOS`,

        text: `
Hola ${solicitud.nombre}.

Recibimos tu solicitud para revocar la compra del pedido #${solicitud.orden_id}.

Código de trámite: ${solicitud.codigo}

Nos vamos a comunicar con vos para coordinar la devolución del producto y el reintegro.

KRATOS PERFORMANCE
        `.trim(),

        html: plantillaMail({
            titulo: "Recibimos tu solicitud",
            contenido:
                parrafo(`Hola ${escaparHTML(solicitud.nombre)}. Recibimos tu solicitud para revocar la compra del <strong style="color:#ffffff;">pedido #${Number(solicitud.orden_id)}</strong>.`) +
                parrafo(`<strong style="color:#ffffff;">Código de trámite:</strong> <span style="color:#e6ff4d;">${escaparHTML(solicitud.codigo)}</span>`) +
                parrafo("Nos vamos a comunicar con vos para coordinar la devolución del producto y el reintegro.")
        })
    });
}

/* Botón de arrepentimiento: aviso a la tienda */

async function enviarAvisoArrepentimiento(solicitud) {
    const destino = process.env.MAIL_TIENDA || process.env.SMTP_USER;

    if (!destino) return;

    const datos = [
        `Código: ${solicitud.codigo}`,
        `Pedido: #${solicitud.orden_id}`,
        `Nombre: ${solicitud.nombre}`,
        `Email: ${solicitud.email}`,
        `Teléfono: ${solicitud.telefono || "-"}`,
        `Motivo: ${solicitud.motivo || "-"}`
    ];

    await transporter.sendMail({
        from: remitente(),
        to: destino,
        replyTo: solicitud.email,
        subject: `↩️ Arrepentimiento de compra: pedido #${solicitud.orden_id} (${solicitud.codigo})`,
        text: `${datos.join("\n")}\n\nTenés que responder y coordinar la devolución.`,
        html: plantillaMail({
            titulo: "Solicitud de arrepentimiento",
            contenido:
                parrafo(datos.map(escaparHTML).join("<br>")) +
                parrafo("Tenés que responder y coordinar la devolución.")
        })
    });
}

module.exports = {
    enviarCorreoRecuperacion,
    enviarConstanciaArrepentimiento,
    enviarAvisoArrepentimiento,
    enviarConfirmacionPedido,
    enviarAvisoNuevaVenta,
    enviarActualizacionPedido
};