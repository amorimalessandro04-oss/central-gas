// Controller de estoque
const db = require('../config/database');

// Lista estoque de todos os produtos com status (baixo/ok)
async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT e.*, p.nome AS produto_nome, p.categoria,
              (e.quantidade_atual <= e.quantidade_minima) AS estoque_baixo
       FROM estoque e JOIN produtos p ON p.id = e.produto_id
       ORDER BY p.nome`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Registra movimentação (entrada/saída) e atualiza a quantidade
async function movimentar(req, res, next) {
  const client = await db.pool.connect();
  try {
    const { produto_id, tipo, quantidade, motivo } = req.body;
    if (!produto_id || !['entrada', 'saida'].includes(tipo) || !quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Produto, tipo (entrada/saida) e quantidade são obrigatórios' });
    }

    await client.query('BEGIN');

    // Garante que existe registro de estoque para o produto
    await client.query(
      'INSERT INTO estoque (produto_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [produto_id]
    );

    const delta = tipo === 'entrada' ? quantidade : -quantidade;
    const { rows } = await client.query(
      `UPDATE estoque SET quantidade_atual = quantidade_atual + $1, atualizado_em = NOW()
       WHERE produto_id = $2 RETURNING *`,
      [delta, produto_id]
    );

    await client.query(
      `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, motivo, usuario_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [produto_id, tipo, quantidade, motivo || null, req.usuario?.id || null]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Ajusta quantidade mínima de um produto
async function ajustarMinimo(req, res, next) {
  try {
    const { produto_id } = req.params;
    const { quantidade_minima } = req.body;
    const { rows } = await db.query(
      `UPDATE estoque SET quantidade_minima = $1, atualizado_em = NOW()
       WHERE produto_id = $2 RETURNING *`,
      [quantidade_minima, produto_id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Estoque não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, movimentar, ajustarMinimo };
