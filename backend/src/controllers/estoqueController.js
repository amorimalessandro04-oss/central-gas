// Controller de estoque
const db = require('../config/database');

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

async function movimentar(req, res, next) {
  try {
    const { produto_id, tipo, quantidade, motivo } = req.body;
    if (!produto_id || !['entrada', 'saida'].includes(tipo) || !quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Produto, tipo (entrada/saida) e quantidade são obrigatórios' });
    }
    const estoque = await db.stockMove(produto_id, tipo, quantidade, motivo, req.usuario?.id);
    res.status(201).json(estoque);
  } catch (err) {
    next(err);
  }
}

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
