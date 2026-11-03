function formatearPrecio(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);
}

/* ==================================================
   CATEGORÍAS
================================================== */

async function cargarCategorias() {
  const nav = document.getElementById("categorias-nav");

  if (!nav) return;

  const params = new URLSearchParams(
    window.location.search
  );

  const categoriaActiva = params.get("categoria");

  /* Mientras se ve una búsqueda, ninguna categoría queda marcada */
  const hayBusqueda = Boolean(params.get("buscar"));

  try {
    const categorias = await api.get("/categorias");

    const linkTodos = `
      <a
        href="/#productos"
        class="${!categoriaActiva && !hayBusqueda ? "activo" : ""}"
      >
        Todos
      </a>
    `;

    const links = categorias
      .map(
        (categoria) => `
          <a
            href="/?categoria=${categoria.slug}"
            class="${
              categoriaActiva === categoria.slug
                ? "activo"
                : ""
            }"
          >
            ${categoria.nombre}
          </a>
        `
      )
      .join("");

    nav.innerHTML = linkTodos + links;
  } catch (error) {
    console.error(
      "Error cargando categorías:",
      error
    );
  }
}

/* ==================================================
   TARJETAS DE PRODUCTOS
================================================== */

const ICONOS_CATEGORIA = {
  proteinas: "🥤",
  creatina: "⚡",
  creatinas: "⚡",
  "pre-entreno": "🔥",
  aminoacidos: "💊",
  vitaminas: "🌿",
  colagenos: "✨",
  hidratacion: "💧",
  accesorios: "🏋️",
  barritas: "🍫",
  "frutos-secos": "🥜"
};

function escaparTarjeta(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearPesoTarjeta(pesoGramos) {
  const peso = Number(pesoGramos);

  if (!peso) return "";

  /* Espacio que no se corta: "930 g" nunca queda en dos renglones */
  return peso >= 1000
    ? `${Number.isInteger(peso / 1000) ? peso / 1000 : (peso / 1000).toFixed(1)} kg`
    : `${peso} g`;
}

/* "Chocolate" o "3 sabores", más el peso si lo hay */
function resumenTarjeta(producto) {
  const sabores = String(producto.sabor || "")
    .split(",")
    .map((sabor) => sabor.trim())
    .filter(Boolean);

  const partes = [];

  if (sabores.length === 1) {
    partes.push(sabores[0]);
  } else if (sabores.length > 1) {
    partes.push(`${sabores.length} sabores`);
  }

  const peso = formatearPesoTarjeta(producto.peso_gramos);

  if (peso) {
    partes.push(peso);
  }

  return partes.join(" · ");
}

/* ==================================================
   FOTOS SIN FONDO BLANCO
   Muchas fotos traen fondo blanco: sobre la tarjeta
   oscura quedan como recuadros. Pintamos la foto en un
   canvas y borramos solo el blanco que toca los bordes
   (el blanco de la etiqueta del producto se respeta).
================================================== */

const fotosProcesadas = new Map();

function quitarFondoBlanco(img) {
  const lado = 480;
  const escala = Math.min(
    lado / img.naturalWidth,
    lado / img.naturalHeight,
    1
  );

  const ancho = Math.max(Math.round(img.naturalWidth * escala), 1);
  const alto = Math.max(Math.round(img.naturalHeight * escala), 1);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(img, 0, 0, ancho, alto);

  const imagen = contexto.getImageData(0, 0, ancho, alto);
  const px = imagen.data;

  const esquinas = [
    0,
    ancho - 1,
    (alto - 1) * ancho,
    alto * ancho - 1
  ];

  /* Ya es transparente (PNG recortado): no hay nada que hacer */
  if (esquinas.every((i) => px[i * 4 + 3] < 20)) {
    return "transparente";
  }

  const esFondo = (i) => {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];

    return (
      px[i * 4 + 3] > 0 &&
      Math.min(r, g, b) > 226 &&
      Math.max(r, g, b) - Math.min(r, g, b) < 24
    );
  };

  /* Si las esquinas no son blancas, el fondo es de color: lo dejamos */
  if (esquinas.filter(esFondo).length < 3) {
    return "con-fondo";
  }

  /* Relleno desde los bordes */
  const borrado = new Uint8Array(ancho * alto);
  const pila = [];

  for (let x = 0; x < ancho; x++) {
    pila.push(x, (alto - 1) * ancho + x);
  }

  for (let y = 0; y < alto; y++) {
    pila.push(y * ancho, y * ancho + ancho - 1);
  }

  while (pila.length) {
    const i = pila.pop();

    if (borrado[i] || !esFondo(i)) continue;

    borrado[i] = 1;
    px[i * 4 + 3] = 0;

    const x = i % ancho;

    if (x > 0) pila.push(i - 1);
    if (x < ancho - 1) pila.push(i + 1);
    if (i >= ancho) pila.push(i - ancho);
    if (i < ancho * (alto - 1)) pila.push(i + ancho);
  }

  /* Borde suave: los píxeles casi blancos pegados al fondo se aclaran */
  for (let i = 0; i < borrado.length; i++) {
    if (borrado[i]) continue;

    const x = i % ancho;

    const tocaFondo =
      (x > 0 && borrado[i - 1]) ||
      (x < ancho - 1 && borrado[i + 1]) ||
      (i >= ancho && borrado[i - ancho]) ||
      (i < ancho * (alto - 1) && borrado[i + ancho]);

    if (!tocaFondo) continue;

    const minimo = Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);

    if (minimo > 190) {
      px[i * 4 + 3] = Math.round(
        px[i * 4 + 3] * Math.min((226 - minimo) / 36 + 0.15, 1)
      );
    }
  }

  contexto.putImageData(imagen, 0, 0);

  return canvas.toDataURL("image/png");
}

