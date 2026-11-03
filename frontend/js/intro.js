/* ==================================================
   KRATOS — ANIMACIÓN DE ENTRADA
   Completa la primera vez en la visita y más rápida al
   recargar (la clase la pone el script del <head>).
   Se puede saltar con un clic, tocando o con una tecla.
================================================== */

(() => {
  const intro = document.getElementById("intro");

  if (!intro) return;

  const raiz = document.documentElement;

  if (raiz.classList.contains("sin-intro")) {
    intro.remove();
    return;
  }

  try {
    sessionStorage.setItem("kratos-intro", "1");
  } catch (error) {
    /* Sin almacenamiento: se vuelve a mostrar en la próxima carga */
  }

  /*
    El logo tiene fondo oscuro. Lo volvemos transparente en un
    canvas: lo oscuro desaparece y lo plateado queda visible.
    Si falla, se usa la imagen original con el borde difuminado.
  */
  function quitarFondoLogo() {
    const logo = intro.querySelector(".intro__logo");

    if (!logo) return;

    const procesar = () => {
      try {
        const ancho = 600;
        const alto = Math.round(
          ancho * (logo.naturalHeight / logo.naturalWidth)
        );

        const canvas = document.createElement("canvas");
        canvas.width = ancho;
        canvas.height = alto;

        const contexto = canvas.getContext("2d");
        contexto.drawImage(logo, 0, 0, ancho, alto);

        const imagen = contexto.getImageData(0, 0, ancho, alto);
        const pixeles = imagen.data;

        for (let i = 0; i < pixeles.length; i += 4) {
          const brillo = Math.max(
            pixeles[i],
            pixeles[i + 1],
            pixeles[i + 2]
          );

          /* Hasta 45 es fondo; desde 130 es logo */
          const alfa = Math.min(
            Math.max((brillo - 45) / 85, 0),
            1
          );

          pixeles[i + 3] = Math.round(alfa * 255);
        }

        contexto.putImageData(imagen, 0, 0);

        logo.src = canvas.toDataURL("image/png");
      } catch (error) {
        /* Se queda la imagen original */
      }
    };

    if (logo.complete && logo.naturalWidth) {
      procesar();
    } else {
      logo.addEventListener("load", procesar, { once: true });
    }
  }

  quitarFondoLogo();

  let terminada = false;

  function terminar() {
    if (terminada) return;

    terminada = true;

    raiz.classList.remove("intro-activa", "intro-rapida");
    intro.remove();

    document.removeEventListener("keydown", saltar);
  }

  function saltar() {
    if (terminada) return;

    intro.classList.add("intro--saltar");
  }

  intro.addEventListener("animationend", (evento) => {
    if (
      evento.target === intro &&
      evento.animationName === "intro-salida"
    ) {
      terminar();
    }
  });

  intro.addEventListener("click", saltar);
  document.addEventListener("keydown", saltar);

  /* Por si el navegador no dispara animationend (pestaña en segundo plano) */
  setTimeout(terminar, 5000);
})();
