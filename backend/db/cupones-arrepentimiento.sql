/* =========================================================
   KRATOS — CUPONES, REINTEGROS Y BOTÓN DE ARREPENTIMIENTO
   Se puede ejecutar varias veces sin romper nada.
========================================================= */

CREATE TABLE IF NOT EXISTS cupones (
    id SERIAL PRIMARY KEY,

    codigo VARCHAR(40) NOT NULL UNIQUE,

    /* porcentaje: valor = 10 → 10 % / monto: valor = 5000 → $5.000 */
    tipo VARCHAR(20) NOT NULL,
    valor NUMERIC(12,2) NOT NULL,

    minimo_compra NUMERIC(12,2) NOT NULL DEFAULT 0,

    /* NULL = sin límite */
    usos_maximos INTEGER,
    usos INTEGER NOT NULL DEFAULT 0,

    vence_en DATE,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT cupones_tipo_check CHECK (tipo IN ('porcentaje', 'monto')),
    CONSTRAINT cupones_valor_check CHECK (valor > 0),
    CONSTRAINT cupones_porcentaje_check CHECK (tipo <> 'porcentaje' OR valor <= 100),
    CONSTRAINT cupones_usos_check CHECK (usos >= 0)
);


ALTER TABLE ordenes
    ADD COLUMN IF NOT EXISTS cupon_codigo VARCHAR(40),
    ADD COLUMN IF NOT EXISTS descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reintegrado_en TIMESTAMP;


/* Botón de arrepentimiento (Res. 424/2020) */

CREATE TABLE IF NOT EXISTS solicitudes_arrepentimiento (
    id SERIAL PRIMARY KEY,

    /* Código de trámite que se le entrega al cliente */
    codigo VARCHAR(20) NOT NULL UNIQUE,

    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefono VARCHAR(40),
    orden_id INTEGER,
    motivo TEXT,

    estado VARCHAR(20) NOT NULL DEFAULT 'recibida',

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT solicitudes_arrepentimiento_estado_check
        CHECK (estado IN ('recibida', 'resuelta'))
);

CREATE INDEX IF NOT EXISTS idx_ordenes_usuario
ON ordenes(usuario_id);
