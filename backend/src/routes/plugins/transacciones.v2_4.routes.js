const express = require('express');
const { getTransactions } = require('../../data/transactions.data');

const router = express.Router();

// GET /api/plugins/transacciones/v2.4/transactions
// Mismo contrato que v2.3 (plugin/version/meta/data) más `summary`
// (ingresos, egresos y neto de los movimientos aprobados).
router.get('/transactions', (req, res) => {
  const payload = getTransactions('2.4');
  return res.json(payload);
});

module.exports = router;
