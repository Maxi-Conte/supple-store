/* =========================================================
   KRATOS — COLUMNAS QUE FALTABAN EN schema.sql
   Existían en la base local pero no en el volcado, así que
   una base nueva (por ejemplo, la de Render) quedaba sin ellas.
   Se puede ejecutar varias veces sin romper nada.
========================================================= */

/* Activar o desactivar categorías desde el panel */

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
