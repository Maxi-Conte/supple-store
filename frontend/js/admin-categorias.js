
(() => {

console.log("Admin categorías cargado");


const listaCategorias =
    document.getElementById(
        "listaCategorias"
    );

const formCategoria =
    document.getElementById(
        "formCategoria"
    );

const btnNuevaCategoria =
    document.getElementById(
        "btnNuevaCategoria"
    );

const btnToggleCategorias =
    document.getElementById(
        "btnToggleCategorias"
    );

const contenidoCategorias =
    document.getElementById(
        "contenidoCategorias"
    );

const iconoToggleCategorias =
    document.getElementById(
        "iconoToggleCategorias"
    );    

const pantallaPanel =
    document.getElementById(
        "pantalla-panel"
    );


let categoriasAdmin = [];


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


function crearSlugCategoria(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

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
   CARGAR CATEGORÍAS
========================================= */

async function cargarCategoriasAdmin() {

    if (!listaCategorias) {
        return;
    }


    listaCategorias.innerHTML = `

        <div class="categorias-cargando">
            Cargando categorías...
        </div>

    `;


    try {

        const categorias =
            await obtenerRespuestaJSON(
                "/api/admin/categorias"
            );


        if (!categorias) {
            return;
        }


        categoriasAdmin = categorias;

        mostrarCategoriasAdmin();

    } catch (error) {

        console.error(
            "Error cargando categorías:",
            error
        );


        listaCategorias.innerHTML = `

            <div class="categorias-error">
                ${escaparHTML(error.message)}
            </div>

        `;

    }

}


/* =========================================
   MOSTRAR CATEGORÍAS
========================================= */

function mostrarCategoriasAdmin() {

    if (!listaCategorias) {
        return;
    }


    if (categoriasAdmin.length === 0) {

        listaCategorias.innerHTML = `

            <div class="categorias-vacias">

                Todavía no hay categorías creadas.

            </div>

        `;

        return;

    }


    listaCategorias.innerHTML =
        categoriasAdmin
            .map(categoria => {

                const estadoTexto =
                    categoria.activo
                        ? "Activa"
                        : "Inactiva";

                const botonEstado =
                    categoria.activo
                        ? "Desactivar"
                        : "Activar";

                const cantidadProductos =
                    Number(
                        categoria.cantidad_productos
                    ) || 0;


                return `

                    <article
                        class="
                            categoria-admin
                            ${
                                categoria.activo
                                    ? ""
                                    : "categoria-admin--inactiva"
                            }
                        "
                    >

                        <div class="categoria-admin__cabecera">

                            <div>

                                <span class="categoria-admin__orden">
                                    Categoría #${categoria.orden}
                                </span>

                                <h3>
                                    ${escaparHTML(categoria.nombre)}
                                </h3>

                            </div>

                            <span
                                class="
                                    categoria-admin__estado
                                    ${
                                        categoria.activo
                                            ? "categoria-admin__estado--activa"
                                            : "categoria-admin__estado--inactiva"
                                    }
                                "
                            >
                                ${estadoTexto}
                            </span>

                        </div>


                        <div class="categoria-admin__datos">

                            <p>
                                <strong>Slug:</strong>

                                <code>
                                    ${escaparHTML(categoria.slug)}
                                </code>
                            </p>

                            <p>
                                <strong>Productos:</strong>

                                ${cantidadProductos}
                            </p>

                        </div>


                        <div class="categoria-admin__acciones">

                            <button
                                type="button"
                                class="btn-editar-categoria"
                                data-accion="editar"
                                data-id="${categoria.id}"
                            >
                                ✏️ Editar
                            </button>

                            <button
                                type="button"
                                class="
                                    btn-estado-categoria
                                    ${
                                        categoria.activo
                                            ? "btn-estado-categoria--desactivar"
                                            : "btn-estado-categoria--activar"
                                    }
                                "
                                data-accion="estado"
                                data-id="${categoria.id}"
                            >
                                ${
                                    categoria.activo
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
   FORMULARIO NUEVA CATEGORÍA
========================================= */

function mostrarFormularioNuevaCategoria() {

    if (!formCategoria) {
        return;
    }


    formCategoria.innerHTML = `

        <h2>
            Agregar categoría
        </h2>


        <label for="nuevaCategoriaNombre">
            Nombre:
        </label>

        <input
            id="nuevaCategoriaNombre"
            type="text"
            placeholder="Ejemplo: Multivitamínicos"
            autocomplete="off"
        >


        <label for="nuevaCategoriaSlug">
            Slug:
        </label>

        <input
            id="nuevaCategoriaSlug"
            type="text"
            placeholder="multivitaminicos"
            autocomplete="off"
        >


        <label class="categoria-checkbox">

            <input
                id="nuevaCategoriaActiva"
                type="checkbox"
                checked
            >

            Mostrar categoría en la tienda

        </label>


        <div class="acciones-formulario">

            <button
                id="btnGuardarCategoria"
                type="button"
            >
                Guardar categoría
            </button>

            <button
                id="btnCancelarCategoria"
                type="button"
                class="btn-cancelar"
            >
                Cancelar
            </button>

        </div>

    `;


    const inputNombre =
        document.getElementById(
            "nuevaCategoriaNombre"
        );

    const inputSlug =
        document.getElementById(
            "nuevaCategoriaSlug"
        );


    let slugModificadoManualmente = false;


    inputSlug.addEventListener(
        "input",
        () => {

            slugModificadoManualmente = true;

        }
    );


    inputNombre.addEventListener(
        "input",
        () => {

            if (
                !slugModificadoManualmente
            ) {

                inputSlug.value =
                    crearSlugCategoria(
                        inputNombre.value
                    );

            }

        }
    );


    document
        .getElementById(
            "btnGuardarCategoria"
        )
        .addEventListener(
            "click",
            guardarNuevaCategoria
        );


    document
        .getElementById(
            "btnCancelarCategoria"
        )
        .addEventListener(
            "click",
            cerrarFormularioCategoria
        );


    inputNombre.focus();

}


/* =========================================
   GUARDAR NUEVA CATEGORÍA
========================================= */

async function guardarNuevaCategoria() {

    const nombre =
        document
            .getElementById(
                "nuevaCategoriaNombre"
            )
            .value
            .trim();

    const slug =
        document
            .getElementById(
                "nuevaCategoriaSlug"
            )
            .value
            .trim();

    const activo =
        document
            .getElementById(
                "nuevaCategoriaActiva"
            )
            .checked;


    if (!nombre) {

        alert(
            "Escribí el nombre de la categoría."
        );

        return;

    }


    try {

        const resultado =
            await obtenerRespuestaJSON(
                "/api/admin/categorias",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        nombre,
                        slug,
                        activo
                    })
                }
            );


        if (!resultado) {
            return;
        }


        alert(resultado.mensaje);


        cerrarFormularioCategoria();

        await actualizarCategoriasDelPanel();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================
   FORMULARIO EDITAR CATEGORÍA
========================================= */

function mostrarFormularioEditarCategoria(
    categoria
) {

    if (!formCategoria) {
        return;
    }


    formCategoria.innerHTML = `

        <h2>
            Editar categoría
        </h2>


        <label for="editarCategoriaNombre">
            Nombre:
        </label>

        <input
            id="editarCategoriaNombre"
            type="text"
            value="${escaparHTML(categoria.nombre)}"
            autocomplete="off"
        >


        <label for="editarCategoriaSlug">
            Slug:
        </label>

        <input
            id="editarCategoriaSlug"
            type="text"
            value="${escaparHTML(categoria.slug)}"
            autocomplete="off"
        >


        <div class="acciones-formulario">

            <button
                id="btnActualizarCategoria"
                type="button"
            >
                Guardar cambios
            </button>

            <button
                id="btnCancelarCategoria"
                type="button"
                class="btn-cancelar"
            >
                Cancelar
            </button>

        </div>

    `;


    document
        .getElementById(
            "btnActualizarCategoria"
        )
        .addEventListener(
            "click",
            () =>
                actualizarCategoria(
                    categoria.id
                )
        );


    document
        .getElementById(
            "btnCancelarCategoria"
        )
        .addEventListener(
            "click",
            cerrarFormularioCategoria
        );


    document
        .getElementById(
            "editarCategoriaNombre"
        )
        .focus();

}


/* =========================================
   ACTUALIZAR CATEGORÍA
========================================= */

async function actualizarCategoria(id) {

    const nombre =
        document
            .getElementById(
                "editarCategoriaNombre"
            )
            .value
            .trim();

    const slug =
        document
            .getElementById(
                "editarCategoriaSlug"
            )
            .value
            .trim();


    if (!nombre) {

        alert(
            "El nombre de la categoría es obligatorio."
        );

        return;

    }


    try {

        const resultado =
            await obtenerRespuestaJSON(
                `/api/admin/categorias/${id}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        nombre,
                        slug
                    })
                }
            );


        if (!resultado) {
            return;
        }


        alert(resultado.mensaje);


        cerrarFormularioCategoria();

        await actualizarCategoriasDelPanel();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================
   ACTIVAR O DESACTIVAR CATEGORÍA
========================================= */

async function cambiarEstadoCategoria(
    categoria
) {

    const nuevoEstado =
        !categoria.activo;


    const accion =
        nuevoEstado
            ? "activar"
            : "desactivar";


    let mensaje =
        `¿Querés ${accion} la categoría "${categoria.nombre}"?`;


    if (
        !nuevoEstado &&
        Number(
            categoria.cantidad_productos
        ) > 0
    ) {

        mensaje +=

            `\n\nSus ${categoria.cantidad_productos} productos dejarán de aparecer en la tienda, pero no serán eliminados.`;

    }


    const confirmar =
        confirm(mensaje);


    if (!confirmar) {
        return;
    }


    try {

        const resultado =
            await obtenerRespuestaJSON(
                `/api/admin/categorias/${categoria.id}/estado`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        activo: nuevoEstado
                    })
                }
            );


        if (!resultado) {
            return;
        }


        alert(resultado.mensaje);


        await actualizarCategoriasDelPanel();

    } catch (error) {

        alert(error.message);

    }

}