function prepararFoto(img) {
  const original = img.getAttribute("src");

  const mostrar = (resultado) => {
    if (resultado && resultado.startsWith("data:")) {
      img.addEventListener(
        "load",
        () => {
          img.classList.remove("foto-con-fondo");
          img.classList.add("foto-lista");
        },
        { once: true }
      );

      img.src = resultado;
      return;
    }

    if (resultado === "con-fondo") {
      img.classList.add("foto-con-fondo");
    }

    img.classList.add("foto-lista");
  };

  if (fotosProcesadas.has(original)) {
    mostrar(fotosProcesadas.get(original));
    return;
  }

  /*
    Las fotos suelen venir de otros sitios: para poder leerlas
    en el canvas se piden con permiso CORS en una copia aparte.
    Si el sitio no lo permite, se muestra la original enmarcada.
  */
  const copia = new Image();
  copia.crossOrigin = "anonymous";
  copia.decoding = "async";

  copia.onload = () => {
    let resultado;

    try {
      resultado = quitarFondoBlanco(copia);
    } catch (error) {
      resultado = "con-fondo";
    }

    fotosProcesadas.set(original, resultado);
    mostrar(resultado);
  };

  copia.onerror = () => {
    fotosProcesadas.set(original, "con-fondo");
    mostrar("con-fondo");
  };

  copia.src = original;

  /* Si tarda, no dejamos la tarjeta vacía: mostramos la original */
  setTimeout(() => {
    if (!img.classList.contains("foto-lista")) {
      mostrar("con-fondo");
    }
  }, 2500);

  img.addEventListener(
    "error",
    () => img.classList.add("foto-lista", "foto-con-fondo"),
    { once: true }
  );
}

