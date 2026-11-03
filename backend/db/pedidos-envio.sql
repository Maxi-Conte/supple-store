/* =========================================================
   KRATOS — DATOS DE ENVÍO Y GESTIÓN DE PEDIDOS
   Se puede ejecutar varias veces sin romper nada.
========================================================= */

ALTER TABLE ordenes
    ADD COLUMN IF NOT EXISTS carrito_id INTEGER,
    ADD COLUMN IF NOT EXISTS nombre_comprador VARCHAR(150),
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(40),
    ADD COLUMN IF NOT EXISTS dni VARCHAR(20),

    ADD COLUMN IF NOT EXISTS metodo_entrega VARCHAR(20)
        NOT NULL DEFAULT 'envio',

    ADD COLUMN IF NOT EXISTS direccion VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ciudad VARCHAR(120),
    ADD COLUMN IF NOT EXISTS provincia VARCHAR(120),
    ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(15),
    ADD COLUMN IF NOT EXISTS notas TEXT,

    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS costo_envio NUMERIC(12,2)
        NOT NULL DEFAULT 0,

    ADD COLUMN IF NOT EXISTS codigo_seguimiento VARCHAR(120),
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP;


/* Órdenes viejas: el subtotal era el total */

UPDATE ordenes
SET subtotal = total
WHERE subtotal IS NULL;


/* Estados del pedido después del pago */

ALTER TABLE ordenes
    DROP CONSTRAINT IF EXISTS ordenes_estado_check;

ALTER TABLE ordenes
    ADD CONSTRAINT ordenes_estado_check CHECK (
        estado IN (
            'pendiente',
            'rechazado',
            'pagado',
            'preparando',
            'enviado',
            'listo_retiro',
            'entregado',
            'cancelado'
        )
    );

ALTER TABLE ordenes
    DROP CONSTRAINT IF EXISTS ordenes_metodo_entrega_check;

ALTER TABLE ordenes
    ADD CONSTRAINT ordenes_metodo_entrega_check CHECK (
        metodo_entrega IN ('envio', 'retiro')
    );


CREATE INDEX IF NOT EXISTS idx_ordenes_estado
ON ordenes(estado);

CREATE INDEX IF NOT EXISTS idx_ordenes_creado_en
ON ordenes(creado_en DESC);
