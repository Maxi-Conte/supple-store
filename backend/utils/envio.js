/* ==================================================
   CONFIGURACIÓN DE ENVÍO Y RETIRO
   Todo se ajusta desde el archivo .env
================================================== */

function numeroDesdeEnv(nombre) {
  const valor = Number(process.env[nombre]);

  return Number.isFinite(valor) && valor > 0
    ? valor
    : 0;
}

function obtenerConfigEnvio() {
  const retiroDireccion = String(
    process.env.RETIRO_DIRECCION || ""
  ).trim();

  return {
    /* Costo fijo del envío a domicilio */
    costo: numeroDesdeEnv("ENVIO_COSTO"),

    /* A partir de este subtotal el envío es gratis (0 = nunca) */
    gratisDesde: numeroDesdeEnv("ENVIO_GRATIS_DESDE"),

    /* El retiro solo se ofrece si hay una dirección cargada */
    retiroHabilitado: Boolean(retiroDireccion),

    retiroDireccion
  };
}

function calcularCostoEnvio(metodoEntrega, subtotal) {
  if (metodoEntrega === "retiro") {
    return 0;
  }

  const config = obtenerConfigEnvio();

  if (
    config.gratisDesde > 0 &&
    subtotal >= config.gratisDesde
  ) {
    return 0;
  }

  return config.costo;
}

/* ==================================================
   VALIDAR DATOS DEL COMPRADOR
   Devuelve { datos } o { error }
================================================== */

function texto(valor, maximo) {
  return String(valor ?? "")
    .trim()
    .slice(0, maximo);
}

function validarDatosComprador(body = {}) {
  const config = obtenerConfigEnvio();

  const datos = {
    nombre: texto(body.nombre, 150),
    email: texto(body.email, 255),
    telefono: texto(body.telefono, 40),
    dni: texto(body.dni, 20).replace(/[.\s-]/g, ""),

    metodo_entrega:
      body.metodo_entrega === "retiro"
        ? "retiro"
        : "envio",

    direccion: texto(body.direccion, 255),
    ciudad: texto(body.ciudad, 120),
    provincia: texto(body.provincia, 120),
    codigo_postal: texto(body.codigo_postal, 15).toUpperCase(),
    notas: texto(body.notas, 500)
  };

  if (datos.nombre.length < 3) {
    return { error: "Ingresá tu nombre y apellido." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
    return { error: "Ingresá un correo electrónico válido." };
  }

  const digitosTelefono =
    datos.telefono.replace(/\D/g, "");

  if (
    digitosTelefono.length < 8 ||
    digitosTelefono.length > 15
  ) {
    return { error: "Ingresá un teléfono válido, con código de área." };
  }

  if (!/^\d{7,11}$/.test(datos.dni)) {
    return { error: "Ingresá un DNI o CUIT válido (solo números)." };
  }

  if (
    datos.metodo_entrega === "retiro" &&
    !config.retiroHabilitado
  ) {
    return { error: "El retiro en local no está disponible." };
  }

  if (datos.metodo_entrega === "envio") {
    if (datos.direccion.length < 5) {
      return { error: "Ingresá la dirección de entrega (calle y número)." };
    }

    if (datos.ciudad.length < 2) {
      return { error: "Ingresá la ciudad o localidad." };
    }

    if (datos.provincia.length < 2) {
      return { error: "Ingresá la provincia." };
    }

    if (!/^[A-Z]?\d{4}[A-Z]{0,3}$/.test(datos.codigo_postal)) {
      return { error: "Ingresá un código postal válido." };
    }
  } else {
    datos.direccion = "";
    datos.ciudad = "";
    datos.provincia = "";
    datos.codigo_postal = "";
  }

  return { datos };
}

module.exports = {
  obtenerConfigEnvio,
  calcularCostoEnvio,
  validarDatosComprador
};
