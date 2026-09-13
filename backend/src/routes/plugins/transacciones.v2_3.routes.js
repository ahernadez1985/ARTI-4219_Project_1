const express = require('express');
const { getTransactions } = require('../../data/transactions.data');

const router = express.Router();

// GET /api/plugins/transacciones/v2.3/transactions
// Montado en server.js detrás de requireAuth + requirePluginVersion('transacciones','2.3').
router.get('/transactions', (req, res) => {
  const payload = getTransactions('2.3');
  return res.json(payload);
});

module.exports = router;