/* =========================================
   ACTUALIZAR SELECTORES Y LISTA
========================================= */

async function actualizarCategoriasDelPanel() {

    await cargarCategoriasAdmin();


    if (
        typeof window
            .cargarFiltroCategorias
        === "function"
    ) {

        await window
            .cargarFiltroCategorias();

    }

}


/* =========================================
   CERRAR FORMULARIO
========================================= */

function cerrarFormularioCategoria() {

    if (!formCategoria) {
        return;
    }


    formCategoria.innerHTML = "";

}


/* =========================================
   ABRIR Y CERRAR PANEL DE CATEGORÍAS
========================================= */

function alternarPanelCategorias() {

    if (
        !btnToggleCategorias ||
        !contenidoCategorias
    ) {
        return;
    }

    const debeAbrirse =
        contenidoCategorias.hidden;

    contenidoCategorias.hidden =
        !debeAbrirse;

    btnToggleCategorias.setAttribute(
        "aria-expanded",
        String(debeAbrirse)
    );

    btnToggleCategorias.classList.toggle(
        "btn-categorias-toggle--abierto",
        debeAbrirse
    );

    if (iconoToggleCategorias) {

        iconoToggleCategorias.textContent =
            debeAbrirse
                ? "−"
                : "+";

    }

}


/* =========================================
   EVENTOS
========================================= */

