const { Pool } = require("pg");

/*
  Render y Railway pueden inyectar DATABASE_URL
  automáticamente al conectar PostgreSQL.

  En local, DATABASE_URL se obtiene desde el archivo .env.
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? {
        rejectUnauthorized: false
      }
      : false
});

/* ==================================================
   CONTROL DE ERRORES DEL POOL
================================================== */

pool.on("error", (error) => {
  console.error(
    "Error inesperado en el pool de PostgreSQL:",
    error
  );
});

/* ==================================================
   EXPORTACIONES
================================================== */

module.exports = {
  /*
    Para consultas normales:

    db.query("SELECT ...", [parametros])
  */

  query: (texto, parametros) =>
    pool.query(texto, parametros),

  /*
    Para obtener una conexión exclusiva y realizar
    transacciones con BEGIN, COMMIT y ROLLBACK:

    const cliente = await db.connect();
  */

  connect: () => pool.connect(),

  /*
    También dejamos disponible el pool completo
    para mantener compatibilidad con otros archivos.
  */

  pool
};