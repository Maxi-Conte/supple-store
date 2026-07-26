const imagen = document.getElementById('productoImagen3D');

const productosHero = [
  { imagen: '/img/creatina.png', nombre: 'Creatina Monohidratada', descripcion: '100% pura · 5g por dosis' },
  { imagen: '/img/wheyprotein.png', nombre: 'Whey Protein Isolate', descripcion: '27g proteína por porción' },
  { imagen: '/img/colageno.png', nombre: 'Colágeno', descripcion: 'Recuperación muscular' },
  { imagen: '/img/gelhidratante.png', nombre: 'Gel Hidratante', descripcion: 'Para los que entrenan fuerte' }
];

let indice = 0;

setInterval(() => {
  indice = (indice + 1) % productosHero.length;
  const producto = productosHero[indice];

  // Fade out
  imagen.style.opacity = '0';

  setTimeout(() => {
    // Recién acá, con la imagen ya invisible, cambiamos el src y hacemos fade in
    imagen.src = producto.imagen;
    imagen.style.opacity = '1';
  }, 300);

  document.getElementById('productoNombre3D').textContent = producto.nombre;
  document.getElementById('productoDescripcion3D').textContent = producto.descripcion;
}, 8000);