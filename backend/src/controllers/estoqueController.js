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
  let client;
  let transacaoAberta = false;
  try {
    const { produto_id, tipo, quantidade, motivo } = req.body || {};
    const produtoId = Number(produto_id);
    const qtd = Number(quantidade);
    if (!Number.isSafeInteger(produtoId) || produtoId < 1 ||
        !['entrada', 'saida'].includes(tipo) ||
        !Number.isSafeInteger(qtd) || qtd < 1 || qtd > 100000 ||
        (motivo != null && (typeof motivo !== 'string' || motivo.length > 500))) {
      return res.status(400).json({ erro: 'Produto, tipo (entrada/saida) e quantidade são obrigatórios' });
    }

    client = await db.pool.connect();
    await client.query('BEGIN');
    transacaoAberta = true;

    const { rows: produtos } = await client.query('SELECT id FROM produtos WHERE id = $1', [produtoId]);
    if (!produtos[0]) {
      await client.query('ROLLBACK');
      transacaoAberta = false;
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    // Garante que existe registro de estoque para o produto
    await client.query(
      'INSERT INTO estoque (produto_id) VALUES ($1) ON CONFLICT (produto_id) DO NOTHING',
      [produtoId]
    );

    const delta = tipo === 'entrada' ? qtd : -qtd;
    const { rows } = await client.query(
      `UPDATE estoque SET quantidade_atual = quantidade_atual + $1, atualizado_em = NOW()
       WHERE produto_id = $2 AND ( $1 > 0 OR quantidade_atual >= ABS($1) )
       RETURNING *`,
      [delta, produtoId]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      transacaoAberta = false;
      return res.status(409).json({ erro: 'Estoque insuficiente para essa saída' });
    }

    await client.query(
      `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, motivo, usuario_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [produtoId, tipo, qtd, motivo || null, req.usuario?.id || null]
    );

    await client.query('COMMIT');
    transacaoAberta = false;
    res.status(201).json(rows[0]);
  } catch (err) {
    if (transacaoAberta && client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
}

// Ajusta quantidade mínima de um produto
async function ajustarMinimo(req, res, next) {
  try {
    const { produto_id } = req.params;
    const { quantidade_minima } = req.body || {};
    const minimo = Number(quantidade_minima);
    const produtoId = Number(produto_id);
    if (!Number.isSafeInteger(produtoId) || produtoId < 1 ||
        !Number.isSafeInteger(minimo) || minimo < 0 || minimo > 100000) {
      return res.status(400).json({ erro: 'Quantidade mínima inválida' });
    }
    const { rows } = await db.query(
      `UPDATE estoque SET quantidade_minima = $1, atualizado_em = NOW()
       WHERE produto_id = $2 RETURNING *`,
      [minimo, produtoId]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Estoque não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, movimentar, ajustarMinimo };