function tarjetaProducto(producto) {
  const sinStock = Number(producto.stock) <= 0;
  const precio = Number(producto.precio) || 0;

  const variasVariantes =
    Number(producto.cantidad_variantes) > 1;

  const icono =
    ICONOS_CATEGORIA[producto.categoria_slug] ||
    "🏋️";

  const etiquetaSuperior = [
    producto.categoria,
    producto.marca
  ]
    .filter(Boolean)
    .join(" · ");

  const resumen = resumenTarjeta(producto);

  return `
    <article
      class="card-producto ${sinStock ? "card-producto--sin-stock" : ""}"
      data-slug="${escaparTarjeta(producto.slug)}"
    >

      <div class="card-producto__img">

        ${
          producto.dato_destacado
            ? `
              <span class="sello">
                ${escaparTarjeta(producto.dato_destacado)}
              </span>
            `
            : ""
        }

        ${
          sinStock
            ? `<span class="card-producto__agotado">Sin stock</span>`
            : ""
        }

        ${
          producto.imagen_url
            ? `
              <img
                src="${escaparTarjeta(producto.imagen_url)}"
                alt="${escaparTarjeta(producto.nombre)}"
                loading="lazy"
              >
            `
            : `
              <span class="card-producto__icono" aria-hidden="true">
                ${icono}
              </span>
            `
        }

      </div>

      <div class="card-producto__body">

        ${
          etiquetaSuperior
            ? `
              <span class="card-producto__categoria">
                ${escaparTarjeta(etiquetaSuperior)}
              </span>
            `
            : ""
        }

        <h3 class="card-producto__nombre">
          ${escaparTarjeta(producto.nombre)}
        </h3>

        ${
          resumen
            ? `
              <span class="card-producto__sabor">
                ${escaparTarjeta(resumen)}
              </span>
            `
            : ""
        }

        <div class="card-producto__footer">

          <div class="card-producto__precio">
            ${
              precio > 0
                ? `
                  ${
                    variasVariantes
                      ? `<span class="card-producto__desde">Desde</span>`
                      : ""
                  }
                  <span class="precio">
                    ${formatearPrecio(precio)}
                  </span>
                `
                : `<span class="card-producto__consultar">Próximamente</span>`
            }
          </div>

          ${
            sinStock
              ? ""
              : `
                <button
                  class="btn-agregar btn-comprar"
                  type="button"
                  data-slug="${escaparTarjeta(producto.slug)}"
                  aria-label="Comprar ${escaparTarjeta(producto.nombre)}"
                >
                  Comprar
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </button>
              `
          }

        </div>

      </div>

    </article>
  `;
}

/* ==================================================
   CARGAR CATÁLOGO
================================================== */

async function cargarProductos() {
  const grid = document.getElementById(
    "grid-productos"
  );

  const tituloSeccion = document.getElementById(
    "titulo-seccion"
  );

  if (!grid) return;

  const params = new URLSearchParams(
    window.location.search
  );

  const categoria = params.get("categoria");
  const buscar = params.get("buscar");

  const query = new URLSearchParams();

  if (categoria) {
    query.set("categoria", categoria);
  }

  if (buscar) {
    query.set("buscar", buscar);
  }

  try {
    const ruta = query.toString()
      ? `/productos?${query.toString()}`
      : "/productos";

    const productos = await api.get(ruta);

    if (tituloSeccion) {
      if (buscar) {
        tituloSeccion.textContent =
          `Resultados para "${buscar}"`;
      } else if (categoria) {
        tituloSeccion.textContent =
          categoria.replaceAll("-", " ");
      } else {
        tituloSeccion.textContent =
          "Todo el catálogo";
      }
    }

    grid.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join("")
      : `
        <p class="carrito-vacio">
          No encontramos productos con ese criterio.
        </p>
      `;

    if (
      categoria ||
      buscar ||
      window.location.hash === "#productos"
    ) {
      irAProductos();
    }

    grid
      .querySelectorAll(".card-producto__img img")
      .forEach(prepararFoto);

    /* Toda la tarjeta abre el detalle, no solo el botón */
    grid
      .querySelectorAll(".card-producto[data-slug]")
      .forEach((tarjeta) => {
        tarjeta.addEventListener("click", () => {
          abrirDetalleProducto(
            tarjeta.dataset.slug
          );
        });
      });
  } catch (error) {
    console.error(
      "Error cargando productos:",
      error
    );

    grid.innerHTML = `
      <p class="carrito-vacio">
        Error al cargar el catálogo.
      </p>
    `;
  }
}

