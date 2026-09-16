require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { requireAuth, requirePluginVersion } = require('./middleware/auth');

const authRoutes = require('./routes/auth.routes');
const clientsRoutes = require('./routes/clients.routes');
const transaccionesV23 = require('./routes/plugins/transacciones.v2_3.routes');
const transaccionesV31 = require('./routes/plugins/transacciones.v3_1.routes');
const certificadosV18 = require('./routes/plugins/certificados.v1_8.routes');
const certificadosV12 = require('./routes/plugins/certificados.v1_2.routes');
const certificadosV13 = require('./routes/plugins/certificados.v1_3.routes');
const limitesV10 = require('./routes/plugins/limites.v1_0.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// --- Salud del servicio ---
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'portal-plugins-backend' });
});

// --- Autenticación e identidad ---
app.use('/api/v1/auth', authRoutes);

// --- Manifiesto de plugins por cliente (versiones + APIs a consumir) ---
app.use('/api/v1/clients', clientsRoutes);

// --- APIs versionadas por plugin ---
// Cada router se monta detrás de dos guardas:
//   1) requireAuth              -> el usuario debe tener sesión válida (JWT)
//   2) requirePluginVersion(..) -> el cliente del usuario debe tener ESTA
//                                  versión específica habilitada en su manifiesto
// Así, backend y frontend quedan sincronizados por contrato: si el manifiesto
// de un cliente cambia de versión, el frontend deja de usar la ruta vieja
// (porque ya no aparece en /clients/me/plugins) y la ruta vieja además
// rechazaría la llamada aunque alguien la invocara a mano.
app.use(
  '/api/plugins/transacciones/v2.3',
  requireAuth,
  requirePluginVersion('transacciones', '2.3'),
  transaccionesV23
);
app.use(
  '/api/plugins/transacciones/v3.1',
  requireAuth,
  requirePluginVersion('transacciones', '3.1'),
  transaccionesV31
);
app.use(
  '/api/plugins/certificados/v1.8',
  requireAuth,
  requirePluginVersion('certificados', '1.8'),
  certificadosV18
);
app.use(
  '/api/plugins/certificados/v1.2',
  requireAuth,
  requirePluginVersion('certificados', '1.2'),
  certificadosV12
);
// v1.3 es la mejora sobre v1.2 (agrega historial de certificados emitidos).
// v1.2 se deja montada aunque ya ningún cliente apunte a ella: así una
// integración que quedó en esa versión durante una migración sigue viva.
app.use(
  '/api/plugins/certificados/v1.3',
  requireAuth,
  requirePluginVersion('certificados', '1.3'),
  certificadosV13
);
app.use(
  '/api/plugins/limites/v1.0',
  requireAuth,
  requirePluginVersion('limites', '1.0'),
  limitesV10
);

// --- 404 y manejo de errores ---
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Recurso no encontrado.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`portal-plugins-backend escuchando en http://localhost:${PORT}`);
});

module.exports = app;
