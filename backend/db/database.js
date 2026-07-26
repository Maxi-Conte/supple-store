const { Pool } = require('pg');

// Render/Railway inyectan DATABASE_URL automáticamente al conectar un servicio Postgres.
// En local, la definís vos mismo en el archivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
