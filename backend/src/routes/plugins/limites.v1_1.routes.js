const express = require('express');
const { getLimits, updateLimit, getAlerts, toggleAlert } = require('../../data/limits.data');

const router = express.Router();

// GET /api/plugins/limites/v1.1/limits
router.get('/limits', (req, res) => {
  const payload = getLimits('1.1');
  return res.json(payload);
});

// PATCH /api/plugins/limites/v1.1/limits/:limitId  { montoMaximo }
// Nuevo en esta versión: ajustar el monto máximo de un límite.
router.patch('/limits/:limitId', (req, res) => {
  const { montoMaximo } = req.body || {};
  const result = updateLimit('1.1', req.params.limitId, montoMaximo);
  if (result.notFound) {
    return res.status(404).json({ error: 'not_found', message: 'Límite no encontrado.' });
  }
  if (result.error) {
    return res.status(400).json({ error: 'invalid_limit', message: result.error });
  }
  return res.json(result.limit);
});

// GET /api/plugins/limites/v1.1/alerts
router.get('/alerts', (req, res) => {
  return res.json({ alerts: getAlerts() });
});

// PATCH /api/plugins/limites/v1.1/alerts/:alertId  -> activa/desactiva la alerta
router.patch('/alerts/:alertId', (req, res) => {
  const updated = toggleAlert(req.params.alertId);
  if (!updated) {
    return res.status(404).json({ error: 'not_found', message: 'Alerta no encontrada.' });
  }
  return res.json(updated);
});

module.exports = router;
