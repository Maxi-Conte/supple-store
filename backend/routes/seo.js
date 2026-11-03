const express = require("express");
const db = require("../db/database");

const router = express.Router();

function urlBase(req) {
  const configurada = String(
    process.env.FRONTEND_URL || ""
  ).trim().replace(/\/+$/, "");

  return configurada || `${req.protocol}://${req.get("host")}`;
}

/* ==================================================
   ROBOTS.TXT
================================================== */

router.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Disallow: /admin.html",
      "Disallow: /api/",
      "Disallow: /restablecer-password.html",
      "Disallow: /pago-exitoso.html",
      "Disallow: /pago-fallido.html",
      "Disallow: /pago-pendiente.html",
      "",
      `Sitemap: ${urlBase(req)}/sitemap.xml`,
      ""
    ].join("\n")
  );
});

/* ==================================================
   SITEMAP.XML
   Inicio, categorías activas y páginas legales
================================================== */

router.get("/sitemap.xml", async (req, res) => {
  const base = urlBase(req);

  const rutas = [
    "/",
    "/terminos.html",
    "/privacidad.html",
    "/cambios-y-devoluciones.html",
    "/arrepentimiento.html"
  ];

  try {
    const categorias = await db.query(`
      SELECT slug
      FROM categorias
      WHERE activo = TRUE
      ORDER BY orden ASC
    `);

    categorias.rows.forEach((categoria) => {
      rutas.push(
        `/?categoria=${encodeURIComponent(categoria.slug)}`
      );
    });
  } catch (error) {
    console.error(
      "No se pudieron leer las categorías para el sitemap:",
      error.message
    );
  }

  const urls = rutas
    .map((ruta) =>
      `  <url><loc>${base}${ruta.replaceAll("&", "&amp;")}</loc></url>`
    )
    .join("\n");

  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
});

module.exports = router;
