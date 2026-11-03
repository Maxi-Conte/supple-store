require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/*
  Respaldo de la base con pg_dump (tiene que estar instalado,
  viene con PostgreSQL). Se guarda en /backups con la fecha.

  En Windows, si pg_dump no está en el PATH, se puede indicar:
  PG_DUMP_PATH="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
*/

const carpeta = path.join(__dirname, '..', '..', 'backups');
fs.mkdirSync(carpeta, { recursive: true });

const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const archivo = path.join(carpeta, `supple_store_${fecha}.backup`);

const pgDump = process.env.PG_DUMP_PATH || 'pg_dump';

const resultado = spawnSync(
  pgDump,
  [process.env.DATABASE_URL, '-Fc', '-f', archivo],
  { stdio: 'inherit' }
);

if (resultado.error || resultado.status !== 0) {
  console.error('❌ No se pudo hacer el respaldo.', resultado.error?.message || '');
  process.exitCode = 1;
} else {
  console.log(`✅ Respaldo guardado en ${archivo}`);
}
