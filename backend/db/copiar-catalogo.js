require('dotenv').config();
const { Pool } = require('pg');

/*
  Copia el catálogo (categorías, marcas, productos y variantes)
  de la base local a otra base, por ejemplo la de Render.

  No copia usuarios, carritos ni pedidos.
  No borra nada en el destino: si un registro ya existe
  (mismo id), lo actualiza.

  Uso (la base de destino ya tiene que tener las tablas,
  con "npm run db:setup" apuntando a ella):

    DESTINO_DATABASE_URL="postgresql://..." npm run db:copiar-catalogo
*/

const TABLAS = [
  'categorias',
  'marcas',
  'productos',
  'producto_variantes'
];

function conectar(url) {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

  return new Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false }
  });
}

async function copiarTabla(origen, destino, tabla) {
  const filas = (await origen.query(`SELECT * FROM ${tabla} ORDER BY id`)).rows;

  if (filas.length === 0) {
    console.log(`  ${tabla}: sin registros`);
    return;
  }

  /* Solo las columnas que existen en las dos bases */
  const columnasDestino = new Set(
    (await destino.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tabla]
    )).rows.map((fila) => fila.column_name)
  );

  const columnas = Object.keys(filas[0]).filter((columna) =>
    columnasDestino.has(columna)
  );

  const lista = columnas.map((columna) => `"${columna}"`).join(', ');
  const valores = columnas.map((_, i) => `$${i + 1}`).join(', ');
  const actualizar = columnas
    .filter((columna) => columna !== 'id')
    .map((columna) => `"${columna}" = EXCLUDED."${columna}"`)
    .join(', ');

  const consulta = `
    INSERT INTO ${tabla} (${lista})
    VALUES (${valores})
    ON CONFLICT (id) DO UPDATE SET ${actualizar}
  `;

  for (const fila of filas) {
    await destino.query(
      consulta,
      columnas.map((columna) => fila[columna])
    );
  }

  /* Para que los próximos registros nuevos no repitan ids */
  await destino.query(`
    SELECT setval(
      pg_get_serial_sequence('${tabla}', 'id'),
      GREATEST((SELECT MAX(id) FROM ${tabla}), 1)
    )
  `);

  console.log(`  ${tabla}: ${filas.length} registros`);
}

async function copiarCatalogo() {
  const urlOrigen = process.env.DATABASE_URL;
  const urlDestino = process.env.DESTINO_DATABASE_URL;

  if (!urlDestino) {
    console.error('❌ Falta DESTINO_DATABASE_URL (la base a la que se copia el catálogo).');
    process.exitCode = 1;
    return;
  }

  if (urlDestino === urlOrigen) {
    console.error('❌ El origen y el destino son la misma base.');
    process.exitCode = 1;
    return;
  }

  const origen = conectar(urlOrigen);
  const destino = conectar(urlDestino);
  const cliente = await destino.connect();

  try {
    console.log('Copiando catálogo...');

    await cliente.query('BEGIN');

    for (const tabla of TABLAS) {
      await copiarTabla(origen, cliente, tabla);
    }

    await cliente.query('COMMIT');

    console.log('✅ Catálogo copiado.');
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('❌ No se pudo copiar el catálogo (no se guardó nada):', error.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
    await origen.end();
    await destino.end();
  }
}

copiarCatalogo();
