const express = require("express");
const db = require("../db/database");

const {
  verificarAdmin
} = require("../middleware/admin-auth");

const {
  normalizarCodigo
} = require("../utils/cupones");

const router = express.Router();

router.use(verificarAdmin);

function formatearCupon(cupon) {
  return {
    ...cupon,
    valor: Number(cupon.valor),
    minimo_compra: Number(cupon.minimo_compra),
    usos: Number(cupon.usos),
    usos_maximos:
      cupon.usos_maximos === null
        ? null
        : Number(cupon.usos_maximos)
  };
}

/* ==================================================
   ADMIN - LISTAR CUPONES
   GET /api/admin/cupones
================================================== */

router.get("/", async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT *
      FROM cupones
      ORDER BY activo DESC, creado_en DESC
    `);

    res.json(resultado.rows.map(formatearCupon));
  } catch (error) {
    console.error(
      "Error al obtener los cupones:",
      error
    );

    res.status(500).json({
      error: "Error al obtener los cupones."
    });
  }
});

/* ==================================================
   ADMIN - CREAR CUPÓN
   POST /api/admin/cupones
================================================== */

router.post("/", async (req, res) => {
  const codigo = normalizarCodigo(req.body.codigo);

  const tipo =
    req.body.tipo === "monto"
      ? "monto"
      : "porcentaje";

  const valor = Number(req.body.valor);
  const minimoCompra = Number(req.body.minimo_compra) || 0;

  const usosMaximos =
    req.body.usos_maximos === "" ||
    req.body.usos_maximos === null ||
    req.body.usos_maximos === undefined
      ? null
      : Number(req.body.usos_maximos);

  const venceEn =
    String(req.body.vence_en || "").trim() || null;

  if (!/^[A-Z0-9_-]{3,40}$/.test(codigo)) {
    return res.status(400).json({
      error: "El código debe tener entre 3 y 40 letras, números, guiones o guiones bajos."
    });
  }

  if (
    !Number.isFinite(valor) ||
    valor <= 0 ||
    (tipo === "porcentaje" && valor > 100)
  ) {
    return res.status(400).json({
      error:
        tipo === "porcentaje"
          ? "El porcentaje debe estar entre 1 y 100."
          : "El monto del descuento debe ser mayor a 0."
    });
  }

  if (minimoCompra < 0) {
    return res.status(400).json({
      error: "La compra mínima no puede ser negativa."
    });
  }

  if (
    usosMaximos !== null &&
    (!Number.isInteger(usosMaximos) || usosMaximos <= 0)
  ) {
    return res.status(400).json({
      error: "El límite de usos debe ser un número entero mayor a 0."
    });
  }

  if (
    venceEn &&
    !/^\d{4}-\d{2}-\d{2}$/.test(venceEn)
  ) {
    return res.status(400).json({
      error: "La fecha de vencimiento no es válida."
    });
  }

  try {
    const resultado = await db.query(
      `
        INSERT INTO cupones (
          codigo,
          tipo,
          valor,
          minimo_compra,
          usos_maximos,
          vence_en
        )

        VALUES ($1, $2, $3, $4, $5, $6)

        RETURNING *
      `,
      [
        codigo,
        tipo,
        valor,
        minimoCompra,
        usosMaximos,
        venceEn
      ]
    );

    res.status(201).json({
      mensaje: `Cupón ${codigo} creado.`,
      cupon: formatearCupon(resultado.rows[0])
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ya existe un cupón con ese código."
      });
    }

    console.error(
      "Error al crear el cupón:",
      error
    );

    res.status(500).json({
      error: "Error al crear el cupón."
    });
  }
});

/* ==================================================
   ADMIN - ACTIVAR O DESACTIVAR CUPÓN
   PATCH /api/admin/cupones/:id/estado
================================================== */

router.patch("/:id/estado", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El cupón no es válido."
    });
  }

  try {
    const resultado = await db.query(
      `
        UPDATE cupones
        SET activo = $1
        WHERE id = $2
        RETURNING codigo, activo
      `,
      [req.body.activo === true, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: "Cupón no encontrado."
      });
    }

    const cupon = resultado.rows[0];

    res.json({
      mensaje: `Cupón ${cupon.codigo} ${cupon.activo ? "activado" : "desactivado"}.`
    });
  } catch (error) {
    console.error(
      "Error al cambiar el estado del cupón:",
      error
    );

    res.status(500).json({
      error: "Error al actualizar el cupón."
    });
  }
});

module.exports = router;
