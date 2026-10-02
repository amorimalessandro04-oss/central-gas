const express = require('express');
const { criar, listar, detalhar, atualizarStatus, historicoPorTelefone } = require('../controllers/pedidosController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', criar);                                  // público (checkout do cliente)
router.get('/historico/:telefone', historicoPorTelefone); // público (histórico do cliente)
router.get('/', auth, listar);                            // gestão
router.get('/:id', auth, detalhar);                       // gestão
router.patch('/:id/status', auth, atualizarStatus);       // gestão

module.exports = router;
