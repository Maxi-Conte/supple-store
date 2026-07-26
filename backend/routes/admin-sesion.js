const express = require("express");

const {
    ADMIN_COOKIE_NAME,
    crearTokenAdmin,
    tokenAdminValido
} = require("../middleware/admin-auth");

const router = express.Router();

/* =========================================
   LOGIN ADMIN
   POST /api/admin-sesion/login
========================================= */

router.post("/login", (req, res) => {

    const usuario = String(
        req.body.usuario || ""
    ).trim();

    const password = String(
        req.body.password || ""
    );

    if (!usuario || !password) {
        return res.status(400).json({
            ok: false,
            mensaje:
                "Usuario y contraseña son obligatorios."
        });
    }

    const usuarioCorrecto =
        usuario === process.env.ADMIN_USER;

    const passwordCorrecto =
        password === process.env.ADMIN_PASSWORD;

    if (
        !usuarioCorrecto ||
        !passwordCorrecto
    ) {
        return res.status(401).json({
            ok: false,
            mensaje:
                "Usuario o contraseña incorrectos."
        });
    }

    const token = crearTokenAdmin();

    res.cookie(
        ADMIN_COOKIE_NAME,
        token,
        {
            httpOnly: true,
            sameSite: "lax",

            secure:
                process.env.NODE_ENV ===
                "production",

            maxAge:
                1000 * 60 * 60 * 8,

            path: "/"
        }
    );

    return res.json({
        ok: true,
        mensaje: "Login correcto."
    });
});

/* =========================================
   VER SESIÓN ACTUAL
   GET /api/admin-sesion/sesion
========================================= */

router.get("/sesion", (req, res) => {

    const token =
        req.cookies?.[ADMIN_COOKIE_NAME];

    const logueado =
        tokenAdminValido(token);

    if (!logueado && token) {
        res.clearCookie(
            ADMIN_COOKIE_NAME,
            {
                httpOnly: true,
                sameSite: "lax",

                secure:
                    process.env.NODE_ENV ===
                    "production",

                path: "/"
            }
        );
    }

    return res.json({
        logueado
    });
});

/* =========================================
   LOGOUT ADMIN
   POST /api/admin-sesion/logout
========================================= */

router.post("/logout", (req, res) => {

    res.clearCookie(
        ADMIN_COOKIE_NAME,
        {
            httpOnly: true,
            sameSite: "lax",

            secure:
                process.env.NODE_ENV ===
                "production",

            path: "/"
        }
    );

    return res.json({
        ok: true
    });
});

module.exports = router;