
(() => {

const listaPedidos =
    document.getElementById(
        "listaPedidos"
    );

const formPedido =
    document.getElementById(
        "formPedido"
    );

const filtroPedidos =
    document.getElementById(
        "filtroPedidos"
    );

const btnTogglePedidos =
    document.getElementById(
        "btnTogglePedidos"
    );

const contenidoPedidos =
    document.getElementById(
        "contenidoPedidos"
    );

const iconoTogglePedidos =
    document.getElementById(
        "iconoTogglePedidos"
    );


let pedidosAdmin = [];


const ESTADOS = {
    pendiente: "Pago pendiente",
    rechazado: "Pago rechazado",
    pagado: "Pagado · sin preparar",
    preparando: "Preparando",
    enviado: "Enviado",
    listo_retiro: "Listo para retirar",
    entregado: "Entregado",
    cancelado: "Cancelado"
};

/* Estados que muestran la etiqueta "apagada" */
const ESTADOS_CERRADOS = [
    "pendiente",
    "rechazado",
    "entregado",
    "cancelado"
];

const ESTADOS_CON_PAGO = [
    "pagado",
    "preparando",
    "enviado",
    "listo_retiro",
    "entregado"
];


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


function formatearPrecioPedido(valor) {

    return new Intl.NumberFormat(
        "es-AR",
        {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0
        }
    ).format(Number(valor) || 0);

}


function formatearFechaPedido(fecha) {

    return new Date(fecha).toLocaleString(
        "es-AR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}


function describirItemPedido(item) {

    const peso =
        Number(item.peso_gramos);

    const pesoTexto = !peso
        ? ""
        : peso >= 1000
            ? `${peso / 1000} kg`
            : `${peso} g`;

    return [
        item.nombre_producto,
        item.sabor,
        pesoTexto
    ]
        .filter(Boolean)
        .join(" · ");

}


function describirEntregaPedido(pedido) {

    if (pedido.metodo_entrega === "retiro") {
        return "Retiro en local";
    }

    const partes = [
        pedido.direccion,
        pedido.ciudad,
        pedido.provincia,
        pedido.codigo_postal
            ? `CP ${pedido.codigo_postal}`
            : ""
    ].filter(Boolean);

    return partes.length
        ? partes.join(", ")
        : "Sin datos de entrega (pedido anterior)";

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
   CARGAR PEDIDOS
========================================= */

async function cargarPedidosAdmin() {

    if (!listaPedidos) {
        return;
    }


    listaPedidos.innerHTML = `

        <div class="categorias-cargando">
            Cargando pedidos...
        </div>

    `;


    try {

        const estado =
            filtroPedidos?.value || "";

        const pedidos =
            await obtenerRespuestaJSON(
                `/api/admin/pedidos${estado ? `?estado=${encodeURIComponent(estado)}` : ""}`
            );


        if (!pedidos) {
            return;
        }


        pedidosAdmin = pedidos;

        mostrarPedidosAdmin();

    } catch (error) {

        console.error(
            "Error cargando pedidos:",
            error
        );


        listaPedidos.innerHTML = `

            <div class="categorias-error">
                ${escaparHTML(error.message)}
            </div>

        `;

    }

}


/* =========================================
   MOSTRAR PEDIDOS
========================================= */

function mostrarPedidosAdmin() {

    if (!listaPedidos) {
        return;
    }


    if (pedidosAdmin.length === 0) {

        listaPedidos.innerHTML = `

            <div class="categorias-vacias">

                No hay pedidos para mostrar.

            </div>

        `;

        return;

    }


    listaPedidos.innerHTML =
        pedidosAdmin
            .map(pedido => {

                const cerrado =
                    ESTADOS_CERRADOS.includes(
                        pedido.estado
                    );

                const productos =
                    pedido.items
                        .map(item => `
                            <p>
                                ${Number(item.cantidad)} ×
                                ${escaparHTML(describirItemPedido(item))}
                            </p>
                        `)
                        .join("");


                return `

                    <article
                        class="
                            categoria-admin
                            ${cerrado ? "categoria-admin--inactiva" : ""}
                        "
                    >

                        <div class="categoria-admin__cabecera">

                            <div style="min-width: 0; overflow-wrap: anywhere;">

                                <span class="categoria-admin__orden">
                                    Pedido #${pedido.id} · ${formatearFechaPedido(pedido.creado_en)}
                                </span>

                                <h3>
                                    ${escaparHTML(pedido.nombre_comprador || pedido.email_comprador || "Sin nombre")}
                                </h3>

                            </div>

                            <span
                                class="
                                    categoria-admin__estado
                                    ${
                                        cerrado
                                            ? "categoria-admin__estado--inactiva"
                                            : "categoria-admin__estado--activa"
                                    }
                                "
                                style="flex-shrink: 0;"
                            >
                                ${ESTADOS[pedido.estado] || escaparHTML(pedido.estado)}
                            </span>

                        </div>


                        <div class="categoria-admin__datos">

                            ${productos}

                            <p>
                                <strong>Total:</strong>
                                ${formatearPrecioPedido(pedido.total)}
                                ${
                                    pedido.costo_envio > 0
                                        ? `(envío ${formatearPrecioPedido(pedido.costo_envio)})`
                                        : ""
                                }
                            </p>

                            ${
                                pedido.descuento > 0
                                    ? `
                                        <p>
                                            <strong>Cupón:</strong>
                                            <code>${escaparHTML(pedido.cupon_codigo || "")}</code>
                                            − ${formatearPrecioPedido(pedido.descuento)}
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                pedido.reintegrado_en
                                    ? `
                                        <p>
                                            <strong>Reintegrado:</strong>
                                            ${formatearFechaPedido(pedido.reintegrado_en)}
                                        </p>
                                    `
                                    : ""
                            }

                            <p>
                                <strong>Entrega:</strong>
                                ${escaparHTML(describirEntregaPedido(pedido))}
                            </p>

                            <p>
                                <strong>Contacto:</strong>
                                ${escaparHTML(pedido.email_comprador || "-")}
                                ${pedido.telefono ? ` · ${escaparHTML(pedido.telefono)}` : ""}
                            </p>

                            ${
                                pedido.dni
                                    ? `
                                        <p>
                                            <strong>DNI/CUIT:</strong>
                                            ${escaparHTML(pedido.dni)}
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                pedido.notas
                                    ? `
                                        <p>
                                            <strong>Notas:</strong>
                                            ${escaparHTML(pedido.notas)}
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                pedido.codigo_seguimiento
                                    ? `
                                        <p>
                                            <strong>Seguimiento:</strong>
                                            <code>${escaparHTML(pedido.codigo_seguimiento)}</code>
                                        </p>
                                    `
                                    : ""
                            }

                            ${
                                pedido.mp_payment_id
                                    ? `
                                        <p>
                                            <strong>Pago MP:</strong>
                                            <code>${escaparHTML(pedido.mp_payment_id)}</code>
                                        </p>
                                    `
                                    : ""
                            }

                        </div>


                        ${
                            pedido.estado === "cancelado"
                                ? ""
                                : `
                                    <div class="categoria-admin__acciones">

                                        <button
                                            type="button"
                                            class="btn-editar-categoria"
                                            data-accion="gestionar"
                                            data-id="${pedido.id}"
                                        >
                                            ✏️ Cambiar estado
                                        </button>

                                    </div>
                                `
                        }

                    </article>

                `;

            })
            .join("");

}


/* =========================================
   FORMULARIO DE ESTADO
========================================= */

function opcionesEstado(pedido) {

    if (!ESTADOS_CON_PAGO.includes(pedido.estado)) {
        return ["cancelado"];
    }

    return pedido.metodo_entrega === "retiro"
        ? ["preparando", "listo_retiro", "entregado", "cancelado"]
        : ["preparando", "enviado", "entregado", "cancelado"];

}


function mostrarFormularioPedido(pedido) {

    if (!formPedido) {
        return;
    }


    const opciones =
        opcionesEstado(pedido)
            .map(estado => `
                <option
                    value="${estado}"
                    ${estado === pedido.estado ? "selected" : ""}
                >
                    ${ESTADOS[estado]}
                </option>
            `)
            .join("");


    formPedido.innerHTML = `

        <h2>
            Pedido #${pedido.id}
        </h2>


        <label for="pedidoEstado">
            Nuevo estado:
        </label>

        <select id="pedidoEstado">
            ${opciones}
        </select>


        ${
            pedido.metodo_entrega === "retiro"
                ? ""
                : `
                    <label for="pedidoSeguimiento">
                        Código de seguimiento (opcional):
                    </label>

                    <input
                        id="pedidoSeguimiento"
                        type="text"
                        value="${escaparHTML(pedido.codigo_seguimiento || "")}"
                        autocomplete="off"
                        placeholder="Ej: número de envío del correo"
                    >
                `
        }


        ${
            ESTADOS_CON_PAGO.includes(pedido.estado) &&
            pedido.mp_payment_id
                ? `
                    <label id="pedidoReintegrarLabel" style="display: none;">
                        <input
                            id="pedidoReintegrar"
                            type="checkbox"
                            checked
                        >
                        Devolver el pago por Mercado Pago (reintegro total)
                    </label>
                `
                : ""
        }


        <div class="acciones-formulario">

            <button
                id="btnGuardarPedido"
                type="button"
            >
                Guardar estado
            </button>

            <button
                id="btnCancelarPedido"
                type="button"
                class="btn-cancelar"
            >
                Cerrar
            </button>

        </div>

    `;


    document
        .getElementById(
            "btnGuardarPedido"
        )
        .addEventListener(
            "click",
            () =>
                guardarEstadoPedido(
                    pedido
                )
        );


    document
        .getElementById(
            "btnCancelarPedido"
        )
        .addEventListener(
            "click",
            cerrarFormularioPedido
        );


    /* El reintegro solo aparece al elegir "Cancelado" */

    const selectEstado =
        document.getElementById(
            "pedidoEstado"
        );

    const labelReintegro =
        document.getElementById(
            "pedidoReintegrarLabel"
        );

    function actualizarOpcionReintegro() {

        if (!labelReintegro) {
            return;
        }

        labelReintegro.style.display =
            selectEstado.value === "cancelado"
                ? ""
                : "none";

    }

    selectEstado.addEventListener(
        "change",
        actualizarOpcionReintegro
    );

    actualizarOpcionReintegro();


    formPedido.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


function cerrarFormularioPedido() {

    if (!formPedido) {
        return;
    }


    formPedido.innerHTML = "";

}


/* =========================================
   GUARDAR ESTADO
========================================= */

async function guardarEstadoPedido(pedido) {

    const estado =
        document.getElementById(
            "pedidoEstado"
        ).value;

    const codigoSeguimiento =
        document.getElementById(
            "pedidoSeguimiento"
        )?.value.trim() || "";


    const reintegrar =
        estado === "cancelado" &&
        document.getElementById(
            "pedidoReintegrar"
        )?.checked === true;


    if (estado === "cancelado") {

        const yaPagado =
            ESTADOS_CON_PAGO.includes(
                pedido.estado
            );

        const confirmar = confirm(
            !yaPagado
                ? `¿Cancelar el pedido #${pedido.id}?`
                : reintegrar
                    ? `¿Cancelar el pedido #${pedido.id} y devolverle ${formatearPrecioPedido(pedido.total)} al cliente por Mercado Pago?\n\nEl stock se va a devolver. Esta acción no se puede deshacer.`
                    : `¿Cancelar el pedido #${pedido.id} SIN devolver el dinero?\n\nEl stock se va a devolver.`
        );

        if (!confirmar) {
            return;
        }

    }


    const boton =
        document.getElementById(
            "btnGuardarPedido"
        );

    boton.disabled = true;


    try {

        const resultado =
            await obtenerRespuestaJSON(
                `/api/admin/pedidos/${pedido.id}/estado`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        estado,
                        codigo_seguimiento:
                            codigoSeguimiento,
                        reintegrar
                    })
                }
            );


        if (!resultado) {
            return;
        }


        alert(resultado.mensaje);

        cerrarFormularioPedido();

        await cargarPedidosAdmin();

    } catch (error) {

        alert(error.message);

        boton.disabled = false;

    }

}


/* =========================================
   ABRIR Y CERRAR PANEL DE PEDIDOS
========================================= */

function alternarPanelPedidos() {

    if (
        !btnTogglePedidos ||
        !contenidoPedidos
    ) {
        return;
    }

    const debeAbrirse =
        contenidoPedidos.hidden;

    contenidoPedidos.hidden =
        !debeAbrirse;

    btnTogglePedidos.setAttribute(
        "aria-expanded",
        String(debeAbrirse)
    );

    btnTogglePedidos.classList.toggle(
        "btn-categorias-toggle--abierto",
        debeAbrirse
    );

    if (iconoTogglePedidos) {

        iconoTogglePedidos.textContent =
            debeAbrirse
                ? "−"
                : "+";

    }

    if (debeAbrirse) {

        cargarPedidosAdmin();

    }

}


/* =========================================
   EVENTOS
========================================= */

btnTogglePedidos
    ?.addEventListener(
        "click",
        alternarPanelPedidos
    );


filtroPedidos
    ?.addEventListener(
        "change",
        () => {

            cerrarFormularioPedido();

            cargarPedidosAdmin();

        }
    );


listaPedidos
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


            const pedido =
                pedidosAdmin.find(
                    item =>
                        Number(item.id) ===
                        Number(boton.dataset.id)
                );


            if (
                pedido &&
                boton.dataset.accion === "gestionar"
            ) {

                mostrarFormularioPedido(
                    pedido
                );

            }

        }
    );


/* Disponible para otros archivos */

window.cargarPedidosAdmin =
    cargarPedidosAdmin;

    })();
