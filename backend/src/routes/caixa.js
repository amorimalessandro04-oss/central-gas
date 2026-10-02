const express = require('express');
const { listarPorData, adicionar, remover } = require('../controllers/caixaController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, listarPorData);
router.post('/', auth, adicionar);
router.delete('/:id', auth, remover);

module.exports = router;
