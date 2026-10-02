const express = require('express');
const { listar, buscarPorTelefone } = require('../controllers/clientesController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, listar);                          // gestão
router.get('/telefone/:telefone', buscarPorTelefone);   // público (checkout)

module.exports = router;
