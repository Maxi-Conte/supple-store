/* ==================================================
   RESTABLECER CONTRASEÑA
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const formulario =
      document.getElementById(
        "form-reset-password"
      );


    const passwordInput =
      document.getElementById(
        "reset-password"
      );


    const confirmarInput =
      document.getElementById(
        "reset-password-confirmar"
      );


    const boton =
      document.getElementById(
        "btn-reset-password"
      );


    const errorBox =
      document.getElementById(
        "reset-error"
      );


    const exitoBox =
      document.getElementById(
        "reset-exito"
      );


    const finalizado =
      document.getElementById(
        "reset-finalizado"
      );


    const descripcion =
      document.getElementById(
        "reset-descripcion"
      );


    /* ==================================================
       OBTENER TOKEN DEL ENLACE
    ================================================== */

    const parametros =
      new URLSearchParams(
        window.location.search
      );


    const token =
      parametros.get("token");


    /* ==================================================
       MENSAJES
    ================================================== */

    function limpiarMensajes() {

      errorBox.textContent = "";
      exitoBox.textContent = "";

      errorBox.classList.remove(
        "visible"
      );

      exitoBox.classList.remove(
        "visible"
      );

    }


    function mostrarError(
      mensaje
    ) {

      limpiarMensajes();

      errorBox.textContent =
        mensaje;

      errorBox.classList.add(
        "visible"
      );

    }


    function mostrarExito(
      mensaje
    ) {

      limpiarMensajes();

      exitoBox.textContent =
        mensaje;

      exitoBox.classList.add(
        "visible"
      );

    }


    /* ==================================================
       VER / OCULTAR PASSWORD
    ================================================== */

    document
      .querySelectorAll(
        "[data-password-target]"
      )
      .forEach((botonVer) => {

        botonVer.addEventListener(
          "click",
          () => {

            const idInput =
              botonVer.dataset
                .passwordTarget;


            const input =
              document.getElementById(
                idInput
              );


            if (!input) {
              return;
            }


            const estaVisible =
              input.type === "text";


            input.type =
              estaVisible
                ? "password"
                : "text";


            botonVer.textContent =
              estaVisible
                ? "Ver"
                : "Ocultar";


            botonVer.setAttribute(
              "aria-label",

              estaVisible
                ? "Mostrar contraseña"
                : "Ocultar contraseña"
            );

          }
        );

      });


    /* ==================================================
       VALIDAR TOKEN
    ================================================== */

    if (!token) {

      mostrarError(
        "El enlace de recuperación no es válido."
      );


      formulario.hidden =
        true;


      descripcion.textContent =
        "No encontramos un token de recuperación en este enlace.";


      return;
    }


    /* ==================================================
       ENVIAR NUEVA CONTRASEÑA
    ================================================== */

    formulario.addEventListener(
      "submit",
      async (evento) => {

        evento.preventDefault();

        limpiarMensajes();


        const password =
          passwordInput.value;


        const confirmacion =
          confirmarInput.value;


        /* ----------------------------------------------
           VALIDACIÓN
        ---------------------------------------------- */

        if (
          password.length < 6
        ) {

          mostrarError(
            "La contraseña debe tener al menos 6 caracteres."
          );

          return;
        }


        if (
          password !==
          confirmacion
        ) {

          mostrarError(
            "Las contraseñas no coinciden."
          );

          confirmarInput.focus();

          return;
        }


        const textoOriginal =
          boton.textContent;


        boton.disabled =
          true;


        boton.textContent =
          "Actualizando contraseña...";


        try {

          /* --------------------------------------------
             BACKEND
          -------------------------------------------- */

          const data =
            await api.post(
              "/auth/restablecer-password",
              {
                token,
                password
              }
            );


          mostrarExito(
            data.mensaje ||
            "La contraseña fue actualizada."
          );


          /*
            Ocultamos el formulario.
          */

          formulario.hidden =
            true;


          /*
            Mostramos pantalla final.
          */

          finalizado.hidden =
            false;


          /*
            Sacamos el token de la URL para no
            dejarlo visible en el navegador.
          */

          window.history.replaceState(
            {},
            document.title,
            "/restablecer-password.html"
          );


        } catch (error) {

          mostrarError(
            error.message ||
            "No se pudo actualizar la contraseña."
          );


          boton.disabled =
            false;


          boton.textContent =
            textoOriginal;

        }

      }
    );

  }
);