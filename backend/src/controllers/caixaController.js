// Controller do caixa diário
const db = require('../config/database');

function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const dataUtc = new Date(`${data}T00:00:00.000Z`);
  return !Number.isNaN(dataUtc.getTime()) && dataUtc.toISOString().slice(0, 10) === data;
}

function dataLocalHoje() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Lista movimentações de uma data (padrão: hoje) + resumo
async function listarPorData(req, res, next) {
  try {
    const data = req.query.data || dataLocalHoje();
    if (!dataValida(data)) return res.status(400).json({ erro: 'Data inválida; use AAAA-MM-DD' });

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
    const { tipo, categoria, descricao, valor, data } = req.body || {};
    const valorNumerico = Number(valor);
    if (!['entrada', 'saida'].includes(tipo) || typeof categoria !== 'string' ||
        !categoria.trim() || categoria.trim().length > 100 ||
        !Number.isFinite(valorNumerico) || valorNumerico <= 0 || valorNumerico > 99999999.99 ||
        (descricao != null && (typeof descricao !== 'string' || descricao.length > 1000)) ||
        data !== undefined && !dataValida(data)) {
      return res.status(400).json({ erro: 'Tipo, categoria e valor são obrigatórios' });
    }

    const { rows } = await db.query(
      `INSERT INTO caixa_diario (data, tipo, categoria, descricao, valor, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data || dataLocalHoje(), tipo, categoria.trim(), descricao?.trim() || null, valorNumerico, req.usuario?.id || null]
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
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) {
      return res.status(400).json({ erro: 'Movimentação inválida' });
    }
    const { rowCount } = await db.query('DELETE FROM caixa_diario WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ erro: 'Movimentação não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarPorData, adicionar, remover };
