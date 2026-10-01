// Combina la configuración individual de cada cliente (un archivo por
// cliente en esta misma carpeta) en el registro que usa el resto del
// backend. Agregar un cliente nuevo es: crear su archivo aquí y sumarlo
// a este índice — nada más en el backend necesita cambiar.

const bancoAndino = require('./banco-andino');
const nexapay = require('./nexapay');

const ALL_CLIENTS = {
  [bancoAndino.clientId]: bancoAndino,
  [nexapay.clientId]: nexapay
};

// Modo de un solo cliente: si la variable CLIENT_ID está definida (la
// inyecta el entorno efímero del Golden Path), esta instancia solo atiende
// a ese cliente; para los demás es como si no existieran. Sin la variable,
// el portal es multi-cliente como siempre.
const SINGLE_CLIENT_ID = process.env.CLIENT_ID || null;

if (SINGLE_CLIENT_ID && !ALL_CLIENTS[SINGLE_CLIENT_ID]) {
  throw new Error(
    `CLIENT_ID="${SINGLE_CLIENT_ID}" no existe en config/clients (disponibles: ${Object.keys(ALL_CLIENTS).join(', ')})`
  );
}

const CLIENTS = SINGLE_CLIENT_ID
  ? { [SINGLE_CLIENT_ID]: ALL_CLIENTS[SINGLE_CLIENT_ID] }
  : ALL_CLIENTS;

function getClientById(clientId) {
  return CLIENTS[clientId] || null;
}

// ¿Esta instancia atiende a este cliente?
function isClientAllowed(clientId) {
  return Boolean(getClientById(clientId));
}

// Usado por los routers versionados para verificar que el cliente autenticado
// realmente tiene habilitada ESA versión del plugin (y no otra).
function clientHasPluginVersion(clientId, pluginKey, version) {
  const client = getClientById(clientId);
  if (!client) return false;
  return client.plugins.some((p) => p.key === pluginKey && p.version === version);
}

module.exports = { CLIENTS, SINGLE_CLIENT_ID, getClientById, isClientAllowed, clientHasPluginVersion };