/* ==================================================
   ESTADO DEL MODAL
================================================== */

let productoSeleccionado = null;
let varianteSeleccionada = null;
let cantidadSeleccionada = 1;
let pesoSeleccionado = null;

/* ==================================================
   ELEMENTOS DEL MODAL
================================================== */

function obtenerElementosModal() {
  return {
    modal: document.getElementById(
      "modal-detalle-producto"
    ),

    overlay: document.querySelector(
      ".modal-detalle-producto__overlay"
    ),

    botonCerrar: document.getElementById(
      "btn-cerrar-detalle"
    ),

    imagen: document.getElementById(
      "detalle-producto-imagen"
    ),

    sinImagen: document.getElementById(
      "detalle-producto-sin-imagen"
    ),

    categoria: document.getElementById(
      "detalle-producto-categoria"
    ),

    nombre: document.getElementById(
      "detalle-producto-nombre"
    ),

    descripcion: document.getElementById(
      "detalle-producto-descripcion"
    ),

    precio: document.getElementById(
      "detalle-producto-precio"
    ),

    grupoSabor: document.getElementById(
      "grupo-detalle-sabor"
    ),

    selectorSabor: document.getElementById(
      "detalle-producto-sabor"
    ),

    grupoPeso: document.getElementById(
      "grupo-detalle-peso"
    ),

    opcionesPeso: document.getElementById(
      "detalle-producto-pesos"
    ),

    botonRestar: document.getElementById(
      "btn-detalle-restar"
    ),

    cantidad: document.getElementById(
      "detalle-producto-cantidad"
    ),

    botonSumar: document.getElementById(
      "btn-detalle-sumar"
    ),

    stock: document.getElementById(
      "detalle-producto-stock"
    ),

    botonAgregar: document.getElementById(
      "btn-detalle-agregar"
    )
  };
}

/* ==================================================
   ABRIR DETALLE
================================================== */

async function abrirDetalleProducto(slug) {
  if (!slug) return;

  try {
    const producto = await api.get(
      `/productos/${encodeURIComponent(slug)}`
    );

    productoSeleccionado = producto;
    cantidadSeleccionada = 1;
    pesoSeleccionado = null;

    varianteSeleccionada =
      obtenerVariantePredeterminada(producto);

    cargarDatosEnModal(producto);
    mostrarModalProducto();
  } catch (error) {
    console.error(
      "Error cargando el detalle del producto:",
      error
    );

    alert(
      "No se pudo cargar la información del producto."
    );
  }
}

/* ==================================================
   VARIANTES
================================================== */

function obtenerVariantesProducto(producto) {
  if (!Array.isArray(producto?.variantes)) {
    return [];
  }

  return producto.variantes.map((variante) => ({
    ...variante,

    id:
      variante.id !== null
        ? Number(variante.id)
        : null,

    producto_id: Number(
      variante.producto_id
    ),

    peso_gramos:
      variante.peso_gramos !== null
        ? Number(variante.peso_gramos)
        : null,

    precio: Number(variante.precio) || 0,

    stock: Number(variante.stock) || 0
  }));
}

function obtenerVariantePredeterminada(producto) {
  const variantes =
    obtenerVariantesProducto(producto);

  if (!variantes.length) {
    return null;
  }

  const idPredeterminado = Number(
    producto.variante_predeterminada_id
  );

  return (
    variantes.find(
      (variante) =>
        variante.id === idPredeterminado
    ) ||
    variantes.find(
      (variante) =>
        variante.stock > 0 &&
        variante.precio > 0
    ) ||
    variantes.find(
      (variante) => variante.stock > 0
    ) ||
    variantes[0]
  );
}

