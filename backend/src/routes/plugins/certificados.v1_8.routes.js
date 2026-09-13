const express = require('express');
const { getCertificateCatalog, generateCertificate } = require('../../data/certificates.data');

const router = express.Router();

// GET /api/plugins/certificados/v1.8/types
router.get('/types', (req, res) => {
  const payload = getCertificateCatalog('1.8');
  return res.json(payload);
});

// POST /api/plugins/certificados/v1.8/generate  { typeId, language }
router.post('/generate', (req, res) => {
  const { typeId } = req.body || {};
  const result = generateCertificate('1.8', typeId);
  if (!result) {
    return res.status(400).json({ error: 'invalid_type', message: 'Tipo de certificado no reconocido para esta versión.' });
  }
  return res.status(201).json(result);
});

module.exports = router;
