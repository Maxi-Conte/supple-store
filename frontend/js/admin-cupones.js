
(() => {

const listaCupones =
    document.getElementById(
        "listaCupones"
    );

const formCupon =
    document.getElementById(
        "formCupon"
    );

const btnNuevoCupon =
    document.getElementById(
        "btnNuevoCupon"
    );

const btnToggleCupones =
    document.getElementById(
        "btnToggleCupones"
    );

const contenidoCupones =
    document.getElementById(
        "contenidoCupones"
    );

const iconoToggleCupones =
    document.getElementById(
        "iconoToggleCupones"
    );


let cuponesAdmin = [];


/* =========================================
   FUNCIONES AUXILIARES
========================================= */

function escaparHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatearPrecioCupon(valor) {

    return new Intl.NumberFormat(
        "es-AR",
        {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0
        }
    ).format(Number(valor) || 0);

}


function describirDescuento(cupon) {

    return cupon.tipo === "porcentaje"
        ? `${cupon.valor} % de descuento`
        : `${formatearPrecioCupon(cupon.valor)} de descuento`;

}


function cuponVencido(cupon) {

    if (!cupon.vence_en) {
        return false;
    }

    const hoy =
        new Date().toISOString().slice(0, 10);

    return String(cupon.vence_en).slice(0, 10) < hoy;

}


async function obtenerRespuestaJSON(
    url,
    opciones = {}
) {

    const respuesta = await fetch(
        url,
        {
            credentials: "include",

            ...opciones,

            headers: {
                Accept: "application/json",
                ...(opciones.headers || {})
            }
        }
    );


    let datos = {};

    try {

        datos = await respuesta.json();

    } catch (error) {

        datos = {};

    }


    if (respuesta.status === 401) {

        window
            .manejarSesionAdminVencida
            ?.();

        return null;

    }


    if (!respuesta.ok) {

        throw new Error(
            datos.error ||
            "Ocurrió un error en la solicitud."
        );

    }


    return datos;

}


/* =========================================
   CARGAR CUPONES
========================================= */

async function cargarCuponesAdmin() {

    if (!listaCupones) {
        return;
    }


    listaCupones.innerHTML = `

        <div class="categorias-cargando">
            Cargando cupones...
        </div>

    `;


    try {

        const cupones =
            await obtenerRespuestaJSON(
                "/api/admin/cupones"
            );


        if (!cupones) {
            return;
        }


        cuponesAdmin = cupones;

        mostrarCuponesAdmin();

    } catch (error) {

        listaCupones.innerHTML = `

            <div class="categorias-error">
                ${escaparHTML(error.message)}
            </div>

        `;

    }

}


/* =========================================
   MOSTRAR CUPONES
========================================= */

function mostrarCuponesAdmin() {

    if (!listaCupones) {
        return;
    }


    if (cuponesAdmin.length === 0) {

        listaCupones.innerHTML = `

            <div class="categorias-vacias">

                Todavía no hay cupones creados.

            </div>

        `;

        return;

    }


    listaCupones.innerHTML =
        cuponesAdmin
            .map(cupon => {

                const vencido =
                    cuponVencido(cupon);

                const agotado =
                    cupon.usos_maximos !== null &&
                    cupon.usos >= cupon.usos_maximos;

                const disponible =
                    cupon.activo && !vencido && !agotado;

                const estadoTexto =
                    !cupon.activo
                        ? "Inactivo"
                        : vencido
                            ? "Vencido"
                            : agotado
                                ? "Agotado"
                                : "Activo";


                return `

                    <article
                        class="
                            categoria-admin
                            ${disponible ? "" : "categoria-admin--inactiva"}
                        "
                    >

                        <div class="categoria-admin__cabecera">

                            <div style="min-width: 0; overflow-wrap: anywhere;">

                                <span class="categoria-admin__orden">
                                    ${describirDescuento(cupon)}
                                </span>

                                <h3>
                                    ${escaparHTML(cupon.codigo)}
                                </h3>

                            </div>

                            <span
                                class="
                                    categoria-admin__estado
                                    ${
                                        disponible
                                            ? "categoria-admin__estado--activa"
                                            : "categoria-admin__estado--inactiva"
                                    }
                                "
                                style="flex-shrink: 0;"
                            >
                                ${estadoTexto}
                            </span>

                        </div>


                        <div class="categoria-admin__datos">

                            <p>
                                <strong>Usos:</strong>
                                ${cupon.usos}${
                                    cupon.usos_maximos !== null
                                        ? ` de ${cupon.usos_maximos}`
                                        : " (sin límite)"
                                }
                            </p>

                            <p>
                                <strong>Compra mínima:</strong>
                                ${
                                    cupon.minimo_compra > 0
                                        ? formatearPrecioCupon(cupon.minimo_compra)
                                        : "sin mínimo"
                                }
                            </p>

                            <p>
                                <strong>Vence:</strong>
                                ${
                                    cupon.vence_en
                                        ? new Date(
                                            `${String(cupon.vence_en).slice(0, 10)}T12:00:00`
                                        ).toLocaleDateString("es-AR")
                                        : "nunca"
                                }
                            </p>

                        </div>


                        <div class="categoria-admin__acciones">

                            <button
                                type="button"
                                class="
                                    btn-estado-categoria
                                    ${
                                        cupon.activo
                                            ? "btn-estado-categoria--desactivar"
                                            : "btn-estado-categoria--activar"
                                    }
                                "
                                data-id="${cupon.id}"
                            >
                                ${
                                    cupon.activo
                                        ? "⛔ Desactivar"
                                        : "✅ Activar"
                                }
                            </button>

                        </div>

                    </article>

                `;

            })
            .join("");

}


/* =========================================
   FORMULARIO NUEVO CUPÓN
========================================= */

function mostrarFormularioNuevoCupon() {

    if (!formCupon) {
        return;
    }


    formCupon.innerHTML = `

        <h2>
            Nuevo cupón
        </h2>


        <label for="cuponCodigo">
            Código (lo que escribe el cliente):
        </label>

        <input
            id="cuponCodigo"
            type="text"
            maxlength="40"
            autocomplete="off"
            placeholder="Ej: BIENVENIDA10"
            style="text-transform: uppercase;"
        >


        <label for="cuponTipo">
            Tipo de descuento:
        </label>

        <select id="cuponTipo">
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto fijo ($)</option>
        </select>


        <label for="cuponValor">
            Valor del descuento:
        </label>

        <input
            id="cuponValor"
            type="number"
            min="1"
            step="1"
            placeholder="Ej: 10"
        >


        <label for="cuponMinimo">
            Compra mínima en $ (opcional):
        </label>

        <input
            id="cuponMinimo"
            type="number"
            min="0"
            step="1"
            placeholder="0 = sin mínimo"
        >


        <label for="cuponUsos">
            Cantidad máxima de usos (opcional):
        </label>

        <input
            id="cuponUsos"
            type="number"
            min="1"
            step="1"
            placeholder="Vacío = sin límite"
        >


        <label for="cuponVence">
            Vence el (opcional):
        </label>

        <input
            id="cuponVence"
            type="date"
        >


        <div class="acciones-formulario">

            <button
                id="btnGuardarCupon"
                type="button"
            >
                Crear cupón
            </button>

            <button
                id="btnCerrarCupon"
                type="button"
                class="btn-cancelar"
            >
                Cerrar
            </button>

        </div>

    `;


    document
        .getElementById(
            "btnGuardarCupon"
        )
        .addEventListener(
            "click",
            guardarNuevoCupon
        );


    document
        .getElementById(
            "btnCerrarCupon"
        )
        .addEventListener(
            "click",
            cerrarFormularioCupon
        );


    document
        .getElementById(
            "cuponCodigo"
        )
        .focus();

}


function cerrarFormularioCupon() {

    if (!formCupon) {
        return;
    }


    formCupon.innerHTML = "";

}


async function guardarNuevoCupon() {

    const valorDe = id =>
        document
            .getElementById(id)
            .value
            .trim();


    const boton =
        document.getElementById(
            "btnGuardarCupon"
        );

    boton.disabled = true;


    try {

        const resultado =
            await obtenerRespuestaJSON(
                "/api/admin/cupones",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        codigo: valorDe("cuponCodigo"),
                        tipo: valorDe("cuponTipo"),
                        valor: valorDe("cuponValor"),
                        minimo_compra: valorDe("cuponMinimo"),
                        usos_maximos: valorDe("cuponUsos"),
                        vence_en: valorDe("cuponVence")
                    })
                }
            );


        if (!resultado) {
            return;
        }


        alert(resultado.mensaje);

        cerrarFormularioCupon();

        await cargarCuponesAdmin();

    } catch (error) {

        alert(error.message);

        boton.disabled = false;

    }

}