function buscarVariante(sabor, peso) {
  const variantes =
    obtenerVariantesProducto(
      productoSeleccionado
    );

  return (
    variantes.find((variante) => {
      const mismoSabor =
        normalizarTexto(variante.sabor) ===
        normalizarTexto(sabor);

      const mismoPeso =
        Number(variante.peso_gramos || 0) ===
        Number(peso || 0);

      return mismoSabor && mismoPeso;
    }) || null
  );
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

/* ==================================================
   CARGAR DATOS DEL MODAL
================================================== */

function cargarDatosEnModal(producto) {
  const elementos = obtenerElementosModal();

  if (!elementos.modal) {
    console.error(
      "No se encontró el modal de detalle."
    );

    return;
  }

  elementos.categoria.textContent =
    producto.categoria ||
    producto.categoria_nombre ||
    "Producto";

  elementos.nombre.textContent =
    producto.nombre ||
    "Producto sin nombre";

  const descripcion = String(
    producto.descripcion || ""
  ).trim();

  elementos.descripcion.textContent =
    descripcion ||
    "Este producto todavía no tiene una descripción disponible.";

  cargarImagenProducto(producto, elementos);
  cargarSaboresProducto(producto, elementos);

  const saborInicial =
    varianteSeleccionada?.sabor || "";

  if (elementos.selectorSabor) {
    elementos.selectorSabor.value =
      saborInicial;
  }

  cargarPesosDisponibles(
    saborInicial,
    elementos,
    varianteSeleccionada?.peso_gramos
  );

  actualizarVistaVariante(
    varianteSeleccionada
  );
}

/* ==================================================
   ACTUALIZAR PRECIO, STOCK Y BOTÓN
================================================== */

function actualizarVistaVariante(variante) {
  const elementos = obtenerElementosModal();

  varianteSeleccionada = variante;
  cantidadSeleccionada = 1;

  if (!variante) {
    elementos.precio.textContent =
      formatearPrecio(0);

    elementos.stock.textContent = "0";

    elementos.botonAgregar.disabled = true;

    elementos.botonAgregar.textContent =
      "Variante no disponible";

    actualizarCantidadModal(1);

    return;
  }

  elementos.precio.textContent =
    formatearPrecio(variante.precio);

  elementos.stock.textContent =
    variante.stock;

  const disponible =
    variante.stock > 0 &&
    variante.precio > 0;

  elementos.botonAgregar.disabled =
    !disponible;

  if (variante.stock <= 0) {
    elementos.botonAgregar.textContent =
      "Producto sin stock";
  } else if (variante.precio <= 0) {
    elementos.botonAgregar.textContent =
      "Precio no disponible";
  } else {
    elementos.botonAgregar.textContent =
      "Agregar al carrito";
  }

  actualizarCantidadModal(1);
}

/* ==================================================
   IMAGEN DEL PRODUCTO
================================================== */

function cargarImagenProducto(
  producto,
  elementos
) {
  const imagen = elementos.imagen;
  const sinImagen = elementos.sinImagen;

  imagen.removeAttribute("src");
  imagen.alt = "";

  imagen.style.display = "none";
  sinImagen.style.display = "none";

  if (!producto.imagen_url) {
    sinImagen.style.display = "flex";
    return;
  }

  imagen.src = producto.imagen_url;
  imagen.alt =
    producto.nombre || "Producto";

  imagen.onload = () => {
    imagen.style.display = "block";
    sinImagen.style.display = "none";
  };

  imagen.onerror = () => {
    imagen.style.display = "none";
    sinImagen.style.display = "flex";
  };
}

/* ==================================================
   SABORES
================================================== */

function obtenerSaboresDeVariantes(producto) {
  const variantes =
    obtenerVariantesProducto(producto);

  return [
    ...new Set(
      variantes
        .map((variante) =>
          variante.sabor
            ? variante.sabor.trim()
            : ""
        )
        .filter(Boolean)
    )
  ];
}

function cargarSaboresProducto(
  producto,
  elementos
) {
  const sabores =
    obtenerSaboresDeVariantes(producto);

  if (!sabores.length) {
    elementos.grupoSabor.hidden = true;
    elementos.selectorSabor.innerHTML = "";
    return;
  }

  elementos.grupoSabor.hidden = false;

  elementos.selectorSabor.innerHTML =
    sabores
      .map((sabor) => {
        const variantesDelSabor =
          obtenerVariantesProducto(
            producto
          ).filter(
            (variante) =>
              normalizarTexto(
                variante.sabor
              ) === normalizarTexto(sabor)
          );

        const disponible =
          variantesDelSabor.some(
            (variante) =>
              variante.stock > 0 &&
              variante.precio > 0
          );

        return `
          <option
            value="${sabor}"
            ${disponible ? "" : "disabled"}
          >
            ${sabor}${
              disponible
                ? ""
                : " — Sin stock"
            }
          </option>
        `;
      })
      .join("");

  elementos.selectorSabor.value =
    varianteSeleccionada?.sabor ||
    sabores[0];
}

/* ==================================================
   PESOS
================================================== */

function formatearPeso(pesoGramos) {
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

function obtenerVariantesPorSabor(sabor) {
  const variantes =
    obtenerVariantesProducto(
      productoSeleccionado
    );

  if (!sabor) {
    return variantes;
  }

  return variantes.filter(
    (variante) =>
      normalizarTexto(variante.sabor) ===
      normalizarTexto(sabor)
  );
}

function cargarPesosDisponibles(
  sabor,
  elementos,
  pesoPreferido = null
) {
  const variantesDelSabor =
    obtenerVariantesPorSabor(sabor);

  elementos.opcionesPeso.innerHTML = "";

  const pesos = [
    ...new Set(
      variantesDelSabor
        .map((variante) =>
          Number(variante.peso_gramos)
        )
        .filter((peso) => peso > 0)
    )
  ].sort((a, b) => a - b);

  if (!pesos.length) {
    elementos.grupoPeso.hidden = true;
    pesoSeleccionado = null;

    const primeraVariante =
      variantesDelSabor[0] || null;

    actualizarVistaVariante(
      primeraVariante
    );

    return;
  }

  elementos.grupoPeso.hidden = false;

  const pesoInicial =
    pesos.includes(Number(pesoPreferido))
      ? Number(pesoPreferido)
      : pesos[0];

  pesoSeleccionado = pesoInicial;

  pesos.forEach((peso) => {
    const variante = buscarVariante(
      sabor,
      peso
    );

    const boton =
      document.createElement("button");

    boton.type = "button";
    boton.textContent =
      formatearPeso(peso);

    boton.dataset.peso = peso;

    const disponible =
      variante &&
      variante.stock > 0 &&
      variante.precio > 0;

    if (peso === pesoInicial) {
      boton.classList.add("activo");
    }

    if (!disponible) {
      boton.disabled = true;
      boton.title =
        "Esta presentación no está disponible";
    }

    boton.addEventListener("click", () => {
      pesoSeleccionado = peso;

      elementos.opcionesPeso
        .querySelectorAll("button")
        .forEach((otroBoton) => {
          otroBoton.classList.remove(
            "activo"
          );
        });

      boton.classList.add("activo");

      const nuevaVariante =
        buscarVariante(sabor, peso);

      actualizarVistaVariante(
        nuevaVariante
      );
    });

    elementos.opcionesPeso.appendChild(
      boton
    );
  });

  const varianteInicial =
    buscarVariante(sabor, pesoInicial) ||
    variantesDelSabor[0] ||
    null;

  actualizarVistaVariante(
    varianteInicial
  );
}

/* ==================================================
   CAMBIO DE SABOR
================================================== */

function cambiarSaborSeleccionado() {
  const elementos = obtenerElementosModal();

  const sabor =
    elementos.selectorSabor.value;

  const variantesDelSabor =
    obtenerVariantesPorSabor(sabor);

  const varianteDisponible =
    variantesDelSabor.find(
      (variante) =>
        variante.stock > 0 &&
        variante.precio > 0
    ) ||
    variantesDelSabor.find(
      (variante) => variante.stock > 0
    ) ||
    variantesDelSabor[0] ||
    null;

  cargarPesosDisponibles(
    sabor,
    elementos,
    varianteDisponible?.peso_gramos
  );
}

/* ==================================================
   CANTIDAD
================================================== */

function actualizarCantidadModal(
  nuevaCantidad
) {
  const elementos = obtenerElementosModal();

  const stock = Number(
    varianteSeleccionada?.stock
  ) || 0;

  if (stock <= 0) {
    cantidadSeleccionada = 1;

    elementos.cantidad.textContent = "1";

    elementos.botonRestar.disabled = true;
    elementos.botonSumar.disabled = true;

    return;
  }

  cantidadSeleccionada = Math.max(
    1,
    Math.min(
      Number(nuevaCantidad) || 1,
      stock
    )
  );

  elementos.cantidad.textContent =
    cantidadSeleccionada;

  elementos.botonRestar.disabled =
    cantidadSeleccionada <= 1;

  elementos.botonSumar.disabled =
    cantidadSeleccionada >= stock;
}

/* ==================================================
   ABRIR Y CERRAR MODAL
================================================== */

function mostrarModalProducto() {
  const { modal } = obtenerElementosModal();

  if (!modal) return;

  modal.hidden = false;

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-producto-abierto"
  );
}

function cerrarModalProducto() {
  const { modal } = obtenerElementosModal();

  if (!modal) return;

  modal.hidden = true;

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-producto-abierto"
  );

  productoSeleccionado = null;
  varianteSeleccionada = null;
  cantidadSeleccionada = 1;
  pesoSeleccionado = null;
}

