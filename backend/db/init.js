require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

/*
  schema.sql es un volcado de pg_dump. Antes de ejecutarlo
  quitamos lo que solo entiende psql o lo que falla en un
  servidor nuevo (Render / Railway):

  - líneas \restrict / \unrestrict (comandos de psql)
  - ALTER ... OWNER TO postgres (el usuario no se llama así)
*/
function limpiarVolcado(sql) {
  return sql
    .split('\n')
    .filter((linea) => !linea.startsWith('\\'))
    .filter((linea) => !/^ALTER .+ OWNER TO /.test(linea))
    .join('\n');
}

async function init() {
  const schema = limpiarVolcado(
    fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  );

  try {
    const existe = await pool.query(
      "SELECT to_regclass('public.productos') IS NOT NULL AS existe"
    );

    if (existe.rows[0].existe) {
      console.log('La base ya tiene tablas: no se ejecuta schema.sql.');
    } else {
      console.log('Ejecutando schema.sql...');
      await pool.query(schema);
      console.log('✅ Base de datos inicializada correctamente.');
    }

    console.log('Ahora corré "npm run db:migrate" para aplicar las migraciones.');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
