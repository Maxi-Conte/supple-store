const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const db = require("../db/database");

const {
  generarToken
} = require("../middleware/auth");

const {
  enviarCorreoRecuperacion
} = require("../utils/mailer");


const router = express.Router();


/* ==================================================
   REGISTRO
   POST /api/auth/registro
================================================== */

router.post("/registro", async (req, res) => {

  const {
    nombre,
    email,
    password
  } = req.body;


  if (
    !nombre ||
    !email ||
    !password
  ) {

    return res.status(400).json({
      error:
        "Nombre, email y contraseña son obligatorios."
    });

  }


  if (password.length < 6) {

    return res.status(400).json({
      error:
        "La contraseña debe tener al menos 6 caracteres."
    });

  }


  const nombreLimpio =
    String(nombre).trim();


  const emailLimpio =
    String(email)
      .trim()
      .toLowerCase();


  try {

    const existente =
      await db.query(
        `
          SELECT id

          FROM usuarios

          WHERE email = $1
        `,
        [emailLimpio]
      );


    if (existente.rows.length > 0) {

      return res.status(409).json({
        error:
          "Ya existe una cuenta con ese email."
      });

    }


    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );


    const resultado =
      await db.query(
        `
          INSERT INTO usuarios (
            nombre,
            email,
            password_hash
          )

          VALUES (
            $1,
            $2,
            $3
          )

          RETURNING
            id,
            nombre,
            email
        `,
        [
          nombreLimpio,
          emailLimpio,
          passwordHash
        ]
      );


    const usuario =
      resultado.rows[0];


    const token =
      generarToken(usuario.id);


    return res.status(201).json({
      usuario,
      token
    });

  } catch (error) {

    console.error(
      "Error al crear la cuenta:",
      error
    );


    return res.status(500).json({
      error:
        "Error al crear la cuenta."
    });

  }

});


/* ==================================================
   LOGIN
   POST /api/auth/login
================================================== */

router.post("/login", async (req, res) => {

  const {
    email,
    password
  } = req.body;


  if (
    !email ||
    !password
  ) {

    return res.status(400).json({
      error:
        "Email y contraseña son obligatorios."
    });

  }


  const emailLimpio =
    String(email)
      .trim()
      .toLowerCase();


  try {

    const resultado =
      await db.query(
        `
          SELECT
            id,
            nombre,
            email,
            password_hash

          FROM usuarios

          WHERE email = $1
        `,
        [emailLimpio]
      );


    const usuario =
      resultado.rows[0];


    if (!usuario) {

      return res.status(401).json({
        error:
          "Email o contraseña incorrectos."
      });

    }


    const passwordOk =
      await bcrypt.compare(
        password,
        usuario.password_hash
      );


    if (!passwordOk) {

      return res.status(401).json({
        error:
          "Email o contraseña incorrectos."
      });

    }


    const token =
      generarToken(usuario.id);


    return res.json({

      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      },

      token
    });

  } catch (error) {

    console.error(
      "Error al iniciar sesión:",
      error
    );


    return res.status(500).json({
      error:
        "Error al iniciar sesión."
    });

  }

});


/* ==================================================
   SOLICITAR RECUPERACIÓN
   POST /api/auth/solicitar-recuperacion
================================================== */

