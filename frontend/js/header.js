/* ==================================================
   KRATOS — HEADER
   - Sombra al bajar por la página
   - Tecla "/" para ir al buscador
   - El buscador muestra lo que se buscó
================================================== */

(() => {
  const header = document.querySelector(".header");
  const input = document.getElementById("input-busqueda");

  if (header) {
    const actualizar = () => {
      header.classList.toggle(
        "header--scroll",
        window.scrollY > 8
      );
    };

    window.addEventListener("scroll", actualizar, { passive: true });
    actualizar();
  }

  /* Categorías que no entran: aviso visual de que se deslizan */
  const nav = document.getElementById("categorias-nav");

  if (nav) {
    const revisarDesborde = () => {
      const desborda =
        nav.scrollWidth > nav.clientWidth + 2;

      nav.classList.toggle(
        "categorias-nav--desborda",
        desborda
      );

      nav.classList.toggle(
        "categorias-nav--al-final",
        desborda &&
          nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2
      );
    };

    nav.addEventListener("scroll", revisarDesborde, { passive: true });
    window.addEventListener("resize", revisarDesborde);

    /* Las categorías llegan después desde la API */
    new MutationObserver(revisarDesborde).observe(nav, { childList: true });

    revisarDesborde();

    /* Si la categoría elegida quedó fuera de vista, la mostramos */
    new MutationObserver(() => {
      nav.querySelector("a.activo")?.scrollIntoView({
        block: "nearest",
        inline: "center"
      });
    }).observe(nav, { childList: true });
  }

  if (!input) return;

  const buscado = new URLSearchParams(
    window.location.search
  ).get("buscar");

  if (buscado) {
    input.value = buscado;
  }

  document.addEventListener("keydown", (evento) => {
    const enCampo = evento.target.closest?.(
      "input, textarea, select, [contenteditable]"
    );

    if (
      evento.key === "/" &&
      !enCampo &&
      !evento.ctrlKey &&
      !evento.metaKey &&
      input.offsetParent !== null
    ) {
      evento.preventDefault();
      input.focus();
    }

    if (
      evento.key === "Escape" &&
      document.activeElement === input
    ) {
      input.blur();
    }
  });
})();
