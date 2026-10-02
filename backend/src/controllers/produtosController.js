// Controller de produtos
const db = require('../config/database');

// Lista produtos (por padrão só ativos — usado no catálogo do cliente)
async function listar(req, res, next) {
  try {
    const somenteAtivos = req.query.ativos !== 'false';
    const { rows } = await db.query(
      `SELECT * FROM produtos ${somenteAtivos ? 'WHERE ativo = TRUE' : ''} ORDER BY categoria, nome`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// Cria produto e já cria o registro de estoque zerado
async function criar(req, res, next) {
  try {
    const { nome, categoria, preco_entrega, preco_retirada, descricao } = req.body;
    if (!nome || !categoria || preco_entrega == null || preco_retirada == null) {
      return res.status(400).json({ erro: 'Nome, categoria e preços são obrigatórios' });
    }

    const { rows } = await db.query(
      `INSERT INTO produtos (nome, categoria, preco_entrega, preco_retirada, descricao)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome, categoria, preco_entrega, preco_retirada, descricao || null]
    );
    const produto = rows[0];

    await db.query('INSERT INTO estoque (produto_id) VALUES ($1) ON CONFLICT DO NOTHING', [produto.id]);

    res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
}

// Atualiza produto (inclusive ativar/desativar)
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, categoria, preco_entrega, preco_retirada, descricao, ativo } = req.body;

    const { rows } = await db.query(
      `UPDATE produtos SET
         nome = COALESCE($1, nome),
         categoria = COALESCE($2, categoria),
         preco_entrega = COALESCE($3, preco_entrega),
         preco_retirada = COALESCE($4, preco_retirada),
         descricao = COALESCE($5, descricao),
         ativo = COALESCE($6, ativo)
       WHERE id = $7 RETURNING *`,
      [nome, categoria, preco_entrega, preco_retirada, descricao, ativo, id]
    );

    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar };
