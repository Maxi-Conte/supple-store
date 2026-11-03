/* ==================================================
   KRATOS — MI CUENTA Y MIS PEDIDOS
================================================== */

function escaparTextoCuenta(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function describirItemCuenta(item) {
  const peso = Number(item.peso_gramos);

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

function renderMisPedidos(pedidos) {
  const lista = document.getElementById(
    "lista-mis-pedidos"
  );

  if (!lista) return;

  if (pedidos.length === 0) {
    lista.innerHTML = `
      <p class="carrito-vacio">
        Todavía no hiciste ninguna compra con esta cuenta.
      </p>
    `;

    return;
  }

  lista.innerHTML = pedidos
    .map((pedido) => {
      const fecha = new Date(
        pedido.creado_en
      ).toLocaleDateString("es-AR");

      const productos = pedido.items
        .map((item) => `
          <div class="drawer__resumen-fila">
            <span>
              ${Number(item.cantidad)} × ${escaparTextoCuenta(describirItemCuenta(item))}
            </span>
          </div>
        `)
        .join("");

      return `
        <div class="drawer__resumen">

          <div class="drawer__resumen-titulo">
            <span>
              Pedido #${pedido.id} · ${fecha}
            </span>

            <span class="drawer__resumen-badge">
              ${escaparTextoCuenta(pedido.estado_texto)}
            </span>
          </div>

          ${productos}

          ${
            pedido.codigo_seguimiento
              ? `
                <div class="drawer__resumen-fila">
                  <span>Seguimiento</span>
                  <span>${escaparTextoCuenta(pedido.codigo_seguimiento)}</span>
                </div>
              `
              : ""
          }

          <div class="drawer__separador"></div>

          <div class="drawer__resumen-fila">
            <span>
              ${pedido.metodo_entrega === "retiro" ? "Retiro en local" : "Envío a domicilio"}
            </span>
            <span>
              ${formatearPrecio(pedido.total)}
            </span>
          </div>

        </div>
      `;
    })
    .join("");
}

async function abrirModalCuenta() {
  const modal = document.getElementById(
    "modal-cuenta"
  );

  const usuario = usuarioActual();

  if (!modal || !usuario) return;

  const primerNombre = String(
    usuario.nombre || ""
  ).trim().split(" ")[0];

  document.getElementById(
    "modal-cuenta-titulo"
  ).textContent = primerNombre
    ? `Hola, ${primerNombre}`
    : "Mis pedidos";

  document.getElementById(
    "modal-cuenta-email"
  ).textContent = usuario.email || "";

  const errorBox = document.getElementById(
    "modal-cuenta-error"
  );

  errorBox.textContent = "";
  errorBox.classList.remove("visible");

  document.getElementById(
    "lista-mis-pedidos"
  ).innerHTML = `
    <p class="carrito-vacio">
      Cargando tus pedidos...
    </p>
  `;

  modal.classList.add("abierto");
  modal.setAttribute("aria-hidden", "false");
  modal.removeAttribute("inert");

  try {
    const pedidos = await api.get(
      "/pagos/mis-pedidos"
    );

    renderMisPedidos(pedidos);
  } catch (error) {
    document.getElementById(
      "lista-mis-pedidos"
    ).innerHTML = "";

    errorBox.textContent = error.message;
    errorBox.classList.add("visible");
  }
}

function cerrarModalCuenta() {
  const modal = document.getElementById(
    "modal-cuenta"
  );

  if (!modal) return;

  if (modal.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  modal.classList.remove("abierto");
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("inert", "");
}

function initModalCuenta() {
  const modal = document.getElementById(
    "modal-cuenta"
  );

  if (!modal) return;

  document
    .getElementById("modal-cuenta-cerrar")
    ?.addEventListener("click", cerrarModalCuenta);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) {
      cerrarModalCuenta();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (
      evento.key === "Escape" &&
      modal.classList.contains("abierto")
    ) {
      cerrarModalCuenta();
    }
  });

  document
    .getElementById("btn-cerrar-sesion")
    ?.addEventListener("click", () => {
      cerrarSesion();
      cerrarModalCuenta();
      refrescarCarrito();
    });
}

document.addEventListener(
  "DOMContentLoaded",
  initModalCuenta
);
