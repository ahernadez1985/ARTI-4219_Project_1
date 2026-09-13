const express = require('express');
const { getClientById } = require('../config/clients');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/clients/me/plugins
// El frontend llama esto justo después de iniciar sesión: le dice qué plugins
// tiene habilitados el cliente del usuario autenticado, en qué versión, y a
// qué baseUrl (versionada) debe apuntar para consumir cada uno. El frontend
// nunca hardcodea /v2.3 ni /v3.1: siempre los toma de aquí.
router.get('/me/plugins', requireAuth, (req, res) => {
  const client = getClientById(req.user.clientId);

  if (!client) {
    return res.status(404).json({ error: 'client_not_found', message: 'No se encontró configuración para este cliente.' });
  }

  return res.json({
    clientId: client.clientId,
    clientName: client.clientName,
    environment: client.environment,
    theme: client.theme,
    plugins: client.plugins
  });
});

module.exports = router;
