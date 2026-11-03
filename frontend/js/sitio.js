/* ==================================================
   KRATOS — DATOS DEL NEGOCIO, REDES Y ANALÍTICA
   Se usa en todas las páginas públicas.
   Los datos vienen de /api/config (archivo .env).
================================================== */

(() => {

  let configSitio = null;

  async function obtenerConfigSitio() {
    if (configSitio) return configSitio;

    try {
      const respuesta = await fetch("/api/config");
      configSitio = await respuesta.json();
    } catch (error) {
      console.error(
        "No se pudo cargar la configuración del sitio:",
        error
      );

      configSitio = {};
    }

    return configSitio;
  }

  /* ==================================================
     DATOS DEL NEGOCIO EN LA PÁGINA
     <span data-negocio="razonSocial"></span>
  ================================================== */

  function completarDatosNegocio(negocio = {}) {
    document
      .querySelectorAll("[data-negocio]")
      .forEach((elemento) => {
        const valor =
          negocio[elemento.dataset.negocio];

        if (valor) {
          elemento.textContent = valor;
        }
      });
  }

  /* ==================================================
     REDES SOCIALES Y WHATSAPP
     <a data-red="instagramUrl" href="#">
  ================================================== */

  function completarRedes(negocio = {}) {
    document
      .querySelectorAll("[data-red]")
      .forEach((enlace) => {
        const url = negocio[enlace.dataset.red];

        if (!url) return;

        enlace.href = url;
        enlace.target = "_blank";
        enlace.rel = "noopener";
      });
  }

  /* ==================================================
     ANALÍTICA (solo si hay IDs cargados)
  ================================================== */

  function cargarScript(src) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function iniciarGoogleAnalytics(gaId) {
    window.dataLayer = window.dataLayer || [];

    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", gaId);

    cargarScript(
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
    );
  }

  function iniciarMetaPixel(pixelId) {
    /* Código oficial de Meta, sin minificar */
    const fbq = function () {
      fbq.callMethod
        ? fbq.callMethod.apply(fbq, arguments)
        : fbq.queue.push(arguments);
    };

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    window.fbq = fbq;
    window._fbq = fbq;

    cargarScript(
      "https://connect.facebook.net/en_US/fbevents.js"
    );

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }

  /*
    Evento de analítica para el resto del sitio:
    registrarEvento("add_to_cart", { value: 5000 })
  */
  const EVENTOS_META = {
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    purchase: "Purchase"
  };

  window.registrarEvento = function registrarEvento(nombre, datos = {}) {
    const parametros = {
      currency: "ARS",
      ...datos
    };

    window.gtag?.("event", nombre, parametros);

    if (EVENTOS_META[nombre]) {
      window.fbq?.("track", EVENTOS_META[nombre], parametros);
    }
  };

  window.obtenerConfigSitio = obtenerConfigSitio;

  /* ==================================================
     INICIO
  ================================================== */

  async function iniciarSitio() {
    const config = await obtenerConfigSitio();

    completarDatosNegocio(config.negocio);
    completarRedes(config.negocio);

    const analitica = config.analitica || {};

    if (analitica.gaId) {
      iniciarGoogleAnalytics(analitica.gaId);
    }

    if (analitica.metaPixelId) {
      iniciarMetaPixel(analitica.metaPixelId);
    }

    document.dispatchEvent(
      new CustomEvent("sitio:listo", { detail: config })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarSitio);
  } else {
    iniciarSitio();
  }

})();
