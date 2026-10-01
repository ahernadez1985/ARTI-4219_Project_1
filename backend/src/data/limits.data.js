// Datos simulados de "Límites y Alertas" (v1.0 y v1.1).
// Guarda estado mutable en memoria (como el historial de certificados) para
// que activar/desactivar una alerta se refleje en llamadas subsiguientes
// dentro de la misma ejecución del servidor.

const LIMITES_V1_0 = {
  plugin: 'limites',
  version: '1.0',
  meta: {
    title: 'Límites y Alertas',
    description: 'Configura topes de gasto por canal y recibe alertas cuando se acercan al máximo.'
  },
  limits: [
    { id: 'lim-diario', canal: 'Diario (todos los canales)', montoActual: 1240000, montoMaximo: 3000000, moneda: 'COP' },
    { id: 'lim-atm', canal: 'Retiros ATM', montoActual: 300000, montoMaximo: 1500000, moneda: 'COP' },
    { id: 'lim-online', canal: 'Compras en línea', montoActual: 620000, montoMaximo: 2000000, moneda: 'COP' },
    { id: 'lim-internacional', canal: 'Compras internacionales', montoActual: 178960, montoMaximo: 500000, moneda: 'COP' }
  ]
};

const ALERTS_STORE = [
  { id: 'alerta-80', criterio: 'Aviso al superar el 80% de un límite', canalNotificacion: 'Push + email', activa: true },
  { id: 'alerta-internacional', criterio: 'Toda compra internacional', canalNotificacion: 'Push', activa: true },
  { id: 'alerta-atm-nocturno', criterio: 'Retiro ATM entre 10pm y 6am', canalNotificacion: 'SMS', activa: false }
];

// v1.1 = mejora sobre v1.0: el cliente puede ajustar el monto máximo de
// cada límite (meta.editable habilita la edición en el frontend). Los
// límites son estado mutable en memoria, separado del de v1.0, para que un
// cliente que siga en v1.0 no vea cambios hechos desde v1.1.
const LIMITES_V1_1 = {
  plugin: 'limites',
  version: '1.1',
  meta: {
    title: 'Límites y Alertas',
    description: 'Configura topes de gasto por canal, ajústalos cuando lo necesites y recibe alertas cuando se acercan al máximo.',
    editable: true,
    maxPermitido: 20000000
  },
  limits: LIMITES_V1_0.limits.map((lim) => ({ ...lim }))
};

function getLimits(version) {
  if (version === '1.0') return LIMITES_V1_0;
  if (version === '1.1') return LIMITES_V1_1;
  return null;
}

// Solo v1.1. Devuelve { limit } o { error } con un mensaje para el usuario.
function updateLimit(version, limitId, montoMaximo) {
  const catalog = getLimits(version);
  if (!catalog || !catalog.meta.editable) return { error: 'Esta versión no permite editar límites.' };
  const limit = catalog.limits.find((l) => l.id === limitId);
  if (!limit) return { notFound: true };
  if (!Number.isInteger(montoMaximo) || montoMaximo <= 0) {
    return { error: 'El monto máximo debe ser un número entero positivo.' };
  }
  if (montoMaximo < limit.montoActual) {
    return { error: `El monto máximo no puede ser menor a lo ya consumido ($${limit.montoActual.toLocaleString('es-CO')}).` };
  }
  if (montoMaximo > catalog.meta.maxPermitido) {
    return { error: `El monto máximo no puede superar $${catalog.meta.maxPermitido.toLocaleString('es-CO')}.` };
  }
  limit.montoMaximo = montoMaximo;
  return { limit };
}

function getAlerts() {
  return ALERTS_STORE;
}

function toggleAlert(alertId) {
  const alert = ALERTS_STORE.find((a) => a.id === alertId);
  if (!alert) return null;
  alert.activa = !alert.activa;
  return alert;
}

module.exports = { getLimits, updateLimit, getAlerts, toggleAlert };
