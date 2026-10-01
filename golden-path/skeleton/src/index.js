'use strict';

/**
 * ${{ values.serviceName }}
 *
 * Microservicio generado via Backstage Golden Path — ARTI-4219
 * Seguro por defecto: incluye Helmet, rate limiting y logging estructurado.
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVICE_NAME = '${{ values.serviceName }}';

// ---------------------------------------------------------------
// Contexto del entorno (lo inyecta entorno-cliente/k8s/entorno.yaml).
// En local, sin estas variables, el servicio arranca igual.
// ---------------------------------------------------------------
const CLIENT_ID = process.env.CLIENT_ID || 'local';
const GIT_COMMIT = process.env.GIT_COMMIT || 'desconocido';

/**
 * Configuración específica del cliente: clients/<CLIENT_ID>/config.json
 * (versionada en el repo). Si no existe, el servicio usa sus defaults.
 */
function loadClientConfig() {
  const dir = process.env.CLIENT_CONFIG_DIR;
  if (!dir) return null;
  try {
    const file = require('path').join(dir, 'config.json');
    return JSON.parse(require('fs').readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`[config] ${err.message}`);
    return null;
  }
}
const CLIENT_CONFIG = loadClientConfig();

// ---------------------------------------------------------------
// Seguridad: Helmet configura cabeceras HTTP de seguridad
// (X-Frame-Options, Content-Security-Policy, etc.)
// ---------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------
// Rate Limiting: protege contra ataques de fuerza bruta y DDoS.
// Máximo 100 requests por IP en una ventana de 15 minutos.
// ---------------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' },
});
app.use(limiter);

// ---------------------------------------------------------------
// Logging estructurado (Morgan en formato 'combined')
// ---------------------------------------------------------------
app.use(morgan('combined'));

// ---------------------------------------------------------------
// Parseo de body JSON
// ---------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------

/**
 * GET /health
 * Endpoint de health check. Usado por Kubernetes para liveness/readiness probes.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: SERVICE_NAME,
    clientId: CLIENT_ID,
    commit: GIT_COMMIT,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /
 * Ruta raíz del microservicio.
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: `¡Bienvenido a ${SERVICE_NAME}!`,
    version: '1.0.0',
    clientId: CLIENT_ID,
    commit: GIT_COMMIT,
  });
});

/**
 * GET /config
 * Configuración cargada para el cliente de este entorno.
 */
app.get('/config', (req, res) => {
  if (!CLIENT_CONFIG) {
    return res.status(404).json({ error: `Sin configuración para el cliente '${CLIENT_ID}'` });
  }
  return res.status(200).json({ clientId: CLIENT_ID, config: CLIENT_CONFIG });
});

// ---------------------------------------------------------------
// Manejo de rutas no encontradas (404)
// ---------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ---------------------------------------------------------------
// Manejo global de errores (500)
// ---------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------------------------------------------------------------
// Inicio del servidor
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] cliente=${CLIENT_ID} commit=${GIT_COMMIT} escuchando en :${PORT}`);
});

module.exports = app;