/* ==================================================
   AGREGAR AL CARRITO DESDE EL MODAL
================================================== */

async function agregarProductoDesdeModal() {
  if (
    !productoSeleccionado ||
    !varianteSeleccionada
  ) {
    return;
  }

  const elementos = obtenerElementosModal();

  const stock =
    Number(varianteSeleccionada.stock) || 0;

  const precio =
    Number(varianteSeleccionada.precio) || 0;

  if (stock <= 0 || precio <= 0) {
    return;
  }

  const textoOriginal =
    elementos.botonAgregar.textContent;

  elementos.botonAgregar.disabled = true;

  elementos.botonAgregar.textContent =
    "Agregando...";

  try {
    const funcionAgregar =
      window.agregarAlCarrito ||
      (
        typeof agregarAlCarrito ===
        "function"
          ? agregarAlCarrito
          : null
      );

    if (!funcionAgregar) {
      throw new Error(
        "No se encontró la función agregarAlCarrito."
      );
    }

    await funcionAgregar(
      productoSeleccionado.id,
      cantidadSeleccionada,
      {
        variante_id:
          varianteSeleccionada.id,

        sabor:
          varianteSeleccionada.sabor ||
          null,

        peso_gramos:
          varianteSeleccionada
            .peso_gramos || null
      }
    );

    cerrarModalProducto();
  } catch (error) {
    console.error(
      "Error agregando el producto:",
      error
    );

    alert(
      error.message ||
      "No se pudo agregar el producto al carrito."
    );
  } finally {
    if (
      elementos.botonAgregar &&
      !elementos.modal.hidden
    ) {
      elementos.botonAgregar.disabled =
        false;

      elementos.botonAgregar.textContent =
        textoOriginal;
    }
  }
}

