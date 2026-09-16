const express = require('express');
const { getCertificateCatalog, generateCertificate, getCertificateHistory } = require('../../data/certificates.data');

const router = express.Router();

// GET /api/plugins/certificados/v1.3/types
router.get('/types', (req, res) => {
  const payload = getCertificateCatalog('1.3');
  return res.json(payload);
});

// POST /api/plugins/certificados/v1.3/generate  { typeId }
router.post('/generate', (req, res) => {
  const { typeId } = req.body || {};
  const result = generateCertificate('1.3', typeId);
  if (!result) {
    return res.status(400).json({ error: 'invalid_type', message: 'Tipo de certificado no reconocido para esta versión.' });
  }
  return res.status(201).json(result);
});

// GET /api/plugins/certificados/v1.3/history
// Nuevo en esta versión: lista de certificados generados previamente por
// este cliente (incluye los que se acaban de generar en /generate).
router.get('/history', (req, res) => {
  return res.json({ history: getCertificateHistory('1.3') });
});

module.exports = router;
