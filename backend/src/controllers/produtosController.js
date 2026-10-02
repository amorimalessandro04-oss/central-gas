// Controller de produtos.
const db = require('../config/database');

function validarPreco(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 && numero <= 999999;
}

async function listar(req, res, next) {
  try {
    const somenteAtivos = req.query.ativos !== 'false';
    const { rows } = await db.query(
      `SELECT p.*, COALESCE(e.quantidade_atual, 0) AS quantidade_atual
       FROM produtos p
       LEFT JOIN estoque e ON e.produto_id = p.id
       ${somenteAtivos ? 'WHERE p.ativo = TRUE' : ''}
       ORDER BY p.categoria, p.nome`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, categoria, preco_entrega, preco_retirada, descricao, estoque } = req.body || {};
    const quantidade = Number(estoque ?? 0);
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 255 ||
        typeof categoria !== 'string' || !categoria.trim() || categoria.trim().length > 100 ||
        !validarPreco(preco_entrega) || !validarPreco(preco_retirada) ||
        !Number.isInteger(quantidade) || quantidade < 0 ||
        (descricao != null && (typeof descricao !== 'string' || descricao.length > 1000))) {
      return res.status(400).json({ erro: 'Nome, categoria, preços e estoque válidos são obrigatórios' });
    }

    const { rows } = await db.query(
      `INSERT INTO produtos (nome, categoria, preco_entrega, preco_retirada, descricao)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome.trim(), categoria.trim(), Number(preco_entrega), Number(preco_retirada), descricao?.trim() || null]
    );
    const produto = rows[0];

    await db.query(
      `INSERT INTO estoque (produto_id, quantidade_atual)
       VALUES ($1, $2)
       ON CONFLICT (produto_id) DO UPDATE SET quantidade_atual = EXCLUDED.quantidade_atual,
                                             atualizado_em = CURRENT_TIMESTAMP`,
      [produto.id, quantidade]
    );

    res.status(201).json({ ...produto, quantidade_atual: quantidade });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, categoria, preco_entrega, preco_retirada, descricao, ativo, estoque } = req.body || {};
    const quantidade = estoque === undefined ? undefined : Number(estoque);

    if ((nome !== undefined && (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 255)) ||
        (categoria !== undefined && (typeof categoria !== 'string' || !categoria.trim() || categoria.trim().length > 100)) ||
        (preco_entrega !== undefined && !validarPreco(preco_entrega)) ||
        (preco_retirada !== undefined && !validarPreco(preco_retirada)) ||
        (descricao !== undefined && (typeof descricao !== 'string' || descricao.length > 1000)) ||
        (ativo !== undefined && typeof ativo !== 'boolean') ||
        (estoque !== undefined && (!Number.isInteger(quantidade) || quantidade < 0))) {
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

    if (estoque !== undefined) {
      await db.query(
        `INSERT INTO estoque (produto_id, quantidade_atual)
         VALUES ($1, $2)
         ON CONFLICT (produto_id) DO UPDATE SET quantidade_atual = EXCLUDED.quantidade_atual,
                                               atualizado_em = CURRENT_TIMESTAMP`,
        [id, quantidade]
      );
    }

    const { rows: stockRows } = await db.query('SELECT COALESCE(quantidade_atual, 0) AS quantidade_atual FROM estoque WHERE produto_id = $1 LIMIT 1', [id]);
    res.json({ ...rows[0], quantidade_atual: Number(stockRows[0]?.quantidade_atual || 0) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar, validarPreco };