/* ==================================================
   EVENTOS DEL MODAL
================================================== */

function iniciarEventosModalProducto() {
  const elementos = obtenerElementosModal();

  if (!elementos.modal) {
    console.warn(
      "El modal de producto no está disponible."
    );

    return;
  }

  elementos.botonCerrar?.addEventListener(
    "click",
    cerrarModalProducto
  );

  elementos.overlay?.addEventListener(
    "click",
    cerrarModalProducto
  );

  elementos.selectorSabor?.addEventListener(
    "change",
    cambiarSaborSeleccionado
  );

  elementos.botonRestar?.addEventListener(
    "click",
    () => {
      actualizarCantidadModal(
        cantidadSeleccionada - 1
      );
    }
  );

  elementos.botonSumar?.addEventListener(
    "click",
    () => {
      actualizarCantidadModal(
        cantidadSeleccionada + 1
      );
    }
  );

  elementos.botonAgregar?.addEventListener(
    "click",
    agregarProductoDesdeModal
  );

  document.addEventListener(
    "keydown",
    (evento) => {
      if (evento.key !== "Escape") {
        return;
      }

      if (!elementos.modal.hidden) {
        cerrarModalProducto();
      }
    }
  );
}

/* ==================================================
   IR A LOS PRODUCTOS
   Al elegir una categoría o buscar, la página se
   recarga: la llevamos a los resultados con una
   bajada suave en vez de dejarla arriba de todo.
================================================== */

