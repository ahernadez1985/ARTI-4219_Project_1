const express = require('express');
const { getLimits, getAlerts, toggleAlert } = require('../../data/limits.data');

const router = express.Router();

// GET /api/plugins/limites/v1.0/limits
router.get('/limits', (req, res) => {
  const payload = getLimits('1.0');
  return res.json(payload);
});

// GET /api/plugins/limites/v1.0/alerts
router.get('/alerts', (req, res) => {
  return res.json({ alerts: getAlerts() });
});

// PATCH /api/plugins/limites/v1.0/alerts/:alertId  -> activa/desactiva la alerta
router.patch('/alerts/:alertId', (req, res) => {
  const updated = toggleAlert(req.params.alertId);
  if (!updated) {
    return res.status(404).json({ error: 'not_found', message: 'Alerta no encontrada.' });
  }
  return res.json(updated);
});

module.exports = router;
