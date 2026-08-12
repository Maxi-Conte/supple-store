document.addEventListener(
  "DOMContentLoaded",
  iniciarMenuMobile
);


function iniciarMenuMobile() {

  /* =========================================
     ELEMENTOS DEL MENÚ
  ========================================= */

  const btnAbrir =
    document.getElementById(
      "btnMenuMobile"
    );


  const btnCerrar =
    document.getElementById(
      "btnCerrarMenuMobile"
    );


  const menuMobile =
    document.getElementById(
      "menuMobile"
    );


  const overlay =
    document.getElementById(
      "menuMobileOverlay"
    );


  const categoriasEscritorio =
    document.getElementById(
      "categorias-nav"
    );


  const categoriasMobile =
    document.getElementById(
      "menuMobileCategorias"
    );


  const btnVerProductos =
    document.querySelector(
      ".menu-mobile__ver-productos"
    );


  /*
    Si falta alguno de los elementos principales,
    detenemos el código para evitar errores.
  */

  if (
    !btnAbrir ||
    !btnCerrar ||
    !menuMobile ||
    !overlay ||
    !categoriasMobile
  ) {

    console.warn(
      "No se encontraron todos los elementos del menú móvil."
    );

    return;

  }


  /* =========================================
     ABRIR MENÚ
  ========================================= */

  function abrirMenu() {

    copiarCategorias();


    menuMobile.classList.add(
      "abierto"
    );


    overlay.classList.add(
      "abierto"
    );


    document.body.classList.add(
      "menu-mobile-abierto"
    );


    menuMobile.setAttribute(
      "aria-hidden",
      "false"
    );


    overlay.setAttribute(
      "aria-hidden",
      "false"
    );


    btnAbrir.setAttribute(
      "aria-expanded",
      "true"
    );


    btnCerrar.focus();

  }


  /* =========================================
     CERRAR MENÚ
  ========================================= */

  function cerrarMenu() {

    menuMobile.classList.remove(
      "abierto"
    );


    overlay.classList.remove(
      "abierto"
    );


    document.body.classList.remove(
      "menu-mobile-abierto"
    );


    menuMobile.setAttribute(
      "aria-hidden",
      "true"
    );


    overlay.setAttribute(
      "aria-hidden",
      "true"
    );


    btnAbrir.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  /* =========================================
     COPIAR CATEGORÍAS
  ========================================= */

  function copiarCategorias() {

    if (!categoriasEscritorio) {

      categoriasMobile.innerHTML = `
        <p class="menu-mobile__sin-categorias">
          No se pudieron cargar las categorías.
        </p>
      `;

      return;

    }


    const enlacesOriginales =
      categoriasEscritorio.querySelectorAll(
        "a"
      );


    if (enlacesOriginales.length === 0) {

      categoriasMobile.innerHTML = `
        <p class="menu-mobile__cargando">
          Cargando categorías...
        </p>
      `;

      return;

    }


    categoriasMobile.innerHTML = "";


    enlacesOriginales.forEach(
      enlaceOriginal => {

        const enlaceMobile =
          document.createElement(
            "a"
          );


        enlaceMobile.href =
          enlaceOriginal.getAttribute(
            "href"
          ) || "#grid-productos";


        enlaceMobile.textContent =
          enlaceOriginal.textContent.trim();


        enlaceMobile.classList.add(
          "menu-mobile__categoria"
        );


        /*
          Copiamos los atributos data-...
          que productos.js pueda utilizar.
        */

        Array.from(
          enlaceOriginal.attributes
        ).forEach(
          atributo => {

            if (
              atributo.name.startsWith(
                "data-"
              )
            ) {

              enlaceMobile.setAttribute(
                atributo.name,
                atributo.value
              );

            }

          }
        );


        /*
          Copiamos la categoría activa.
        */

        if (
          enlaceOriginal.classList.contains(
            "activo"
          )
        ) {

          enlaceMobile.classList.add(
            "activo"
          );

        }


        /*
          Al tocar la categoría móvil,
          ejecutamos el enlace original.

          Esto conserva todos los eventos que
          productos.js ya haya agregado.
        */

        enlaceMobile.addEventListener(
          "click",
          evento => {

            evento.preventDefault();


            enlaceOriginal.click();


            cerrarMenu();


            setTimeout(
              () => {

                const catalogo =
                  document.getElementById(
                    "grid-productos"
                  );


                if (catalogo) {

                  catalogo.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                  });

                }

              },
              150
            );

          }
        );


        categoriasMobile.appendChild(
          enlaceMobile
        );

      }
    );

  }


  /* =========================================
     EVENTOS DEL MENÚ
  ========================================= */

  btnAbrir.addEventListener(
    "click",
    () => {

      const estaAbierto =
        menuMobile.classList.contains(
          "abierto"
        );


      if (estaAbierto) {

        cerrarMenu();

      } else {

        abrirMenu();

      }

    }
  );


  btnCerrar.addEventListener(
    "click",
    cerrarMenu
  );


  overlay.addEventListener(
    "click",
    cerrarMenu
  );


  /*
    Cerrar con la tecla Escape.
  */

  document.addEventListener(
    "keydown",
    evento => {

      if (
        evento.key === "Escape" &&
        menuMobile.classList.contains(
          "abierto"
        )
      ) {

        cerrarMenu();

        btnAbrir.focus();

      }

    }
  );


  /*
    Botón "Ver todos los productos".
  */

  if (btnVerProductos) {

    btnVerProductos.addEventListener(
      "click",
      () => {

        const primerEnlace =
          categoriasEscritorio
            ?.querySelector(
              "a"
            );


        /*
          Normalmente el primer enlace es
          "Todos" o "Todo el catálogo".
        */

        if (primerEnlace) {

          primerEnlace.click();

        }


        cerrarMenu();

      }
    );

  }


  /* =========================================
     OBSERVAR CATEGORÍAS
  ========================================= */

  /*
    productos.js carga las categorías después
    de consultar la API.

    MutationObserver detecta cuándo aparecen
    y actualiza el menú automáticamente.
  */

  if (categoriasEscritorio) {

    const observadorCategorias =
      new MutationObserver(
        copiarCategorias
      );


    observadorCategorias.observe(
      categoriasEscritorio,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "class"
        ]
      }
    );

  }


  /* =========================================
     CAMBIO A ESCRITORIO
  ========================================= */

  window.addEventListener(
    "resize",
    () => {

      if (
        window.innerWidth > 768 &&
        menuMobile.classList.contains(
          "abierto"
        )
      ) {

        cerrarMenu();

      }

    }
  );


  /* =========================================
     ESTADO INICIAL
  ========================================= */

  copiarCategorias();

}