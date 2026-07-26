const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

/**
 * No bloquea el paso si no hay token: simplemente identifica quién es el visitante.
 * - Si trae un JWT válido (login), setea req.usuarioId
 * - Si no, lo trata como invitado y le asegura una cookie "guest_token" para
 *   poder identificar su carrito sin necesidad de cuenta.
 */
function identificarVisitante(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.usuarioId = payload.usuarioId;
      req.esInvitado = false;
      return next();
    } catch (err) {
      // Token inválido o vencido: seguimos como invitado en vez de cortar la request
    }
  }

  let guestToken = req.cookies.guest_token;
  if (!guestToken) {
    guestToken = uuidv4();
    res.cookie('guest_token', guestToken, {
      maxAge: 1000 * 60 * 60 * 24 * 90, // 90 días
      httpOnly: true,
      sameSite: 'lax'
    });
  }
  req.guestToken = guestToken;
  req.esInvitado = true;
  next();
}

function generarToken(usuarioId) {
  return jwt.sign({ usuarioId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { identificarVisitante, generarToken, JWT_SECRET };