router.post(
  "/solicitar-recuperacion",
  async (req, res) => {

    const email =
      String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();


    if (!email) {

      return res.status(400).json({
        error:
          "Ingresá un correo electrónico."
      });

    }


    /*
      Usamos siempre el mismo mensaje exista
      o no una cuenta con ese correo.
    */

    const respuestaGenerica = {

      mensaje:
        "Si existe una cuenta asociada a ese correo, vas a recibir un enlace para recuperar tu contraseña."

    };


    try {

      /* ----------------------------------------------
         BUSCAR USUARIO
      ---------------------------------------------- */

      const resultadoUsuario =
        await db.query(
          `
            SELECT
              id,
              nombre,
              email

            FROM usuarios

            WHERE email = $1
          `,
          [email]
        );


      const usuario =
        resultadoUsuario.rows[0];


      /*
        No revelamos al frontend
        si el email existe o no.
      */

      if (!usuario) {

        return res.json(
          respuestaGenerica
        );

      }


      /* ----------------------------------------------
         EVITAR MUCHAS SOLICITUDES SEGUIDAS
      ---------------------------------------------- */

      const solicitudReciente =
        await db.query(
          `
            SELECT id

            FROM password_reset_tokens

            WHERE usuario_id = $1

              AND creado_en >
                NOW() - INTERVAL '60 seconds'

              AND usado_en IS NULL

            LIMIT 1
          `,
          [usuario.id]
        );


      if (
        solicitudReciente.rows.length > 0
      ) {

        return res.json(
          respuestaGenerica
        );

      }


      /* ----------------------------------------------
         LIMPIAR TOKENS ANTERIORES
      ---------------------------------------------- */

      await db.query(
        `
          DELETE FROM password_reset_tokens

          WHERE usuario_id = $1
             OR expira_en < NOW()
        `,
        [usuario.id]
      );


      /* ----------------------------------------------
         GENERAR TOKEN REAL
      ---------------------------------------------- */

      const token =
        crypto
          .randomBytes(32)
          .toString("hex");


      /*
        Este hash es lo único
        que guardamos en PostgreSQL.
      */

      const tokenHash =
        crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");


      /* ----------------------------------------------
         GUARDAR TOKEN
      ---------------------------------------------- */

      await db.query(
        `
          INSERT INTO password_reset_tokens (
            usuario_id,
            token_hash,
            expira_en
          )

          VALUES (
            $1,
            $2,
            NOW() + INTERVAL '30 minutes'
          )
        `,
        [
          usuario.id,
          tokenHash
        ]
      );


      /* ----------------------------------------------
         ENVIAR CORREO
      ---------------------------------------------- */

      try {

        await enviarCorreoRecuperacion({

          destinatario:
            usuario.email,

          nombre:
            usuario.nombre,

          token

        });

      } catch (errorCorreo) {

        console.error(
          "Error enviando correo de recuperación:",
          errorCorreo
        );


        /*
          Eliminamos el token si el correo
          nunca pudo ser enviado.
        */

        await db.query(
          `
            DELETE FROM password_reset_tokens

            WHERE token_hash = $1
          `,
          [tokenHash]
        );


        /*
          Mantenemos una respuesta genérica
          hacia el navegador.
        */

        return res.json(
          respuestaGenerica
        );

      }


      return res.json(
        respuestaGenerica
      );

    } catch (error) {

      console.error(
        "Error solicitando recuperación:",
        error
      );


      return res.status(500).json({
        error:
          "No se pudo procesar la recuperación de contraseña."
      });

    }

  }
);


/* ==================================================
   RESTABLECER CONTRASEÑA
   POST /api/auth/restablecer-password
================================================== */

router.post(
  "/restablecer-password",
  async (req, res) => {

    const token =
      String(
        req.body.token || ""
      ).trim();


    const password =
      String(
        req.body.password || ""
      );


    if (
      !token ||
      !password
    ) {

      return res.status(400).json({
        error:
          "El token y la nueva contraseña son obligatorios."
      });

    }


    if (password.length < 6) {

      return res.status(400).json({
        error:
          "La contraseña debe tener al menos 6 caracteres."
      });

    }


    try {

      /* ----------------------------------------------
         CONVERTIR TOKEN REAL A HASH
      ---------------------------------------------- */

      const tokenHash =
        crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");


      /* ----------------------------------------------
         GENERAR NUEVO PASSWORD HASH
      ---------------------------------------------- */

      const nuevoPasswordHash =
        await bcrypt.hash(
          password,
          10
        );


      /*
        Esta consulta:

        1. Comprueba el token.
        2. Comprueba que no haya sido usado.
        3. Comprueba que no esté vencido.
        4. Lo marca como usado.
        5. Actualiza la contraseña.

        Se hace en una sola operación SQL.
      */

      const resultado =
        await db.query(
          `
            WITH token_valido AS (

              UPDATE password_reset_tokens

              SET usado_en = NOW()

              WHERE token_hash = $1
                AND usado_en IS NULL
                AND expira_en > NOW()

              RETURNING
                usuario_id

            )

            UPDATE usuarios AS u

            SET password_hash = $2

            FROM token_valido AS t

            WHERE u.id = t.usuario_id

            RETURNING
              u.id
          `,
          [
            tokenHash,
            nuevoPasswordHash
          ]
        );


      /* ----------------------------------------------
         TOKEN INVÁLIDO / VENCIDO / USADO
      ---------------------------------------------- */

      if (
        resultado.rows.length === 0
      ) {

        return res.status(400).json({
          error:
            "El enlace no es válido, ya fue utilizado o venció."
        });

      }


      const usuarioId =
        resultado.rows[0].id;


      /* ----------------------------------------------
         ELIMINAR OTROS TOKENS
      ---------------------------------------------- */

      await db.query(
        `
          DELETE FROM password_reset_tokens

          WHERE usuario_id = $1
        `,
        [usuarioId]
      );


      return res.json({

        mensaje:
          "Tu contraseña fue actualizada correctamente."

      });

    } catch (error) {

      console.error(
        "Error restableciendo contraseña:",
        error
      );


      return res.status(500).json({
        error:
          "No se pudo actualizar la contraseña."
      });

    }

  }
);


module.exports = router;