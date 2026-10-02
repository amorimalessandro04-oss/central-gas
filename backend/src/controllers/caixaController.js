// Controller do caixa diário
const db = require('../config/database');

// Lista movimentações de uma data (padrão: hoje) + resumo
async function listarPorData(req, res, next) {
  try {
    const data = req.query.data || new Date().toISOString().slice(0, 10);

    const { rows: movimentacoes } = await db.query(
      'SELECT * FROM caixa_diario WHERE data = $1 ORDER BY criado_em DESC',
      [data]
    );

    const { rows: resumo } = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS saidas
       FROM caixa_diario WHERE data = $1`,
      [data]
    );

    const entradas = Number(resumo[0].entradas);
    const saidas = Number(resumo[0].saidas);

    res.json({ data, movimentacoes, entradas, saidas, saldo: entradas - saidas });
  } catch (err) {
    next(err);
  }
}

// Adiciona movimentação manual (ex.: combustível, aluguel)
async function adicionar(req, res, next) {
  try {
    const { tipo, categoria, descricao, valor, data } = req.body;
    if (!['entrada', 'saida'].includes(tipo) || !categoria || valor == null || valor <= 0) {
      return res.status(400).json({ erro: 'Tipo, categoria e valor são obrigatórios' });
    }

    const { rows } = await db.query(
      `INSERT INTO caixa_diario (data, tipo, categoria, descricao, valor, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data || new Date().toISOString().slice(0, 10), tipo, categoria, descricao || null, valor, req.usuario?.id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// Remove movimentação (ex.: lançamento errado)
async function remover(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM caixa_diario WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ erro: 'Movimentação não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarPorData, adicionar, remover };
