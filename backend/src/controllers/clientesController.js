// Controller de clientes
const db = require('../config/database');

// Lista clientes com dias desde o último pedido (ordenado pelos mais "sumidos")
async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, telefone, email, tipo_padrao, endereco, ultimo_pedido,
              CASE WHEN ultimo_pedido IS NOT NULL
                   THEN (CURRENT_DATE - ultimo_pedido::date)
              END AS dias_sem_pedir
       FROM clientes
       ORDER BY dias_sem_pedir DESC NULLS LAST, nome`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Busca cliente pelo telefone (usado no checkout para histórico)
async function buscarPorTelefone(req, res, next) {
  try {
    const { telefone } = req.params;
    const { rows } = await db.query('SELECT * FROM clientes WHERE telefone = $1', [telefone]);
    if (!rows[0]) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorTelefone };
