function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);
}

async function cargarCategorias() {
  const nav = document.getElementById('categorias-nav');
  if (!nav) return;

  const params = new URLSearchParams(window.location.search);
  const categoriaActiva = params.get('categoria');

  try {
    const categorias = await api.get('/categorias');
    const linkTodos = `<a href="/" class="${!categoriaActiva ? 'activo' : ''}">Todos</a>`;
    const links = categorias.map(
      (c) => `<a href="/?categoria=${c.slug}" class="${categoriaActiva === c.slug ? 'activo' : ''}">${c.nombre}</a>`
    ).join('');
    nav.innerHTML = linkTodos + links;
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}

const ICONOS_CATEGORIA = {
  'proteinas': '🥤',
  'creatina': '⚡',
  'pre-entreno': '🔥',
  'aminoacidos': '💊',
  'vitaminas': '🌿'
};

function tarjetaProducto(p) {
  const sinStock = p.stock <= 0;
  const icono = ICONOS_CATEGORIA[p.categoria_slug] || '🏋️';
  return `
    <article class="card-producto">
      <div class="card-producto__img">
        ${p.dato_destacado ? `<span class="sello">${p.dato_destacado}</span>` : ''}
        ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}">` : `<span class="card-producto__icono">${icono}</span>`}
      </div>
      <div class="card-producto__body">
        <span class="card-producto__categoria">${p.categoria || ''}</span>
        <h3 class="card-producto__nombre">${p.nombre}</h3>
        ${p.sabor ? `<span class="card-producto__sabor">${p.sabor}</span>` : ''}
        <div class="card-producto__footer">
          <span class="precio">${formatearPrecio(p.precio)}</span>
          ${sinStock
            ? '<span class="sin-stock">Sin stock</span>'
            : `<button class="btn-agregar" data-id="${p.id}">Agregar</button>`}
        </div>
      </div>
    </article>
  `;
}

async function cargarProductos() {
  const grid = document.getElementById('grid-productos');
  const tituloSeccion = document.getElementById('titulo-seccion');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get('categoria');
  const buscar = params.get('buscar');

  const query = new URLSearchParams();
  if (categoria) query.set('categoria', categoria);
  if (buscar) query.set('buscar', buscar);

  try {
    const productos = await api.get(`/productos?${query.toString()}`);

    if (tituloSeccion) {
      if (buscar) tituloSeccion.textContent = `Resultados para "${buscar}"`;
      else if (categoria) tituloSeccion.textContent = categoria.replace('-', ' ');
      else tituloSeccion.textContent = 'Todo el catálogo';
    }

    grid.innerHTML = productos.length
      ? productos.map(tarjetaProducto).join('')
      : '<p class="carrito-vacio">No encontramos productos con ese criterio.</p>';

    grid.querySelectorAll('.btn-agregar').forEach((btn) => {
      btn.addEventListener('click', () => agregarAlCarrito(btn.dataset.id));
    });
  } catch (err) {
    console.error('Error cargando productos:', err);
    grid.innerHTML = '<p class="carrito-vacio">Error al cargar el catálogo.</p>';
  }
}

function initBusqueda() {
  const form = document.getElementById('form-busqueda');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = document.getElementById('input-busqueda').value.trim();
    const url = new URL(window.location.href);
    url.search = '';
    if (valor) url.searchParams.set('buscar', valor);
    window.location.href = url.toString();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCategorias();
  cargarProductos();
  initBusqueda();
});
