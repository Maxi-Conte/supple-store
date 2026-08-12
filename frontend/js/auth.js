/* ==================================================
   KRATOS — AUTENTICACIÓN
================================================== */


/* ==================================================
   USUARIO ACTUAL
================================================== */

function usuarioActual() {

  const raw =
    localStorage.getItem("usuario");

  if (!raw) {
    return null;
  }

  try {

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      "Error leyendo usuario guardado:",
      error
    );

    return null;
  }
}


/* ==================================================
   GUARDAR SESIÓN
================================================== */

function guardarSesion(usuario, token) {

  localStorage.setItem(
    "usuario",
    JSON.stringify(usuario)
  );

  localStorage.setItem(
    "token",
    token
  );

  actualizarBotonCuenta();
}


/* ==================================================
   CERRAR SESIÓN
================================================== */

function cerrarSesion() {

  localStorage.removeItem("usuario");
  localStorage.removeItem("token");

  actualizarBotonCuenta();
}


/* ==================================================
   BOTÓN DEL HEADER
================================================== */

function actualizarBotonCuenta() {

  const boton =
    document.getElementById(
      "btn-cuenta"
    );

  if (!boton) return;


  const usuario =
    usuarioActual();


  const texto =
    boton.querySelector(
      ".icon-btn__texto"
    );


  if (texto) {

    if (usuario) {

      const primerNombre =
        String(
          usuario.nombre || "Usuario"
        )
          .trim()
          .split(" ")[0];


      texto.textContent =
        `Hola, ${primerNombre}`;

    } else {

      texto.textContent =
        "Ingresar";
    }
  }


  boton.setAttribute(
    "aria-label",

    usuario
      ? "Cerrar sesión"
      : "Ingresar a mi cuenta"
  );
}


/* ==================================================
   MODAL DE AUTENTICACIÓN
================================================== */

