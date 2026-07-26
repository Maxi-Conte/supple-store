/* ==================================================
   ELEMENTOS DEL PANEL
================================================== */

const pantallaLogin =
    document.getElementById("pantalla-login");

const pantallaPanel =
    document.getElementById("pantalla-panel");

const formularioLogin =
    document.getElementById("form-login-admin");

const mensajeError =
    document.getElementById("login-error");

const botonLogout =
    document.getElementById("btnLogout");

/* ==================================================
   MOSTRAR LOGIN
================================================== */

function mostrarLogin(mensaje = "") {

    if (pantallaLogin) {
        pantallaLogin.style.display = "flex";
    }

    if (pantallaPanel) {
        pantallaPanel.style.display = "none";
    }

    if (mensajeError) {
        mensajeError.textContent = mensaje;
    }

}

/* ==================================================
   MOSTRAR PANEL
================================================== */

function mostrarPanel() {

    if (pantallaLogin) {
        pantallaLogin.style.display = "none";
    }

    if (pantallaPanel) {
        pantallaPanel.style.display = "block";
    }

    if (mensajeError) {
        mensajeError.textContent = "";
    }

}

/* ==================================================
   VERIFICAR SESIÓN
================================================== */

async function verificarSesion() {

    try {

        const respuesta = await fetch(
            "/api/admin/sesion",
            {
                credentials: "include"
            }
        );

        if (!respuesta.ok) {

            mostrarLogin(
                "No se pudo verificar la sesión."
            );

            return;
        }

        const data = await respuesta.json();

        if (data.logueado) {

            mostrarPanel();

            if (
                typeof cargarProductos ===
                "function"
            ) {
                await cargarProductos();
            }

            return;
        }

        mostrarLogin();

    } catch (error) {

        console.error(
            "Error verificando sesión:",
            error
        );

        mostrarLogin(
            "No se pudo conectar con el servidor."
        );

    }

}

/* ==================================================
   INICIAR SESIÓN
================================================== */

formularioLogin?.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();

        const inputUsuario =
            document.getElementById(
                "admin-usuario"
            );

        const inputPassword =
            document.getElementById(
                "admin-password"
            );

        const usuario =
            inputUsuario.value.trim();

        const password =
            inputPassword.value;

        if (mensajeError) {
            mensajeError.textContent = "";
        }

        if (!usuario || !password) {

            if (mensajeError) {
                mensajeError.textContent =
                    "Completá usuario y contraseña.";
            }

            return;
        }

        const botonIngresar =
            formularioLogin.querySelector(
                'button[type="submit"]'
            );

        const textoOriginal =
            botonIngresar?.textContent;

        if (botonIngresar) {
            botonIngresar.disabled = true;
            botonIngresar.textContent =
                "Ingresando...";
        }

        try {

            const respuesta = await fetch(
                "/api/admin/login",
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        usuario,
                        password
                    })
                }
            );

            const data =
                await respuesta.json();

            if (!respuesta.ok) {

                if (mensajeError) {
                    mensajeError.textContent =
                        data.mensaje ||
                        data.error ||
                        "No se pudo iniciar sesión.";
                }

                return;
            }

            mostrarPanel();

            inputPassword.value = "";

            if (
                typeof cargarProductos ===
                "function"
            ) {
                await cargarProductos();
            }

        } catch (error) {

            console.error(
                "Error iniciando sesión:",
                error
            );

            if (mensajeError) {
                mensajeError.textContent =
                    "No se pudo conectar con el servidor.";
            }

        } finally {

            if (botonIngresar) {
                botonIngresar.disabled = false;
                botonIngresar.textContent =
                    textoOriginal;
            }

        }

    }
);

/* ==================================================
   CERRAR SESIÓN
================================================== */

botonLogout?.addEventListener(
    "click",
    async () => {

        botonLogout.disabled = true;

        try {

            await fetch(
                "/api/admin/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );

        } finally {

            mostrarLogin();

            botonLogout.disabled = false;

            if (formularioLogin) {
                formularioLogin.reset();
            }

        }

    }
);

/* ==================================================
   EXPULSAR AL ADMIN SI LA SESIÓN VENCIÓ
================================================== */

window.manejarSesionAdminVencida =
    function () {

        mostrarLogin(
            "Tu sesión venció. Iniciá sesión nuevamente."
        );

        if (formularioLogin) {
            formularioLogin.reset();
        }

    };

/* ==================================================
   INICIALIZACIÓN
================================================== */

verificarSesion();