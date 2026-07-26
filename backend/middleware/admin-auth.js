const crypto = require("crypto");

const ADMIN_COOKIE_NAME = "admin_token";

/* =========================================
   OBTENER CLAVE SECRETA
========================================= */

function obtenerSecretoAdmin() {
    const secreto =
        process.env.ADMIN_SESSION_SECRET;

    if (!secreto) {
        throw new Error(
            "Falta ADMIN_SESSION_SECRET en el archivo .env"
        );
    }

    return secreto;
}

/* =========================================
   CREAR TOKEN ADMIN
========================================= */

function crearTokenAdmin() {
    const expiracion =
        Date.now() + 1000 * 60 * 60 * 8;

    const contenido =
        `admin:${expiracion}`;

    const firma = crypto
        .createHmac(
            "sha256",
            obtenerSecretoAdmin()
        )
        .update(contenido)
        .digest("hex");

    return `${contenido}:${firma}`;
}

/* =========================================
   VALIDAR TOKEN ADMIN
========================================= */

function tokenAdminValido(token) {
    if (!token) {
        return false;
    }

    const partes =
        String(token).split(":");

    if (partes.length !== 3) {
        return false;
    }

    const [
        tipo,
        expiracion,
        firmaRecibida
    ] = partes;

    if (tipo !== "admin") {
        return false;
    }

    const expiracionNumerica =
        Number(expiracion);

    if (
        !Number.isFinite(expiracionNumerica) ||
        Date.now() > expiracionNumerica
    ) {
        return false;
    }

    const contenido =
        `${tipo}:${expiracion}`;

    const firmaEsperada = crypto
        .createHmac(
            "sha256",
            obtenerSecretoAdmin()
        )
        .update(contenido)
        .digest("hex");

    const bufferRecibido =
        Buffer.from(firmaRecibida, "utf8");

    const bufferEsperado =
        Buffer.from(firmaEsperada, "utf8");

    if (
        bufferRecibido.length !==
        bufferEsperado.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        bufferRecibido,
        bufferEsperado
    );
}

/* =========================================
   PROTEGER RUTAS ADMIN
========================================= */

function verificarAdmin(req, res, next) {
    const token =
        req.cookies?.[ADMIN_COOKIE_NAME];

    if (!tokenAdminValido(token)) {
        return res.status(401).json({
            ok: false,
            error:
                "No tenés autorización para acceder al panel administrativo."
        });
    }

    next();
}

module.exports = {
    ADMIN_COOKIE_NAME,
    crearTokenAdmin,
    tokenAdminValido,
    verificarAdmin
};