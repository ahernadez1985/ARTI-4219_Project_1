// Combina la configuración individual de cada cliente (un archivo por
// cliente en esta misma carpeta) en el registro que usa el resto del
// backend. Agregar un cliente nuevo es: crear su archivo aquí y sumarlo
// a este índice — nada más en el backend necesita cambiar.

const bancoAndino = require('./banco-andino');
const nexapay = require('./nexapay');

const CLIENTS = {
  [bancoAndino.clientId]: bancoAndino,
  [nexapay.clientId]: nexapay
};

function getClientById(clientId) {
  return CLIENTS[clientId] || null;
}

// Usado por los routers versionados para verificar que el cliente autenticado
// realmente tiene habilitada ESA versión del plugin (y no otra).
function clientHasPluginVersion(clientId, pluginKey, version) {
  const client = getClientById(clientId);
  if (!client) return false;
  return client.plugins.some((p) => p.key === pluginKey && p.version === version);
}

module.exports = { CLIENTS, getClientById, clientHasPluginVersion };
