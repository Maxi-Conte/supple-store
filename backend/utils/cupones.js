const db = require("../db/database");

function normalizarCodigo(codigo) {
  return String(codigo || "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
}

/* ==================================================
   VALIDAR CUPÓN Y CALCULAR DESCUENTO
   Devuelve { codigo, descuento } o { error }
================================================== */

async function calcularDescuentoCupon(codigoIngresado, subtotal) {
  const codigo = normalizarCodigo(codigoIngresado);

  if (!codigo) {
    return { codigo: null, descuento: 0 };
  }

  const resultado = await db.query(
    `
      SELECT *
      FROM cupones
      WHERE codigo = $1
    `,
    [codigo]
  );

  const cupon = resultado.rows[0];

  if (!cupon || cupon.activo !== true) {
    return { error: "El código de descuento no es válido." };
  }

  if (
    cupon.vence_en &&
    new Date(cupon.vence_en) < new Date(new Date().toDateString())
  ) {
    return { error: "El código de descuento está vencido." };
  }

  if (
    cupon.usos_maximos !== null &&
    Number(cupon.usos) >= Number(cupon.usos_maximos)
  ) {
    return { error: "El código de descuento ya alcanzó su límite de usos." };
  }

  const minimo = Number(cupon.minimo_compra) || 0;

  if (subtotal < minimo) {
    return {
      error: `Este código es válido para compras desde $${minimo.toLocaleString("es-AR")}.`
    };
  }

  const valor = Number(cupon.valor);

  const descuento =
    cupon.tipo === "porcentaje"
      ? Math.round(subtotal * valor / 100)
      : Math.min(valor, subtotal);

  return {
    codigo,
    tipo: cupon.tipo,
    valor,
    descuento
  };
}

/* Se llama cuando el pago se aprueba */

async function registrarUsoCupon(codigo, cliente = db) {
  if (!codigo) return;

  await cliente.query(
    `
      UPDATE cupones
      SET usos = usos + 1
      WHERE codigo = $1
    `,
    [codigo]
  );
}

module.exports = {
  normalizarCodigo,
  calcularDescuentoCupon,
  registrarUsoCupon
};