function initAuthModal() {

  /* --------------------------------------------------
     ELEMENTOS
  -------------------------------------------------- */

  const modal =
    document.getElementById(
      "modal-auth"
    );

  const btnCuenta =
    document.getElementById(
      "btn-cuenta"
    );

  const btnCerrar =
    document.getElementById(
      "modal-auth-cerrar"
    );

  const form =
    document.getElementById(
      "form-auth"
    );

  const titulo =
    document.getElementById(
      "modal-auth-titulo"
    );

  const subtitulo =
    document.getElementById(
      "modal-auth-subtitulo"
    );

  const errorBox =
    document.getElementById(
      "modal-auth-error"
    );

  const exitoBox =
    document.getElementById(
      "modal-auth-exito"
    );

  const campoNombre =
    document.getElementById(
      "campo-nombre"
    );

  const inputNombre =
    document.getElementById(
      "campo-nombre-input"
    );

  const inputEmail =
    document.getElementById(
      "campo-email"
    );

  const campoPassword =
    document.getElementById(
      "campo-password-contenedor"
    );

  const inputPassword =
    document.getElementById(
      "campo-password"
    );

  const btnMostrarPassword =
    document.getElementById(
      "btn-mostrar-password"
    );

  const recuperacionLink =
    document.getElementById(
      "auth-recuperacion-link"
    );

  const btnOlvidePassword =
    document.getElementById(
      "btn-olvide-password"
    );

  const btnSubmit =
    document.getElementById(
      "btn-auth-submit"
    );

  const btnSwitch =
    document.getElementById(
      "btn-switch-modo"
    );


  if (
    !modal ||
    !btnCuenta ||
    !form
  ) {

    console.error(
      "No se encontraron los elementos del modal de autenticación."
    );

    return;
  }


  /* ==================================================
     ESTADO
  ================================================== */

  let modo = "login";


  /* ==================================================
     MENSAJES
  ================================================== */

  function limpiarMensajes() {

    if (errorBox) {

      errorBox.textContent = "";

      errorBox.classList.remove(
        "visible"
      );
    }


    if (exitoBox) {

      exitoBox.textContent = "";

      exitoBox.classList.remove(
        "visible"
      );
    }
  }


  function mostrarError(mensaje) {

    limpiarMensajes();

    if (!errorBox) return;

    errorBox.textContent =
      mensaje;

    errorBox.classList.add(
      "visible"
    );
  }


  function mostrarExito(mensaje) {

    limpiarMensajes();

    if (!exitoBox) return;

    exitoBox.textContent =
      mensaje;

    exitoBox.classList.add(
      "visible"
    );
  }


  /* ==================================================
     RENDER DEL MODAL
  ================================================== */

  function render() {

    limpiarMensajes();


    const esLogin =
      modo === "login";

    const esRegistro =
      modo === "registro";

    const esRecuperacion =
      modo === "recuperacion";


    /* Nombre */

    if (campoNombre) {
      campoNombre.hidden =
        !esRegistro;
    }

    if (inputNombre) {
      inputNombre.required =
        esRegistro;
    }


    /* Contraseña */

    if (campoPassword) {
      campoPassword.hidden =
        esRecuperacion;
    }

    if (inputPassword) {

      inputPassword.required =
        !esRecuperacion;

      inputPassword.autocomplete =
        esRegistro
          ? "new-password"
          : "current-password";
    }


    /* Recuperación */

    if (recuperacionLink) {
      recuperacionLink.hidden =
        !esLogin;
    }


    /* --------------------------------------------------
       LOGIN
    -------------------------------------------------- */

    if (esLogin) {

      titulo.textContent =
        "Ingresar";


      if (subtitulo) {

        subtitulo.textContent =
          "Accedé a tu cuenta para gestionar tus compras.";
      }


      btnSubmit.textContent =
        "Ingresar";


      if (btnSwitch) {

        btnSwitch.textContent =
          "¿No tenés cuenta? Registrate";

        btnSwitch.hidden =
          false;
      }
    }


    /* --------------------------------------------------
       REGISTRO
    -------------------------------------------------- */

    if (esRegistro) {

      titulo.textContent =
        "Crear cuenta";


      if (subtitulo) {

        subtitulo.textContent =
          "Creá tu cuenta para agilizar tus compras en KRATOS.";
      }


      btnSubmit.textContent =
        "Crear cuenta";


      if (btnSwitch) {

        btnSwitch.textContent =
          "¿Ya tenés cuenta? Ingresá";

        btnSwitch.hidden =
          false;
      }
    }


    /* --------------------------------------------------
       RECUPERAR CONTRASEÑA
    -------------------------------------------------- */

    if (esRecuperacion) {

      titulo.textContent =
        "Recuperar contraseña";


      if (subtitulo) {

        subtitulo.textContent =
          "Ingresá el correo asociado a tu cuenta y te enviaremos un enlace para crear una nueva contraseña.";
      }


      btnSubmit.textContent =
        "Enviar enlace";


      if (btnSwitch) {

        btnSwitch.textContent =
          "← Volver a ingresar";

        btnSwitch.hidden =
          false;
      }
    }
  }


  /* ==================================================
     ABRIR MODAL
  ================================================== */

  function abrirModal() {

    modo = "login";

    form.reset();

    render();


    modal.classList.add(
      "abierto"
    );


    /*
      IMPORTANTE:
      al abrir el modal ya no está oculto
      para tecnologías de asistencia.
    */

    modal.setAttribute(
      "aria-hidden",
      "false"
    );


    modal.removeAttribute(
      "inert"
    );


    /*
      Mandamos el foco al email.
    */

    setTimeout(() => {

      inputEmail?.focus();

    }, 50);
  }


  /* ==================================================
     CERRAR MODAL
  ================================================== */

  function cerrarModal() {

    /*
      Antes de poner aria-hidden=true,
      sacamos el foco de cualquier elemento
      que esté dentro del modal.

      Esto elimina el warning que viste
      en Chrome.
    */

    if (
      modal.contains(
        document.activeElement
      )
    ) {

      document.activeElement.blur();
    }


    modal.classList.remove(
      "abierto"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    modal.setAttribute(
      "inert",
      ""
    );


    form.reset();

    limpiarMensajes();


    /*
      Devolvemos foco al botón Cuenta.
    */

    btnCuenta.focus();
  }


  /* ==================================================
     BOTÓN CUENTA
  ================================================== */

  btnCuenta.addEventListener(
    "click",
    () => {

      /*
        Por ahora conservamos el comportamiento
        actual: si hay sesión, cerrar sesión.
      */

      if (usuarioActual()) {

        cerrarSesion();

        return;
      }


      abrirModal();
    }
  );


  /* ==================================================
     CERRAR
  ================================================== */

  btnCerrar?.addEventListener(
    "click",
    cerrarModal
  );


  /*
    Cerrar haciendo clic fuera de la tarjeta.
  */

  modal.addEventListener(
    "click",
    (evento) => {

      if (
        evento.target === modal
      ) {

        cerrarModal();
      }
    }
  );


  /*
    ESC.
  */

  document.addEventListener(
    "keydown",
    (evento) => {

      if (
        evento.key === "Escape" &&
        modal.classList.contains(
          "abierto"
        )
      ) {

        cerrarModal();
      }
    }
  );


  /* ==================================================
     LOGIN ↔ REGISTRO ↔ RECUPERACIÓN
  ================================================== */

  btnSwitch?.addEventListener(
    "click",
    () => {

      if (
        modo === "recuperacion"
      ) {

        modo = "login";

      } else if (
        modo === "login"
      ) {

        modo = "registro";

      } else {

        modo = "login";
      }


      form.reset();

      render();


      setTimeout(() => {

        if (
          modo === "registro"
        ) {

          inputNombre?.focus();

        } else {

          inputEmail?.focus();
        }

      }, 50);
    }
  );


  /* ==================================================
     ¿OLVIDASTE TU CONTRASEÑA?
  ================================================== */

  btnOlvidePassword
    ?.addEventListener(
      "click",
      () => {

        console.log(
          "Abriendo recuperación de contraseña"
        );


        modo =
          "recuperacion";


        /*
          Dejamos el email si el cliente
          ya lo había escrito.
        */

        if (inputPassword) {
          inputPassword.value = "";
        }


        render();


        inputEmail?.focus();
      }
    );


  /* ==================================================
     VER / OCULTAR PASSWORD
  ================================================== */

  btnMostrarPassword
    ?.addEventListener(
      "click",
      () => {

        if (!inputPassword) {
          return;
        }


        const mostrando =
          inputPassword.type ===
          "text";


        inputPassword.type =
          mostrando
            ? "password"
            : "text";


        btnMostrarPassword.textContent =
          mostrando
            ? "Ver"
            : "Ocultar";


        btnMostrarPassword.setAttribute(
          "aria-label",

          mostrando
            ? "Mostrar contraseña"
            : "Ocultar contraseña"
        );
      }
    );


  /* ==================================================
     SUBMIT
  ================================================== */

  form.addEventListener(
    "submit",
    async (evento) => {

      evento.preventDefault();

      limpiarMensajes();


      const email =
        String(
          inputEmail?.value || ""
        )
          .trim()
          .toLowerCase();


      const password =
        String(
          inputPassword?.value || ""
        );


      const nombre =
        String(
          inputNombre?.value || ""
        )
          .trim();


      /* ==================================================
         VALIDACIONES
      ================================================== */

      if (!email) {

        mostrarError(
          "Ingresá tu correo electrónico."
        );

        inputEmail?.focus();

        return;
      }


      if (
        modo !== "recuperacion" &&
        !password
      ) {

        mostrarError(
          "Ingresá tu contraseña."
        );

        return;
      }


      if (
        modo === "registro" &&
        !nombre
      ) {

        mostrarError(
          "Ingresá tu nombre."
        );

        return;
      }


      const textoOriginal =
        btnSubmit.textContent;


      btnSubmit.disabled =
        true;


      /* ==================================================
         RECUPERACIÓN
      ================================================== */

      if (
        modo === "recuperacion"
      ) {

        try {

          btnSubmit.textContent =
            "Enviando enlace...";


          console.log(
            "Solicitando recuperación para:",
            email
          );


          const data =
            await api.post(
              "/auth/solicitar-recuperacion",
              {
                email
              }
            );


          mostrarExito(
            data.mensaje ||
            "Revisá tu correo para continuar."
          );


          btnSubmit.textContent =
            "Enlace enviado";


        } catch (error) {

          console.error(
            "Error solicitando recuperación:",
            error
          );


          mostrarError(
            error.message ||
            "No se pudo enviar el enlace."
          );


          btnSubmit.textContent =
            textoOriginal;

        } finally {

          btnSubmit.disabled =
            false;
        }


        return;
      }


      /* ==================================================
         LOGIN / REGISTRO
      ================================================== */

      try {

        const esRegistro =
          modo === "registro";


        btnSubmit.textContent =
          esRegistro
            ? "Creando cuenta..."
            : "Ingresando...";


        const payload =
          esRegistro
            ? {
                nombre,
                email,
                password
              }
            : {
                email,
                password
              };


        const ruta =
          esRegistro
            ? "/auth/registro"
            : "/auth/login";


        const data =
          await api.post(
            ruta,
            payload
          );


        guardarSesion(
          data.usuario,
          data.token
        );


        cerrarModal();


      } catch (error) {

        console.error(
          "Error de autenticación:",
          error
        );


        mostrarError(
          error.message ||
          "No se pudo completar la operación."
        );


        btnSubmit.textContent =
          textoOriginal;


      } finally {

        btnSubmit.disabled =
          false;
      }
    }
  );


  /* ==================================================
     ESTADO INICIAL
  ================================================== */

  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  modal.setAttribute(
    "inert",
    ""
  );


  actualizarBotonCuenta();
}


/* ==================================================
   INICIAR
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  initAuthModal
);