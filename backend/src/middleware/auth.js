const { verifyToken } = require('../utils/jwt');
const { clientHasPluginVersion, isClientAllowed } = require('../config/clients');

// Verifica el JWT enviado en "Authorization: Bearer <token>" y adjunta
// la identidad del usuario/cliente a req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Falta el token de autenticación.' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token', message: 'Token inválido o expirado.' });
  }

  // Un token válido de otro cliente (p. ej. emitido por otra instancia con el
  // mismo JWT_SECRET) no sirve en una instancia de un solo cliente.
  if (!isClientAllowed(payload.clientId)) {
    return res.status(403).json({ error: 'client_not_allowed', message: 'Este entorno es de otro cliente.' });
  }

  req.user = payload; // { sub, email, clientId }
  return next();
}

// Autorización a nivel de plugin versionado: además de estar autenticado,
// el cliente del usuario debe tener ESA versión específica del plugin habilitada.
// Esto es lo que mantiene sincronizados el frontend y las APIs versionadas:
// si el manifiesto del cliente cambia de versión, esta ruta deja de responder
// para ese cliente en vez de servir datos de una versión que ya no le corresponde.
function requirePluginVersion(pluginKey, version) {
  return (req, res, next) => {
    if (!req.user || !req.user.clientId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Falta el token de autenticación.' });
    }

    const allowed = clientHasPluginVersion(req.user.clientId, pluginKey, version);
    if (!allowed) {
      return res.status(403).json({
        error: 'plugin_version_not_enabled',
        message: `Tu cliente no tiene habilitada la versión ${version} del plugin "${pluginKey}".`
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requirePluginVersion };
