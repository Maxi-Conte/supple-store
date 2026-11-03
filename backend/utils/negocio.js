/* ==================================================
   DATOS PÚBLICOS DEL NEGOCIO, CONTACTO Y ANALÍTICA
   Todo se completa desde el archivo .env
================================================== */

function env(nombre) {
  return String(process.env[nombre] || "").trim();
}

function obtenerConfigNegocio() {
  const whatsapp = env("NEGOCIO_WHATSAPP").replace(/\D/g, "");

  return {
    negocio: {
      nombre: env("NEGOCIO_NOMBRE") || "KRATOS",
      razonSocial: env("NEGOCIO_RAZON_SOCIAL"),
      cuit: env("NEGOCIO_CUIT"),
      domicilio: env("NEGOCIO_DOMICILIO"),
      email: env("NEGOCIO_EMAIL") || env("MAIL_TIENDA"),
      whatsapp,
      whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}` : "",
      instagramUrl: env("NEGOCIO_INSTAGRAM_URL"),
      facebookUrl: env("NEGOCIO_FACEBOOK_URL"),
      tiktokUrl: env("NEGOCIO_TIKTOK_URL")
    },

    analitica: {
      /* Google Analytics 4: G-XXXXXXXXXX */
      gaId: /^G-[A-Z0-9]+$/.test(env("GA_MEASUREMENT_ID"))
        ? env("GA_MEASUREMENT_ID")
        : "",

      /* Meta (Facebook / Instagram) Pixel: solo números */
      metaPixelId: /^\d+$/.test(env("META_PIXEL_ID"))
        ? env("META_PIXEL_ID")
        : ""
    }
  };
}

module.exports = {
  obtenerConfigNegocio
};
