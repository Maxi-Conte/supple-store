-- ==========================================
-- Schema de la tienda de suplementos
-- ==========================================

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  nombre VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  descripcion TEXT,
  precio NUMERIC(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  imagen_url VARCHAR(500),
  -- Datos de la "etiqueta" que se muestra en la card (sello estilo certificado de análisis)
  dato_destacado VARCHAR(50),   -- ej: "24g PROT" o "5g" (creatina monohidrato)
  sabor VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  creado_en TIMESTAMP DEFAULT NOW()
);

-- El carrito puede pertenecer a un usuario logueado O a un invitado (identificado por cookie/uuid)
CREATE TABLE IF NOT EXISTS carritos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  session_token VARCHAR(100) UNIQUE, -- usado cuando es invitado
  creado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_carrito_dueno CHECK (usuario_id IS NOT NULL OR session_token IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS carrito_items (
  id SERIAL PRIMARY KEY,
  carrito_id INTEGER REFERENCES carritos(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 1,
  UNIQUE(carrito_id, producto_id)
);

CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  email_comprador VARCHAR(200),
  total NUMERIC(10,2) NOT NULL,
  estado VARCHAR(30) DEFAULT 'pendiente', -- pendiente | pagado | rechazado | cancelado
  mp_preference_id VARCHAR(100),
  mp_payment_id VARCHAR(100),
  creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orden_items (
  id SERIAL PRIMARY KEY,
  orden_id INTEGER REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  nombre_producto VARCHAR(200), -- copia histórica por si el producto cambia despues
  precio_unitario NUMERIC(10,2) NOT NULL,
  cantidad INTEGER NOT NULL
);

-- ==========================================
-- Datos iniciales de categorías
-- ==========================================
INSERT INTO categorias (nombre, slug, orden) VALUES
  ('Proteínas', 'proteinas', 1),
  ('Creatina', 'creatina', 2),
  ('Pre-entreno', 'pre-entreno', 3),
  ('Aminoácidos', 'aminoacidos', 4),
  ('Vitaminas', 'vitaminas', 5)
ON CONFLICT (slug) DO NOTHING;

-- Productos de ejemplo (para que el catálogo no arranque vacío)
INSERT INTO productos (categoria_id, nombre, slug, descripcion, precio, stock, dato_destacado, sabor, imagen_url)
SELECT c.id, v.nombre, v.slug, v.descripcion, v.precio, v.stock, v.dato, v.sabor, v.img
FROM (VALUES
  ('proteinas', 'Whey Protein Concentrada 2lb', 'whey-protein-2lb', 'Proteína de suero concentrada, 24g de proteína por porción.', 18500.00, 40, '24g PROT', 'Chocolate', ''),
  ('proteinas', 'Whey Protein Isolate 2lb', 'whey-isolate-2lb', 'Aislada de proteína, absorción rápida, bajo en grasas y lactosa.', 22900.00, 25, '27g PROT', 'Vainilla', ''),
  ('creatina', 'Creatina Monohidratada 300g', 'creatina-mono-300g', 'Creatina monohidratada micronizada, 5g por dosis.', 12500.00, 60, '5g CREA', 'Neutro', ''),
  ('pre-entreno', 'Pre-Entreno Explosive 300g', 'pre-explosive-300g', 'Fórmula con cafeína, citrulina y beta-alanina para máximo rendimiento.', 16800.00, 30, '200mg CAF', 'Frutos rojos', ''),
  ('aminoacidos', 'BCAA 2:1:1 400g', 'bcaa-400g', 'Aminoácidos ramificados para recuperación muscular.', 14200.00, 35, '7g BCAA', 'Limonada', ''),
  ('vitaminas', 'Multivitamínico Diario x60', 'multivitaminico-60', 'Complejo vitamínico completo para uso diario.', 9800.00, 50, '12 VIT', '-', '')
) AS v(cat_slug, nombre, slug, descripcion, precio, stock, dato, sabor, img)
JOIN categorias c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;
