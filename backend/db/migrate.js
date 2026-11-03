require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

/*
  Migraciones que se agregaron después del schema inicial.
  Todas se pueden ejecutar varias veces.
*/
const MIGRACIONES = [
  'password-reset.sql',
  'pedidos-envio.sql'
];

async function migrar() {
  try {
    for (const archivo of MIGRACIONES) {
      const sql = fs.readFileSync(path.join(__dirname, archivo), 'utf8');
      console.log(`Ejecutando ${archivo}...`);
      await pool.query(sql);
    }
    console.log('✅ Migraciones aplicadas correctamente.');
  } catch (err) {
    console.error('❌ Error aplicando migraciones:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrar();
