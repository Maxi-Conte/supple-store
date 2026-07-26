function usuarioActual() {
  const raw = localStorage.getItem('usuario');
  return raw ? JSON.parse(raw) : null;
}

function guardarSesion(usuario, token) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  localStorage.setItem('token', token);
  actualizarBotonCuenta();
}

function cerrarSesion() {
  localStorage.removeItem('usuario');
  localStorage.removeItem('token');
  actualizarBotonCuenta();
}

function actualizarBotonCuenta() {
  const btn = document.getElementById('btn-cuenta');
  if (!btn) return;
  const usuario = usuarioActual();
  btn.textContent = usuario ? `Hola, ${usuario.nombre.split(' ')[0]}` : 'Ingresar';
}

function initAuthModal() {
  const modal = document.getElementById('modal-auth');
  const btnCuenta = document.getElementById('btn-cuenta');
  const btnCerrar = document.getElementById('modal-auth-cerrar');
  const form = document.getElementById('form-auth');
  const errorBox = document.getElementById('modal-auth-error');
  const titulo = document.getElementById('modal-auth-titulo');
  const campoNombre = document.getElementById('campo-nombre');
  const btnSwitch = document.getElementById('btn-switch-modo');
  const submitBtn = document.getElementById('btn-auth-submit');

  let modoRegistro = false;

  function render() {
    titulo.textContent = modoRegistro ? 'Crear cuenta' : 'Ingresar';
    campoNombre.style.display = modoRegistro ? 'block' : 'none';
    submitBtn.textContent = modoRegistro ? 'Crear cuenta' : 'Ingresar';
    btnSwitch.textContent = modoRegistro ? '¿Ya tenés cuenta? Ingresá' : '¿No tenés cuenta? Registrate';
    errorBox.classList.remove('visible');
  }

  btnCuenta.addEventListener('click', () => {
    if (usuarioActual()) {
      cerrarSesion();
      return;
    }
    modal.classList.add('abierto');
    render();
  });

  btnCerrar.addEventListener('click', () => modal.classList.remove('abierto'));
  btnSwitch.addEventListener('click', () => { modoRegistro = !modoRegistro; render(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('visible');
    const email = document.getElementById('campo-email').value.trim();
    const password = document.getElementById('campo-password').value;
    const nombre = document.getElementById('campo-nombre-input').value.trim();

    try {
      const payload = modoRegistro ? { nombre, email, password } : { email, password };
      const ruta = modoRegistro ? '/auth/registro' : '/auth/login';
      const data = await api.post(ruta, payload);
      guardarSesion(data.usuario, data.token);
      modal.classList.remove('abierto');
      form.reset();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('visible');
    }
  });

  actualizarBotonCuenta();
}

document.addEventListener('DOMContentLoaded', initAuthModal);