/* Acelera y frena suave (ease-in-out) */
function suavizarBajada(t) {
  return t < 0.5
    ? 8 * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function irAProductos() {
  const seccion = document.getElementById("productos");

  if (!seccion) return;

  const header = document.querySelector(".header");

  const alturaHeader = header
    ? header.getBoundingClientRect().height
    : 0;

  const inicio = window.scrollY;

  const destino = Math.max(
    seccion.getBoundingClientRect().top +
      inicio -
      alturaHeader -
      16,
    0
  );

  const distancia = destino - inicio;

  const sinMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (sinMovimiento || Math.abs(distancia) < 4) {
    window.scrollTo({ top: destino, behavior: "instant" });
    return;
  }

  /* Más lejos, un poco más de tiempo, entre 0,7 y 1,1 segundos */
  const duracion = Math.min(
    Math.max(Math.abs(distancia), 700),
    1100
  );

  let cancelada = false;

  /* Si el usuario scrollea por su cuenta, le dejamos el control */
  const cancelar = () => {
    cancelada = true;
  };

  const eventosUsuario = ["wheel", "touchstart", "keydown", "mousedown"];

  eventosUsuario.forEach((evento) =>
    window.addEventListener(evento, cancelar, {
      once: true,
      passive: true
    })
  );

  const limpiar = () =>
    eventosUsuario.forEach((evento) =>
      window.removeEventListener(evento, cancelar)
    );

  /* Una pausa breve para que se vea la página antes de bajar */
  setTimeout(() => {
    const comienzo = performance.now();

    const paso = (ahora) => {
      if (cancelada) {
        limpiar();
        return;
      }

      const progreso = Math.min(
        (ahora - comienzo) / duracion,
        1
      );

      window.scrollTo({
        top: inicio + distancia * suavizarBajada(progreso),
        behavior: "instant"
      });

      if (progreso < 1) {
        requestAnimationFrame(paso);
      } else {
        limpiar();
      }
    };

    requestAnimationFrame(paso);
  }, 180);
}

/* ==================================================
   BUSCADOR
================================================== */

function initBusqueda() {
  const form = document.getElementById(
    "form-busqueda"
  );

  if (!form) return;

  form.addEventListener(
    "submit",
    (evento) => {
      evento.preventDefault();

      const input = document.getElementById(
        "input-busqueda"
      );

      const valor = input.value.trim();

      const url = new URL(
        window.location.href
      );

      url.search = "";

      if (valor) {
        url.searchParams.set(
          "buscar",
          valor
        );
      }

      window.location.href =
        url.toString();
    }
  );
}

/* ==================================================
   INICIALIZACIÓN
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    cargarCategorias();
    cargarProductos();
    initBusqueda();
    iniciarEventosModalProducto();
  }
);