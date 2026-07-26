async function verificarSesion() {

    const res = await fetch("/api/admin/sesion", {
        credentials: "include"
    });

    const data = await res.json();

    if (data.logueado) {

        document.getElementById("pantalla-login").style.display = "none";
        document.getElementById("pantalla-panel").style.display = "block";

        if (typeof cargarProductos === "function") {
            cargarProductos();
        }

    }

}

verificarSesion();

document
    .getElementById("form-login-admin")
    .addEventListener("submit", async (e) => {

        e.preventDefault();

        const usuario =
            document.getElementById("admin-usuario").value;

        const password =
            document.getElementById("admin-password").value;

        const error =
            document.getElementById("login-error");

        error.textContent = "";

        const res = await fetch("/api/admin/login", {

            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                usuario,
                password

            })

        });

        const data = await res.json();

        if (!res.ok) {

            error.textContent = data.mensaje;
            return;

        }

        document.getElementById("pantalla-login").style.display = "none";
        document.getElementById("pantalla-panel").style.display = "block";

        if (typeof cargarProductos === "function") {
            cargarProductos();
        }

    });

document
    .getElementById("btnLogout")
    .addEventListener("click", async () => {

        await fetch("/api/admin/logout", {

            method: "POST",

            credentials: "include"

        });


        location.reload();

    });