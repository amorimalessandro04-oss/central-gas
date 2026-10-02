const express = require('express');
const { listar, criar, atualizar } = require('../controllers/produtosController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', listar);                 // público (catálogo do cliente)
router.post('/', auth, criar);           // gestão
router.put('/:id', auth, atualizar);     // gestão

module.exports = router;
