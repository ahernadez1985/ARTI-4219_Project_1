// Datos simulados de "Límites y Alertas" (plugin nuevo, v1.0).
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

function getLimits(version) {
  if (version !== '1.0') return null;
  return LIMITES_V1_0;
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

module.exports = { getLimits, getAlerts, toggleAlert };
