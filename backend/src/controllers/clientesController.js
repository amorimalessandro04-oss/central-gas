// Controller de clientes.
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

// Recupera somente os campos necessários para preencher o checkout.
async function buscarPorTelefone(req, res, next) {
  try {
    const telefone = String(req.params.telefone || '').replace(/\D/g, '');
    if (telefone.length < 10 || telefone.length > 15) {
      return res.status(400).json({ erro: 'Telefone inválido' });
    }

    const { rows } = await db.query(
      `SELECT nome, telefone, email, endereco FROM clientes
       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = $1
       ORDER BY ultimo_pedido DESC NULLS LAST LIMIT 1`,
      [telefone]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorTelefone };
