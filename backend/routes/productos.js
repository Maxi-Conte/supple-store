const express = require("express");
const db = require("../db/database");

const {
    verificarAdmin
} = require("../middleware/admin-auth");

const router = express.Router();

/* ==================================================
   FUNCIONES AUXILIARES
================================================== */

function textoONull(valor) {
  const texto = String(valor ?? "").trim();

  return texto || null;
}

function numeroNoNegativo(
  valor,
  valorPredeterminado = 0
) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return valorPredeterminado;
  }

  return numero;
}

function enteroNoNegativo(
  valor,
  valorPredeterminado = 0
) {
  const numero = Number(valor);

  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    return valorPredeterminado;
  }

  return numero;
}

function enteroPositivoONull(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  if (
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    return null;
  }

  return numero;
}

function convertirBooleano(
  valor,
  valorPredeterminado = true
) {
  if (
    valor === undefined ||
    valor === null
  ) {
    return valorPredeterminado;
  }

  if (
    valor === false ||
    valor === 0 ||
    valor === "false" ||
    valor === "0"
  ) {
    return false;
  }

  return true;
}

function crearSlug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function convertirVariante(variante) {
  return {
    ...variante,

    id: Number(variante.id),

    producto_id:
      Number(variante.producto_id),

    precio:
      Number(variante.precio) || 0,

    stock:
      Number(variante.stock) || 0,

    peso_gramos:
      variante.peso_gramos !== null
        ? Number(variante.peso_gramos)
        : null
  };
}

/*
  Mantiene sincronizadas las columnas antiguas
  de productos con una variante principal.

  Esto permite que las partes anteriores del proyecto
  sigan funcionando mientras terminamos de adaptar
  todo el panel administrativo.
*/

async function sincronizarProductoLegacy(
  cliente,
  productoId
) {
  const varianteResult =
    await cliente.query(
      `
        SELECT
          sabor,
          peso_gramos,
          precio

        FROM producto_variantes

        WHERE producto_id = $1
          AND activo = TRUE

        ORDER BY
          CASE
            WHEN stock > 0
              AND precio > 0
              THEN 0

            WHEN stock > 0
              THEN 1

            WHEN precio > 0
              THEN 2

            ELSE 3
          END,

          id ASC

        LIMIT 1
      `,
      [productoId]
    );

  const stockResult =
    await cliente.query(
      `
        SELECT
          COALESCE(
            SUM(stock),
            0
          )::INTEGER AS stock_total

        FROM producto_variantes

        WHERE producto_id = $1
          AND activo = TRUE
      `,
      [productoId]
    );

  const variante =
    varianteResult.rows[0] || null;

  const stockTotal =
    Number(
      stockResult.rows[0]?.stock_total
    ) || 0;

  await cliente.query(
    `
      UPDATE productos

      SET
        precio = $2,
        stock = $3,
        sabor = $4,
        peso_gramos = $5

      WHERE id = $1
    `,
    [
      productoId,

      variante
        ? Number(variante.precio) || 0
        : 0,

      stockTotal,

      variante?.sabor || null,

      variante?.peso_gramos || null
    ]
  );
}

/* ==================================================
   CATEGORÍAS
   GET /api/categorias
================================================== */

router.get("/categorias", async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        id,
        nombre,
        slug

      FROM categorias

      ORDER BY orden ASC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error(
      "Error al obtener categorías:",
      error
    );

    res.status(500).json({
      error:
        "Error al obtener categorías."
    });
  }
});

/* ==================================================
   MARCAS
   GET /api/marcas
================================================== */

router.get("/marcas", async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        id,
        nombre,
        slug

      FROM marcas

      ORDER BY nombre ASC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error(
      "Error al obtener marcas:",
      error
    );

    res.status(500).json({
      error:
        "Error al obtener marcas."
    });
  }
});

/* ==================================================
   PRODUCTOS PÚBLICOS
   GET /api/productos
================================================== */

router.get("/productos", async (req, res) => {
  try {
    const {
      categoria,
      buscar
    } = req.query;

    let consulta = `
      SELECT
        p.id,
        p.nombre,
        p.slug,
        p.imagen_url,
        p.dato_destacado,
        p.descripcion,

        COALESCE(
          MIN(pv.precio) FILTER (
            WHERE pv.activo = TRUE
              AND pv.precio > 0
          ),

          MIN(pv.precio) FILTER (
            WHERE pv.activo = TRUE
          ),

          p.precio,
          0
        ) AS precio,

        COALESCE(
          SUM(pv.stock) FILTER (
            WHERE pv.activo = TRUE
          ),

          p.stock,
          0
        )::INTEGER AS stock,

        COALESCE(
          STRING_AGG(
            DISTINCT NULLIF(
              TRIM(pv.sabor),
              ''
            ),
            ', '
          ) FILTER (
            WHERE pv.activo = TRUE
          ),

          NULLIF(
            TRIM(p.sabor),
            ''
          )
        ) AS sabor,

        COALESCE(
          MIN(pv.peso_gramos) FILTER (
            WHERE pv.activo = TRUE
          ),

          p.peso_gramos
        ) AS peso_gramos,

        COUNT(pv.id) FILTER (
          WHERE pv.activo = TRUE
        ) AS cantidad_variantes,

        c.nombre AS categoria,
        c.slug AS categoria_slug,

        m.nombre AS marca,
        m.slug AS marca_slug

      FROM productos p

      LEFT JOIN categorias c
        ON c.id = p.categoria_id

      LEFT JOIN marcas m
        ON m.id = p.marca_id

      LEFT JOIN producto_variantes pv
        ON pv.producto_id = p.id

      WHERE p.activo = TRUE
    `;

    const parametros = [];

    if (categoria) {
      parametros.push(categoria);

      consulta += `
        AND c.slug = $${parametros.length}
      `;
    }

    if (buscar) {
      parametros.push(`%${buscar}%`);

      consulta += `
        AND (
          LOWER(p.nombre)
            LIKE LOWER(
              $${parametros.length}
            )

          OR LOWER(
            COALESCE(
              p.descripcion,
              ''
            )
          )
            LIKE LOWER(
              $${parametros.length}
            )

          OR LOWER(
            COALESCE(
              m.nombre,
              ''
            )
          )
            LIKE LOWER(
              $${parametros.length}
            )
        )
      `;
    }

    consulta += `
      GROUP BY
        p.id,
        p.nombre,
        p.slug,
        p.imagen_url,
        p.dato_destacado,
        p.descripcion,
        p.precio,
        p.stock,
        p.sabor,
        p.peso_gramos,

        c.nombre,
        c.slug,

        m.nombre,
        m.slug

      ORDER BY p.nombre ASC
    `;

    const resultado = await db.query(
      consulta,
      parametros
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(
      "Error al obtener productos:",
      error
    );

    res.status(500).json({
      error:
        "Error al obtener productos."
    });
  }
});

/* ==================================================
   DETALLE DE PRODUCTO
   GET /api/productos/:slug
================================================== */

router.get(
  "/productos/:slug",
  async (req, res) => {
    try {
      const productoResult =
        await db.query(
          `
            SELECT
              p.id,
              p.categoria_id,
              p.marca_id,
              p.nombre,
              p.slug,
              p.descripcion,
              p.imagen_url,
              p.dato_destacado,
              p.activo,

              p.precio AS precio_anterior,
              p.stock AS stock_anterior,
              p.sabor AS sabor_anterior,
              p.peso_gramos AS peso_anterior,

              c.nombre AS categoria,
              c.slug AS categoria_slug,

              m.nombre AS marca,
              m.slug AS marca_slug

            FROM productos p

            LEFT JOIN categorias c
              ON c.id = p.categoria_id

            LEFT JOIN marcas m
              ON m.id = p.marca_id

            WHERE p.slug = $1
              AND p.activo = TRUE
          `,
          [req.params.slug]
        );

      if (
        productoResult.rows.length === 0
      ) {
        return res.status(404).json({
          error:
            "Producto no encontrado."
        });
      }

      const producto =
        productoResult.rows[0];

      const variantesResult =
        await db.query(
          `
            SELECT
              id,
              producto_id,
              sabor,
              peso_gramos,
              precio,
              stock,
              sku,
              activo

            FROM producto_variantes

            WHERE producto_id = $1
              AND activo = TRUE

            ORDER BY
              CASE
                WHEN stock > 0
                  AND precio > 0
                  THEN 0

                WHEN stock > 0
                  THEN 1

                ELSE 2
              END,

              precio ASC,
              peso_gramos ASC NULLS LAST,
              sabor ASC NULLS LAST
          `,
          [producto.id]
        );

      let variantes =
        variantesResult.rows.map(
          convertirVariante
        );

      /*
        Compatibilidad temporal con productos antiguos
        que todavía no tengan variantes.
      */

      if (variantes.length === 0) {
        variantes = [
          {
            id: null,

            producto_id:
              Number(producto.id),

            sabor:
              producto.sabor_anterior ||
              null,

            peso_gramos:
              Number(
                producto.peso_anterior
              ) || null,

            precio:
              Number(
                producto.precio_anterior
              ) || 0,

            stock:
              Number(
                producto.stock_anterior
              ) || 0,

            sku: null,
            activo: true
          }
        ];
      }

      const variantePredeterminada =
        variantes.find(
          (variante) =>
            variante.stock > 0 &&
            variante.precio > 0
        ) ||
        variantes.find(
          (variante) =>
            variante.stock > 0
        ) ||
        variantes.find(
          (variante) =>
            variante.precio > 0
        ) ||
        variantes[0];

      const sabores = [
        ...new Set(
          variantes
            .map((variante) =>
              variante.sabor
                ? variante.sabor.trim()
                : null
            )
            .filter(Boolean)
        )
      ];

      const pesos = [
        ...new Set(
          variantes
            .map((variante) =>
              Number(
                variante.peso_gramos
              )
            )
            .filter(
              (peso) => peso > 0
            )
        )
      ].sort((a, b) => a - b);

      const stockTotal =
        variantes.reduce(
          (total, variante) =>
            total +
            Number(
              variante.stock || 0
            ),
          0
        );

      const preciosDisponibles =
        variantes
          .map((variante) =>
            Number(variante.precio)
          )
          .filter(
            (precio) => precio > 0
          );

      const precioMinimo =
        preciosDisponibles.length
          ? Math.min(
              ...preciosDisponibles
            )
          : Number(
              variantePredeterminada
                .precio
            ) || 0;

      const precioMaximo =
        preciosDisponibles.length
          ? Math.max(
              ...preciosDisponibles
            )
          : Number(
              variantePredeterminada
                .precio
            ) || 0;

      delete producto.precio_anterior;
      delete producto.stock_anterior;
      delete producto.sabor_anterior;
      delete producto.peso_anterior;

      res.json({
        ...producto,

        precio:
          Number(
            variantePredeterminada
              .precio
          ) || 0,

        stock:
          Number(
            variantePredeterminada
              .stock
          ) || 0,

        sabor: sabores,
        sabores,

        peso_gramos:
          variantePredeterminada
            .peso_gramos || null,

        pesos,

        stock_total:
          stockTotal,

        precio_minimo:
          precioMinimo,

        precio_maximo:
          precioMaximo,

        variante_predeterminada_id:
          variantePredeterminada.id,

        variantes
      });
    } catch (error) {
      console.error(
        "Error al obtener el detalle del producto:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener producto."
      });
    }
  }
);



/* ==================================================
   PROTEGER TODAS LAS RUTAS ADMIN
================================================== */

router.use(
    "/admin/productos",
    verificarAdmin
);

router.use(
    "/admin/variantes",
    verificarAdmin
);


/* ==================================================
   ADMIN - LISTAR TODOS LOS PRODUCTOS
   GET /api/admin/productos
================================================== */

router.get(
  "/admin/productos",
  async (req, res) => {
    try {
      const resultado = await db.query(`
        SELECT
          p.id,
          p.nombre,
          p.slug,
          p.descripcion,
          p.imagen_url,
          p.dato_destacado,
          p.marca_id,
          p.activo,
          p.categoria_id,

          COALESCE(
            MIN(pv.precio) FILTER (
              WHERE pv.activo = TRUE
                AND pv.precio > 0
            ),

            p.precio,
            0
          ) AS precio,

          COALESCE(
            SUM(pv.stock) FILTER (
              WHERE pv.activo = TRUE
            ),

            p.stock,
            0
          )::INTEGER AS stock,

          COALESCE(
            STRING_AGG(
              DISTINCT NULLIF(
                TRIM(pv.sabor),
                ''
              ),
              ', '
            ) FILTER (
              WHERE pv.activo = TRUE
            ),

            NULLIF(
              TRIM(p.sabor),
              ''
            )
          ) AS sabor,

          COALESCE(
            MIN(pv.peso_gramos) FILTER (
              WHERE pv.activo = TRUE
            ),

            p.peso_gramos
          ) AS peso_gramos,

          COUNT(pv.id)
            AS cantidad_variantes,

          c.nombre AS categoria,
          m.nombre AS marca

        FROM productos p

        LEFT JOIN categorias c
          ON c.id = p.categoria_id

        LEFT JOIN marcas m
          ON m.id = p.marca_id

        LEFT JOIN producto_variantes pv
          ON pv.producto_id = p.id

        GROUP BY
          p.id,
          p.nombre,
          p.slug,
          p.descripcion,
          p.imagen_url,
          p.dato_destacado,
          p.marca_id,
          p.activo,
          p.categoria_id,
          p.precio,
          p.stock,
          p.sabor,
          p.peso_gramos,

          c.nombre,
          m.nombre

        ORDER BY p.id ASC
      `);

      const productos =
        resultado.rows.map(
          (producto) => ({
            ...producto,

            precio:
              Number(
                producto.precio
              ) || 0,

            stock:
              Number(
                producto.stock
              ) || 0,

            peso_gramos:
              producto.peso_gramos !==
              null
                ? Number(
                    producto.peso_gramos
                  )
                : null,

            cantidad_variantes:
              Number(
                producto
                  .cantidad_variantes
              ) || 0
          })
        );

      res.json(productos);
    } catch (error) {
      console.error(
        "Error al obtener productos del administrador:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener productos del administrador."
      });
    }
  }
);

/* ==================================================
   ADMIN - OBTENER PRODUCTO POR ID
   GET /api/admin/productos/:id
================================================== */

router.get(
  "/admin/productos/:id",
  async (req, res) => {
    const productoId =
      Number(req.params.id);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return res.status(400).json({
        error:
          "El producto no es válido."
      });
    }

    try {
      const productoResult =
        await db.query(
          `
            SELECT
              p.id,
              p.nombre,
              p.slug,
              p.descripcion,
              p.imagen_url,
              p.dato_destacado,
              p.marca_id,
              p.activo,
              p.categoria_id,

              c.nombre AS categoria,
              m.nombre AS marca

            FROM productos p

            LEFT JOIN categorias c
              ON c.id = p.categoria_id

            LEFT JOIN marcas m
              ON m.id = p.marca_id

            WHERE p.id = $1
          `,
          [productoId]
        );

      if (
        productoResult.rows.length === 0
      ) {
        return res.status(404).json({
          error:
            "Producto no encontrado."
        });
      }

      const variantesResult =
        await db.query(
          `
            SELECT
              id,
              producto_id,
              sabor,
              peso_gramos,
              precio,
              stock,
              sku,
              activo

            FROM producto_variantes

            WHERE producto_id = $1

            ORDER BY
              CASE
                WHEN activo = TRUE
                  AND stock > 0
                  AND precio > 0
                  THEN 0

                WHEN activo = TRUE
                  THEN 1

                ELSE 2
              END,

              id ASC
          `,
          [productoId]
        );

      const variantes =
        variantesResult.rows.map(
          convertirVariante
        );

      const variantePrincipal =
        variantes.find(
          (variante) =>
            variante.activo === true &&
            variante.stock > 0 &&
            variante.precio > 0
        ) ||
        variantes.find(
          (variante) =>
            variante.activo === true
        ) ||
        variantes[0] ||
        null;

      res.json({
        ...productoResult.rows[0],

        precio:
          variantePrincipal?.precio || 0,

        stock:
          variantePrincipal?.stock || 0,

        sabor:
          variantePrincipal?.sabor || "",

        peso_gramos:
          variantePrincipal
            ?.peso_gramos || null,

        variante_principal_id:
          variantePrincipal?.id || null,

        variantes
      });
    } catch (error) {
      console.error(
        "Error al obtener producto del administrador:",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener producto."
      });
    }
  }
);

/* ==================================================
   ADMIN - CREAR PRODUCTO Y PRIMERA VARIANTE
   POST /api/admin/productos
================================================== */

router.post(
  "/admin/productos",
  async (req, res) => {
    const {
      categoria_id,
      nombre,
      slug,
      descripcion,
      precio,
      stock,
      imagen_url,
      dato_destacado,
      sabor,
      peso_gramos,
      marca_id,
      activo,
      sku
    } = req.body;

    const nombreLimpio =
      String(nombre || "").trim();

    const categoriaId =
      enteroPositivoONull(
        categoria_id
      );

    const marcaId =
      enteroPositivoONull(
        marca_id
      );

    const precioVariante =
      numeroNoNegativo(precio);

    const stockVariante =
      enteroNoNegativo(stock);

    const pesoVariante =
      enteroPositivoONull(
        peso_gramos
      );

    if (!nombreLimpio) {
      return res.status(400).json({
        error:
          "El nombre del producto es obligatorio."
      });
    }

    if (!categoriaId) {
      return res.status(400).json({
        error:
          "Seleccioná una categoría válida."
      });
    }

    if (precioVariante <= 0) {
      return res.status(400).json({
        error:
          "El precio de la primera variante debe ser mayor que cero."
      });
    }

    const slugBase =
      textoONull(slug) ||
      crearSlug(nombreLimpio);

    const slugFinal =
      slugBase ||
      `producto-${Date.now()}`;

    const cliente =
      await db.connect();

    try {
      await cliente.query("BEGIN");

      const productoResult =
        await cliente.query(
          `
            INSERT INTO productos (
              categoria_id,
              nombre,
              slug,
              descripcion,
              precio,
              stock,
              imagen_url,
              dato_destacado,
              sabor,
              peso_gramos,
              marca_id,
              activo
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12
            )

            RETURNING *
          `,
          [
            categoriaId,
            nombreLimpio,
            slugFinal,
            textoONull(descripcion),
            precioVariante,
            stockVariante,
            textoONull(imagen_url),
            textoONull(dato_destacado),
            textoONull(sabor),
            pesoVariante,
            marcaId,
            convertirBooleano(
              activo,
              true
            )
          ]
        );

      const producto =
        productoResult.rows[0];

      const varianteResult =
        await cliente.query(
          `
            INSERT INTO producto_variantes (
              producto_id,
              sabor,
              peso_gramos,
              precio,
              stock,
              sku,
              activo
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              TRUE
            )

            RETURNING *
          `,
          [
            producto.id,
            textoONull(sabor),
            pesoVariante,
            precioVariante,
            stockVariante,
            textoONull(sku)
          ]
        );

      await sincronizarProductoLegacy(
        cliente,
        producto.id
      );

      await cliente.query("COMMIT");

      res.status(201).json({
        mensaje:
          "Producto y primera variante creados correctamente.",

        producto,

        variante:
          convertirVariante(
            varianteResult.rows[0]
          )
      });
    } catch (error) {
      await cliente.query(
        "ROLLBACK"
      );

      console.error(
        "Error al crear producto:",
        error
      );

      if (error.code === "23505") {
        return res.status(400).json({
          error:
            "Ya existe un producto con ese slug o una variante igual."
        });
      }

      if (error.code === "23503") {
        return res.status(400).json({
          error:
            "La categoría o la marca seleccionada no existe."
        });
      }

      res.status(500).json({
        error:
          "Error al crear producto."
      });
    } finally {
      cliente.release();
    }
  }
);

/* ==================================================
   ADMIN - EDITAR PRODUCTO
   PUT /api/admin/productos/:id

   También mantiene compatible el admin.js actual:
   si recibe precio, stock, sabor o peso, modifica
   la variante principal.
================================================== */

router.put(
  "/admin/productos/:id",
  async (req, res) => {
    const productoId =
      Number(req.params.id);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return res.status(400).json({
        error:
          "El producto no es válido."
      });
    }

    const cliente =
      await db.connect();

    try {
      await cliente.query("BEGIN");

      const actualResult =
        await cliente.query(
          `
            SELECT *
            FROM productos

            WHERE id = $1

            FOR UPDATE
          `,
          [productoId]
        );

      if (
        actualResult.rows.length === 0
      ) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Producto no encontrado."
        });
      }

      const actual =
        actualResult.rows[0];

      const nombreNuevo =
        req.body.nombre !== undefined
          ? String(
              req.body.nombre
            ).trim()
          : actual.nombre;

      if (!nombreNuevo) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "El nombre del producto es obligatorio."
        });
      }

      const categoriaId =
        req.body.categoria_id !==
        undefined
          ? enteroPositivoONull(
              req.body.categoria_id
            )
          : Number(
              actual.categoria_id
            );

      if (!categoriaId) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "Seleccioná una categoría válida."
        });
      }

      const marcaId =
        req.body.marca_id !== undefined
          ? enteroPositivoONull(
              req.body.marca_id
            )
          : enteroPositivoONull(
              actual.marca_id
            );

      const productoResult =
        await cliente.query(
          `
            UPDATE productos

            SET
              nombre = $1,
              slug = $2,
              categoria_id = $3,
              descripcion = $4,
              imagen_url = $5,
              dato_destacado = $6,
              marca_id = $7,
              activo = $8

            WHERE id = $9

            RETURNING *
          `,
          [
            nombreNuevo,

            textoONull(
              req.body.slug
            ) || actual.slug,

            categoriaId,

            req.body.descripcion !==
            undefined
              ? textoONull(
                  req.body.descripcion
                )
              : actual.descripcion,

            req.body.imagen_url !==
            undefined
              ? textoONull(
                  req.body.imagen_url
                )
              : actual.imagen_url,

            req.body.dato_destacado !==
            undefined
              ? textoONull(
                  req.body.dato_destacado
                )
              : actual.dato_destacado,

            marcaId,

            req.body.activo !==
            undefined
              ? convertirBooleano(
                  req.body.activo
                )
              : actual.activo,

            productoId
          ]
        );

      const llegaronDatosVariante =
        req.body.precio !== undefined ||
        req.body.stock !== undefined ||
        req.body.sabor !== undefined ||
        req.body.peso_gramos !==
          undefined;

      let varianteActualizada = null;

      if (llegaronDatosVariante) {
        const varianteActualResult =
          await cliente.query(
            `
              SELECT *

              FROM producto_variantes

              WHERE producto_id = $1

              ORDER BY
                CASE
                  WHEN activo = TRUE
                    AND stock > 0
                    AND precio > 0
                    THEN 0

                  WHEN activo = TRUE
                    THEN 1

                  ELSE 2
                END,

                id ASC

              LIMIT 1

              FOR UPDATE
            `,
            [productoId]
          );

        const varianteActual =
          varianteActualResult.rows[0] ||
          null;

        const precioNuevo =
          req.body.precio !== undefined
            ? numeroNoNegativo(
                req.body.precio
              )
            : Number(
                varianteActual?.precio ||
                0
              );

        const stockNuevo =
          req.body.stock !== undefined
            ? enteroNoNegativo(
                req.body.stock
              )
            : Number(
                varianteActual?.stock ||
                0
              );

        const saborNuevo =
          req.body.sabor !== undefined
            ? textoONull(
                req.body.sabor
              )
            : varianteActual?.sabor ||
              null;

        const pesoNuevo =
          req.body.peso_gramos !==
          undefined
            ? enteroPositivoONull(
                req.body.peso_gramos
              )
            : varianteActual
              ? enteroPositivoONull(
                  varianteActual
                    .peso_gramos
                )
              : null;

        if (varianteActual) {
          const actualizadaResult =
            await cliente.query(
              `
                UPDATE producto_variantes

                SET
                  sabor = $1,
                  peso_gramos = $2,
                  precio = $3,
                  stock = $4

                WHERE id = $5

                RETURNING *
              `,
              [
                saborNuevo,
                pesoNuevo,
                precioNuevo,
                stockNuevo,
                varianteActual.id
              ]
            );

          varianteActualizada =
            convertirVariante(
              actualizadaResult.rows[0]
            );
        } else {
          const creadaResult =
            await cliente.query(
              `
                INSERT INTO producto_variantes (
                  producto_id,
                  sabor,
                  peso_gramos,
                  precio,
                  stock,
                  activo
                )

                VALUES (
                  $1,
                  $2,
                  $3,
                  $4,
                  $5,
                  TRUE
                )

                RETURNING *
              `,
              [
                productoId,
                saborNuevo,
                pesoNuevo,
                precioNuevo,
                stockNuevo
              ]
            );

          varianteActualizada =
            convertirVariante(
              creadaResult.rows[0]
            );
        }
      }

      await sincronizarProductoLegacy(
        cliente,
        productoId
      );

      await cliente.query("COMMIT");

      res.json({
        mensaje:
          "Producto actualizado correctamente.",

        producto:
          productoResult.rows[0],

        variante:
          varianteActualizada
      });
    } catch (error) {
      await cliente.query(
        "ROLLBACK"
      );

      console.error(
        "Error al actualizar producto:",
        error
      );

      if (error.code === "23505") {
        return res.status(400).json({
          error:
            "Ya existe otro producto con ese slug o una variante igual."
        });
      }

      if (error.code === "23503") {
        return res.status(400).json({
          error:
            "La categoría o la marca seleccionada no existe."
        });
      }

      res.status(500).json({
        error:
          "Error al actualizar producto."
      });
    } finally {
      cliente.release();
    }
  }
);

/* ==================================================
   ADMIN - CREAR VARIANTE
   POST /api/admin/productos/:productoId/variantes
================================================== */

router.post(
  "/admin/productos/:productoId/variantes",
  async (req, res) => {
    const productoId =
      Number(
        req.params.productoId
      );

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return res.status(400).json({
        error:
          "El producto no es válido."
      });
    }

    const precio =
      numeroNoNegativo(
        req.body.precio
      );

    const stock =
      enteroNoNegativo(
        req.body.stock
      );

    if (precio <= 0) {
      return res.status(400).json({
        error:
          "El precio de la variante debe ser mayor que cero."
      });
    }

    const cliente =
      await db.connect();

    try {
      await cliente.query("BEGIN");

      const productoResult =
        await cliente.query(
          `
            SELECT id

            FROM productos

            WHERE id = $1

            FOR UPDATE
          `,
          [productoId]
        );

      if (
        productoResult.rows.length === 0
      ) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Producto no encontrado."
        });
      }

      const varianteResult =
        await cliente.query(
          `
            INSERT INTO producto_variantes (
              producto_id,
              sabor,
              peso_gramos,
              precio,
              stock,
              sku,
              activo
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )

            RETURNING *
          `,
          [
            productoId,

            textoONull(
              req.body.sabor
            ),

            enteroPositivoONull(
              req.body.peso_gramos
            ),

            precio,
            stock,

            textoONull(
              req.body.sku
            ),

            convertirBooleano(
              req.body.activo,
              true
            )
          ]
        );

      await sincronizarProductoLegacy(
        cliente,
        productoId
      );

      await cliente.query("COMMIT");

      res.status(201).json({
        mensaje:
          "Variante creada correctamente.",

        variante:
          convertirVariante(
            varianteResult.rows[0]
          )
      });
    } catch (error) {
      await cliente.query(
        "ROLLBACK"
      );

      console.error(
        "Error al crear variante:",
        error
      );

      if (error.code === "23505") {
        return res.status(400).json({
          error:
            "Ya existe una variante con ese sabor y peso para este producto, o el SKU ya está en uso."
        });
      }

      res.status(500).json({
        error:
          "Error al crear variante."
      });
    } finally {
      cliente.release();
    }
  }
);

/* ==================================================
   ADMIN - EDITAR VARIANTE
   PUT /api/admin/variantes/:varianteId
================================================== */

router.put(
  "/admin/variantes/:varianteId",
  async (req, res) => {
    const varianteId =
      Number(
        req.params.varianteId
      );

    if (
      !Number.isInteger(varianteId) ||
      varianteId <= 0
    ) {
      return res.status(400).json({
        error:
          "La variante no es válida."
      });
    }

    const cliente =
      await db.connect();

    try {
      await cliente.query("BEGIN");

      const actualResult =
        await cliente.query(
          `
            SELECT *

            FROM producto_variantes

            WHERE id = $1

            FOR UPDATE
          `,
          [varianteId]
        );

      if (
        actualResult.rows.length === 0
      ) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Variante no encontrada."
        });
      }

      const actual =
        actualResult.rows[0];

      const precio =
        req.body.precio !== undefined
          ? numeroNoNegativo(
              req.body.precio
            )
          : Number(actual.precio);

      const stock =
        req.body.stock !== undefined
          ? enteroNoNegativo(
              req.body.stock
            )
          : Number(actual.stock);

      if (precio <= 0) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "El precio de la variante debe ser mayor que cero."
        });
      }

      const resultado =
        await cliente.query(
          `
            UPDATE producto_variantes

            SET
              sabor = $1,
              peso_gramos = $2,
              precio = $3,
              stock = $4,
              sku = $5,
              activo = $6

            WHERE id = $7

            RETURNING *
          `,
          [
            req.body.sabor !== undefined
              ? textoONull(
                  req.body.sabor
                )
              : actual.sabor,

            req.body.peso_gramos !==
            undefined
              ? enteroPositivoONull(
                  req.body.peso_gramos
                )
              : actual.peso_gramos,

            precio,
            stock,

            req.body.sku !== undefined
              ? textoONull(
                  req.body.sku
                )
              : actual.sku,

            req.body.activo !== undefined
              ? convertirBooleano(
                  req.body.activo
                )
              : actual.activo,

            varianteId
          ]
        );

      await sincronizarProductoLegacy(
        cliente,
        actual.producto_id
      );

      await cliente.query("COMMIT");

      res.json({
        mensaje:
          "Variante actualizada correctamente.",

        variante:
          convertirVariante(
            resultado.rows[0]
          )
      });
    } catch (error) {
      await cliente.query(
        "ROLLBACK"
      );

      console.error(
        "Error al actualizar variante:",
        error
      );

      if (error.code === "23505") {
        return res.status(400).json({
          error:
            "Ya existe una variante con ese sabor y peso para este producto, o el SKU ya está en uso."
        });
      }

      res.status(500).json({
        error:
          "Error al actualizar variante."
      });
    } finally {
      cliente.release();
    }
  }
);

/* ==================================================
   ADMIN - DESACTIVAR VARIANTE
   DELETE /api/admin/variantes/:varianteId
================================================== */

router.delete(
  "/admin/variantes/:varianteId",
  async (req, res) => {
    const varianteId =
      Number(
        req.params.varianteId
      );

    if (
      !Number.isInteger(varianteId) ||
      varianteId <= 0
    ) {
      return res.status(400).json({
        error:
          "La variante no es válida."
      });
    }

    const cliente =
      await db.connect();

    try {
      await cliente.query("BEGIN");

      const resultado =
        await cliente.query(
          `
            UPDATE producto_variantes

            SET activo = FALSE

            WHERE id = $1

            RETURNING
              id,
              producto_id
          `,
          [varianteId]
        );

      if (
        resultado.rows.length === 0
      ) {
        await cliente.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Variante no encontrada."
        });
      }

      const productoId =
        resultado.rows[0]
          .producto_id;

      await sincronizarProductoLegacy(
        cliente,
        productoId
      );

      await cliente.query("COMMIT");

      res.json({
        mensaje:
          "Variante desactivada correctamente."
      });
    } catch (error) {
      await cliente.query(
        "ROLLBACK"
      );

      console.error(
        "Error al desactivar variante:",
        error
      );

      res.status(500).json({
        error:
          "Error al desactivar variante."
      });
    } finally {
      cliente.release();
    }
  }
);

/* ==================================================
   ADMIN - ELIMINAR PRODUCTO
   DELETE /api/admin/productos/:id
================================================== */

router.delete(
  "/admin/productos/:id",
  async (req, res) => {
    const productoId =
      Number(req.params.id);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return res.status(400).json({
        error:
          "El producto no es válido."
      });
    }

    try {
      const resultado =
        await db.query(
          `
            DELETE FROM productos

            WHERE id = $1

            RETURNING id
          `,
          [productoId]
        );

      if (
        resultado.rows.length === 0
      ) {
        return res.status(404).json({
          error:
            "Producto no encontrado."
        });
      }

      res.json({
        mensaje:
          "Producto eliminado correctamente."
      });
    } catch (error) {
      console.error(
        "Error al eliminar producto:",
        error
      );

      if (error.code === "23503") {
        return res.status(409).json({
          error:
            "No se puede eliminar porque el producto está relacionado con un carrito o una orden. Podés despublicarlo desde Editar."
        });
      }

      res.status(500).json({
        error:
          "Error al eliminar producto."
      });
    }
  }
);

module.exports = router;
