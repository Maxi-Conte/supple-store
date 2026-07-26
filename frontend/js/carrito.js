/* ==================================================
   FUNCIONES AUXILIARES
================================================== */

function formatearPesoCarrito(pesoGramos) {
  const peso = Number(pesoGramos);

  if (!peso) return "";

  if (peso >= 1000) {
    const kilos = peso / 1000;

    return Number.isInteger(kilos)
      ? `${kilos} kg`
      : `${kilos.toFixed(1)} kg`;
  }

  return `${peso} g`;
}

function obtenerDetalleVarianteCarrito(item) {
  const detalles = [];

  const sabor = String(item.sabor || "").trim();
  const peso = formatearPesoCarrito(
    item.peso_gramos
  );

  if (sabor) {
    detalles.push(sabor);
  }

  if (peso) {
    detalles.push(peso);
  }

  return detalles.join(" · ");
}

/* ==================================================
   REFRESCAR CARRITO
================================================== */

async function refrescarCarrito() {
  try {
    const data = await api.get("/carrito");

    renderCarrito(data);

    return data;
  } catch (error) {
    console.error(
      "Error al refrescar el carrito:",
      error
    );

    return null;
  }
}

/* ==================================================
   MOSTRAR CARRITO
================================================== */

function renderCarrito(data) {
  const contenedor = document.getElementById(
    "drawer-items"
  );

  const totalElemento = document.getElementById(
    "drawer-total-valor"
  );

  const contadorElemento = document.getElementById(
    "cart-count"
  );

  const botonCheckout = document.getElementById(
    "btn-checkout"
  );

  if (!data || !Array.isArray(data.items)) {
    return;
  }

  const cantidadTotal = data.items.reduce(
    (acumulador, item) =>
      acumulador + Number(item.cantidad || 0),
    0
  );

  if (contadorElemento) {
    contadorElemento.textContent = cantidadTotal;
  }

  if (!contenedor) return;

  if (data.items.length === 0) {
    contenedor.innerHTML = `
      <p class="carrito-vacio">
        Tu carrito está vacío. ¡Sumá algo de proteína!
      </p>
    `;

    if (botonCheckout) {
      botonCheckout.disabled = true;
    }

    if (totalElemento) {
      totalElemento.textContent =
        formatearPrecio(0);
    }

    return;
  }

  contenedor.innerHTML = data.items
    .map((item) => {
      const cantidad =
        Number(item.cantidad) || 1;

      const stock =
        Number(item.stock) || 0;

      const detalleVariante =
        obtenerDetalleVarianteCarrito(item);

      const subtotal =
        Number(item.subtotal) ||
        Number(item.precio) * cantidad;

      const llegoAlStock =
        cantidad >= stock;

      return `
        <div
          class="item-carrito"
          data-item-id="${item.item_id}"
        >

          <div class="item-carrito__thumb">

            ${
              item.imagen_url
                ? `
                  <img
                    src="${item.imagen_url}"
                    alt="${item.nombre}"
                  >
                `
                : `
                  <span
                    class="item-carrito__sin-imagen"
                    aria-hidden="true"
                  >
                    📦
                  </span>
                `
            }

          </div>

          <div class="item-carrito__info">

            <div class="item-carrito__nombre">
              ${item.nombre}
            </div>

            ${
              detalleVariante
                ? `
                  <div class="item-carrito__variante">
                    ${detalleVariante}
                  </div>
                `
                : ""
            }

            <div class="item-carrito__precio">
              ${formatearPrecio(item.precio)}
              <span>c/u</span>
            </div>

            <div class="item-carrito__subtotal">
              Subtotal:
              <strong>
                ${formatearPrecio(subtotal)}
              </strong>
            </div>

            <div class="item-carrito__cantidad">

              <button
                type="button"
                data-accion="restar"
                aria-label="Restar una unidad"
              >
                −
              </button>

              <span>
                ${cantidad}
              </span>

              <button
                type="button"
                data-accion="sumar"
                aria-label="Agregar una unidad"
                ${llegoAlStock ? "disabled" : ""}
                title="${
                  llegoAlStock
                    ? "Alcanzaste el stock disponible"
                    : "Agregar una unidad"
                }"
              >
                +
              </button>

              <button
                type="button"
                class="item-carrito__eliminar"
                data-accion="eliminar"
              >
                Quitar
              </button>

            </div>

          </div>

        </div>
      `;
    })
    .join("");

  if (totalElemento) {
    totalElemento.textContent =
      formatearPrecio(data.total);
  }

  if (botonCheckout) {
    botonCheckout.disabled = false;
  }

  iniciarEventosItemsCarrito(data);
}

/* ==================================================
   EVENTOS DE LOS PRODUCTOS DEL CARRITO
================================================== */

