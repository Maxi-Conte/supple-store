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

module.exports = {
    enviarCorreoRecuperacion
};