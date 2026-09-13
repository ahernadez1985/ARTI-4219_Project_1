const express = require('express');
const bcrypt = require('bcryptjs');
const { findByEmail, findById } = require('../data/users');
const { getClientById } = require('../config/clients');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/auth/login
// Autenticación básica por email + contraseña contra usuarios simulados.
// Devuelve un JWT (identidad + clientId) y un resumen del cliente para
// que el frontend pueda pintar el encabezado inmediatamente.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'bad_request', message: 'Email y contraseña son requeridos.' });
  }

  const user = findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Credenciales inválidas.' });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Credenciales inválidas.' });
  }

  const client = getClientById(user.clientId);

  const token = signToken({ sub: user.id, email: user.email, clientId: user.clientId });

  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, clientId: user.clientId },
    client: client
      ? { clientId: client.clientId, clientName: client.clientName, environment: client.environment, theme: client.theme }
      : null
  });
});

// GET /api/v1/auth/me
// Confirma la sesión activa a partir del token (útil al recargar el frontend).
router.get('/me', requireAuth, (req, res) => {
  const user = findById(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'not_found', message: 'Usuario no encontrado.' });
  }
  const client = getClientById(user.clientId);
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, clientId: user.clientId },
    client: client
      ? { clientId: client.clientId, clientName: client.clientName, environment: client.environment, theme: client.theme }
      : null
  });
});

module.exports = router;
