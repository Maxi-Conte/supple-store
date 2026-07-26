async function refrescarCarrito() {
  try {
    const data = await api.get('/carrito');
    renderCarrito(data);
    return data;
  } catch (err) {
    console.error('Error al refrescar el carrito:', err);
  }
}

function renderCarrito(data) {
  const cont = document.getElementById('drawer-items');
  const totalEl = document.getElementById('drawer-total-valor');
  const countEl = document.getElementById('cart-count');
  const btnCheckout = document.getElementById('btn-checkout');

  const cantidadTotal = data.items.reduce((acc, i) => acc + i.cantidad, 0);
  if (countEl) countEl.textContent = cantidadTotal;

  if (!cont) return;

  if (data.items.length === 0) {
    cont.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío. ¡Sumá algo de proteína!</p>';
    if (btnCheckout) btnCheckout.disabled = true;
    if (totalEl) totalEl.textContent = formatearPrecio(0);
    return;
  }

  cont.innerHTML = data.items.map((item) => `
    <div class="item-carrito" data-item-id="${item.item_id}">
      <div class="item-carrito__thumb">
        ${item.imagen_url ? `<img src="${item.imagen_url}" alt="">` : ''}
      </div>
      <div class="item-carrito__info">
        <div class="item-carrito__nombre">${item.nombre}</div>
        <div class="item-carrito__precio">${formatearPrecio(item.precio)}</div>
        <div class="item-carrito__cantidad">
          <button data-accion="restar">−</button>
          <span>${item.cantidad}</span>
          <button data-accion="sumar">+</button>
          <button class="item-carrito__eliminar" data-accion="eliminar">Quitar</button>
        </div>
      </div>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = formatearPrecio(data.total);
  if (btnCheckout) btnCheckout.disabled = false;

  cont.querySelectorAll('[data-accion]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const itemEl = e.target.closest('.item-carrito');
      const itemId = itemEl.dataset.itemId;
      const accion = btn.dataset.accion;
      const item = data.items.find((i) => String(i.item_id) === itemId);

      try {
        if (accion === 'eliminar') {
          await api.delete(`/carrito/items/${itemId}`);
        } else if (accion === 'sumar') {
          await api.put(`/carrito/items/${itemId}`, { cantidad: item.cantidad + 1 });
        } else if (accion === 'restar') {
          if (item.cantidad <= 1) {
            await api.delete(`/carrito/items/${itemId}`);
          } else {
            await api.put(`/carrito/items/${itemId}`, { cantidad: item.cantidad - 1 });
          }
        }
        refrescarCarrito();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function agregarAlCarrito(productoId) {
  try {
    await api.post('/carrito/items', { producto_id: Number(productoId), cantidad: 1 });
    await refrescarCarrito();
    abrirCarrito();
  } catch (err) {
    alert(err.message);
  }
}

function abrirCarrito() {
  document.getElementById('drawer-carrito')?.classList.add('abierto');
  document.getElementById('overlay')?.classList.add('abierto');
}

function cerrarCarrito() {
  document.getElementById('drawer-carrito')?.classList.remove('abierto');
  document.getElementById('overlay')?.classList.remove('abierto');
}

async function iniciarCheckout() {
  const btn = document.getElementById('btn-checkout');
  const usuario = usuarioActual();

  let email = usuario?.email;
  if (!email) {
    email = prompt('Dejanos tu email para el seguimiento de la compra:');
    if (!email) return;
  }

  btn.disabled = true;
  btn.textContent = 'Redirigiendo a Mercado Pago...';

  try {
    const data = await api.post('/pagos/crear-preferencia', { email_comprador: email });
    window.location.href = data.init_point || data.sandbox_init_point;
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Pagar con Mercado Pago';
  }
}

function initCarritoUI() {
  document.getElementById('btn-abrir-carrito')?.addEventListener('click', () => {
    refrescarCarrito();
    abrirCarrito();
  });
  document.getElementById('drawer-cerrar')?.addEventListener('click', cerrarCarrito);
  document.getElementById('overlay')?.addEventListener('click', cerrarCarrito);
  document.getElementById('btn-checkout')?.addEventListener('click', iniciarCheckout);

  refrescarCarrito();
}

document.addEventListener('DOMContentLoaded', initCarritoUI);
