require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    console.log('Ejecutando schema.sql...');
    await pool.query(schema);
    console.log('✅ Base de datos inicializada correctamente.');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
