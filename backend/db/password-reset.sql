/* =========================================================
   KRATOS — RECUPERACIÓN DE CONTRASEÑA
========================================================= */

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL,

    token_hash VARCHAR(64) NOT NULL UNIQUE,

    expira_en TIMESTAMP NOT NULL,

    usado_en TIMESTAMP,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT password_reset_tokens_usuario_id_fkey
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario
ON password_reset_tokens(usuario_id);


CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
ON password_reset_tokens(token_hash);