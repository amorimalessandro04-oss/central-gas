// Controller de produtos.
const db = require('../config/database');

function validarPreco(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 && numero <= 999999;
}

// Lista produtos (por padrão só ativos — usado no catálogo do cliente).
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

// Cria produto e estoque em transação para não deixar produto sem registro de estoque.
async function criar(req, res, next) {
  let client;
  let transacaoAberta = false;
  try {
    const { nome, categoria, preco_entrega, preco_retirada, descricao } = req.body || {};
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 255 ||
        typeof categoria !== 'string' || !categoria.trim() || categoria.trim().length > 100 ||
        !validarPreco(preco_entrega) || !validarPreco(preco_retirada) ||
        (descricao != null && (typeof descricao !== 'string' || descricao.length > 1000))) {
      return res.status(400).json({ erro: 'Nome, categoria, preços positivos e descrição válida são obrigatórios' });
    }

    client = await db.pool.connect();
    await client.query('BEGIN');
    transacaoAberta = true;
    const { rows } = await client.query(
      `INSERT INTO produtos (nome, categoria, preco_entrega, preco_retirada, descricao)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome.trim(), categoria.trim(), Number(preco_entrega), Number(preco_retirada), descricao?.trim() || null]
    );
    const produto = rows[0];
    await client.query(
      'INSERT INTO estoque (produto_id) VALUES ($1) ON CONFLICT (produto_id) DO NOTHING',
      [produto.id]
    );
    await client.query('COMMIT');
    transacaoAberta = false;
    res.status(201).json(produto);
  } catch (err) {
    if (transacaoAberta && client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
}

// Atualiza produto (inclusive ativar/desativar).
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, categoria, preco_entrega, preco_retirada, descricao, ativo } = req.body || {};
    if (nome !== undefined && (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 255) ||
        categoria !== undefined && (typeof categoria !== 'string' || !categoria.trim() || categoria.trim().length > 100) ||
        preco_entrega !== undefined && !validarPreco(preco_entrega) ||
        preco_retirada !== undefined && !validarPreco(preco_retirada) ||
        descricao !== undefined && (typeof descricao !== 'string' || descricao.length > 1000) ||
        ativo !== undefined && typeof ativo !== 'boolean') {
      return res.status(400).json({ erro: 'Dados do produto inválidos' });
    }

    const { rows } = await db.query(
      `UPDATE produtos SET
         nome = COALESCE($1, nome),
         categoria = COALESCE($2, categoria),
         preco_entrega = COALESCE($3, preco_entrega),
         preco_retirada = COALESCE($4, preco_retirada),
         descricao = COALESCE($5, descricao),
         ativo = COALESCE($6, ativo)
       WHERE id = $7 RETURNING *`,
      [nome?.trim(), categoria?.trim(), preco_entrega, preco_retirada, descricao?.trim(), ativo, id]
    );

    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar, validarPreco };
