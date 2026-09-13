const express = require('express');
const { getTransactions } = require('../../data/transactions.data');

const router = express.Router();

// GET /api/plugins/transacciones/v3.1/transactions
// Misma "forma" de contrato que v2.3 (plugin/version/meta/data), pero con
// columnas y filtros propios de esta versión -> el frontend genérico se adapta solo.
router.get('/transactions', (req, res) => {
  const payload = getTransactions('3.1');
  return res.json(payload);
});

module.exports = router;