/* =========================================
   ACTIVAR O DESACTIVAR
========================================= */

async function cambiarEstadoCupon(cupon) {

    const activar = !cupon.activo;

    if (
        !confirm(
            `¿Querés ${activar ? "activar" : "desactivar"} el cupón ${cupon.codigo}?`
        )
    ) {
        return;
    }


    try {

        const resultado =
            await obtenerRespuestaJSON(
                `/api/admin/cupones/${cupon.id}/estado`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        activo: activar
                    })
                }
            );


        if (!resultado) {
            return;
        }


        await cargarCuponesAdmin();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================
   ABRIR Y CERRAR PANEL DE CUPONES
========================================= */

function alternarPanelCupones() {

    if (
        !btnToggleCupones ||
        !contenidoCupones
    ) {
        return;
    }

    const debeAbrirse =
        contenidoCupones.hidden;

    contenidoCupones.hidden =
        !debeAbrirse;

    btnToggleCupones.setAttribute(
        "aria-expanded",
        String(debeAbrirse)
    );

    btnToggleCupones.classList.toggle(
        "btn-categorias-toggle--abierto",
        debeAbrirse
    );

    if (iconoToggleCupones) {

        iconoToggleCupones.textContent =
            debeAbrirse
                ? "−"
                : "+";

    }

    if (debeAbrirse) {

        cargarCuponesAdmin();

    }

}


/* =========================================
   EVENTOS
========================================= */

btnToggleCupones
    ?.addEventListener(
        "click",
        alternarPanelCupones
    );


btnNuevoCupon
    ?.addEventListener(
        "click",
        mostrarFormularioNuevoCupon
    );


listaCupones
    ?.addEventListener(
        "click",
        evento => {

            const boton =
                evento.target.closest(
                    "button[data-id]"
                );


            if (!boton) {
                return;
            }


            const cupon =
                cuponesAdmin.find(
                    item =>
                        Number(item.id) ===
                        Number(boton.dataset.id)
                );


            if (cupon) {

                cambiarEstadoCupon(cupon);

            }

        }
    );

    })();
