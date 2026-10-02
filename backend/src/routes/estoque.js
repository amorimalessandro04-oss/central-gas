const express = require('express');
const { listar, movimentar, ajustarMinimo } = require('../controllers/estoqueController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, listar);
router.post('/movimentacao', auth, movimentar);
router.patch('/:produto_id/minimo', auth, ajustarMinimo);

module.exports = router;