btnToggleCategorias
    ?.addEventListener(
        "click",
        alternarPanelCategorias
    );

btnNuevaCategoria
    ?.addEventListener(
        "click",
        mostrarFormularioNuevaCategoria
    );


listaCategorias
    ?.addEventListener(
        "click",
        evento => {

            const boton =
                evento.target.closest(
                    "button[data-accion]"
                );


            if (!boton) {
                return;
            }


            const id =
                Number(
                    boton.dataset.id
                );


            const categoria =
                categoriasAdmin.find(
                    item =>
                        Number(item.id) === id
                );


            if (!categoria) {
                return;
            }


            if (
                boton.dataset.accion ===
                "editar"
            ) {

                mostrarFormularioEditarCategoria(
                    categoria
                );

            }


            if (
                boton.dataset.accion ===
                "estado"
            ) {

                cambiarEstadoCategoria(
                    categoria
                );

            }

        }
    );


/* =========================================
   CARGAR AL MOSTRAR EL PANEL
========================================= */

function comprobarPanelVisible() {

    if (!pantallaPanel) {
        return;
    }


    const panelVisible =
        window
            .getComputedStyle(
                pantallaPanel
            )
            .display !== "none";


    if (panelVisible) {

        cargarCategoriasAdmin();

    }

}


if (pantallaPanel) {

    const observadorPanel =
        new MutationObserver(
            comprobarPanelVisible
        );


    observadorPanel.observe(
        pantallaPanel,
        {
            attributes: true,
            attributeFilter: [
                "style",
                "class"
            ]
        }
    );


    comprobarPanelVisible();

}


/* Disponible para otros archivos */

window.cargarCategoriasAdmin =
    cargarCategoriasAdmin;

    })();