function iniciarEventosItemsCarrito(data) {
  const contenedor = document.getElementById(
    "drawer-items"
  );

  if (!contenedor) return;

  contenedor
    .querySelectorAll("[data-accion]")
    .forEach((boton) => {
      boton.addEventListener(
        "click",
        async (evento) => {
          const itemElemento =
            evento.target.closest(
              ".item-carrito"
            );

          if (!itemElemento) return;

          const itemId =
            itemElemento.dataset.itemId;

          const accion =
            boton.dataset.accion;

          const item = data.items.find(
            (producto) =>
              String(producto.item_id) ===
              String(itemId)
          );

          if (!item) return;

          boton.disabled = true;

          try {
            if (accion === "eliminar") {
              await api.delete(
                `/carrito/items/${itemId}`
              );
            }

            if (accion === "sumar") {
              await api.put(
                `/carrito/items/${itemId}`,
                {
                  cantidad:
                    Number(item.cantidad) + 1
                }
              );
            }

            if (accion === "restar") {
              const cantidadActual =
                Number(item.cantidad);

              if (cantidadActual <= 1) {
                await api.delete(
                  `/carrito/items/${itemId}`
                );
              } else {
                await api.put(
                  `/carrito/items/${itemId}`,
                  {
                    cantidad:
                      cantidadActual - 1
                  }
                );
              }
            }

            await refrescarCarrito();
          } catch (error) {
            console.error(
              "Error modificando el carrito:",
              error
            );

            alert(
              error.message ||
                "No se pudo modificar el carrito."
            );

            boton.disabled = false;
          }
        }
      );
    });
}

/* ==================================================
   AGREGAR PRODUCTO AL CARRITO
================================================== */

async function agregarAlCarrito(
  productoId,
  cantidad = 1,
  opciones = {}
) {
  const productoIdNumerico =
    Number(productoId);

  const varianteIdNumerico =
    Number(opciones.variante_id);

  const cantidadNumerica =
    Number(cantidad);

  if (
    !Number.isInteger(productoIdNumerico) ||
    productoIdNumerico <= 0
  ) {
    throw new Error(
      "El producto seleccionado no es válido."
    );
  }

  if (
    !Number.isInteger(varianteIdNumerico) ||
    varianteIdNumerico <= 0
  ) {
    throw new Error(
      "La variante seleccionada no es válida."
    );
  }

  if (
    !Number.isInteger(cantidadNumerica) ||
    cantidadNumerica <= 0
  ) {
    throw new Error(
      "La cantidad seleccionada no es válida."
    );
  }

  try {
    await api.post("/carrito/items", {
      producto_id: productoIdNumerico,
      variante_id: varianteIdNumerico,
      cantidad: cantidadNumerica
    });

    await refrescarCarrito();

    abrirCarrito();

    console.log("Producto agregado:", {
      producto_id: productoIdNumerico,
      variante_id: varianteIdNumerico,
      cantidad: cantidadNumerica,
      sabor: opciones.sabor || null,
      peso_gramos:
        opciones.peso_gramos || null
    });
  } catch (error) {
    console.error(
      "Error agregando al carrito:",
      error
    );

    throw error;
  }
}

/* ==================================================
   ABRIR Y CERRAR CARRITO
================================================== */

function abrirCarrito() {
  document
    .getElementById("drawer-carrito")
    ?.classList.add("abierto");

  document
    .getElementById("overlay")
    ?.classList.add("abierto");
}

function cerrarCarrito() {
  document
    .getElementById("drawer-carrito")
    ?.classList.remove("abierto");

  document
    .getElementById("overlay")
    ?.classList.remove("abierto");
}

/* ==================================================
   CHECKOUT DE MERCADO PAGO
================================================== */

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

async function iniciarCheckout() {
  const boton = document.getElementById(
    "btn-checkout"
  );

  if (!boton) return;

  const usuario = usuarioActual();

  let email = usuario?.email;

  if (!email) {
    email = prompt(
      "Dejanos tu email para el seguimiento de la compra:"
    );

    if (!email) return;

    email = email.trim();

    if (!emailValido(email)) {
      alert(
        "Ingresá un correo electrónico válido."
      );

      return;
    }
  }

  const textoOriginal = boton.textContent;

  boton.disabled = true;

  boton.textContent =
    "Redirigiendo a Mercado Pago...";

  try {
    const data = await api.post(
      "/pagos/crear-preferencia",
      {
        email_comprador: email
      }
    );

    const enlacePago =
      data.init_point ||
      data.sandbox_init_point;

    if (!enlacePago) {
      throw new Error(
        "Mercado Pago no devolvió un enlace de pago."
      );
    }

    window.location.href = enlacePago;
  } catch (error) {
    console.error(
      "Error iniciando el checkout:",
      error
    );

    alert(
      error.message ||
        "No se pudo iniciar el pago."
    );

    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

/* ==================================================
   INICIAR INTERFAZ DEL CARRITO
================================================== */

function initCarritoUI() {
  document
    .getElementById("btn-abrir-carrito")
    ?.addEventListener(
      "click",
      async () => {
        await refrescarCarrito();
        abrirCarrito();
      }
    );

  document
    .getElementById("drawer-cerrar")
    ?.addEventListener(
      "click",
      cerrarCarrito
    );

  document
    .getElementById("overlay")
    ?.addEventListener(
      "click",
      cerrarCarrito
    );

  document
    .getElementById("btn-checkout")
    ?.addEventListener(
      "click",
      iniciarCheckout
    );

  refrescarCarrito();
}

document.addEventListener(
  "DOMContentLoaded",
  initCarritoUI
);