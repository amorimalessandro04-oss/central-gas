// Adaptador PostgreSQL via Supabase Data API (sem banco pago no Render).
require('dotenv').config();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
const DB_SECRET = process.env.CENTRAL_GAS_DB_SECRET || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !DB_SECRET) {
  console.warn('Supabase não configurado: SUPABASE_URL, SUPABASE_ANON_KEY e CENTRAL_GAS_DB_SECRET são obrigatórios.');
}

async function rpc(name, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !DB_SECRET) throw new Error('Banco não configurado');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.error || data?.hint || `Supabase HTTP ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status, details: data });
  }
  return data;
}

async function query(text, params = []) {
  const result = await rpc('central_gas_query2', { p_sql: text, p_params: params, p_secret: DB_SECRET });
  return result;
}

async function createOrder(cliente, tipoEntrega, itens, observacoes) {
  return rpc('central_gas_create_order', {
    p_cliente: cliente,
    p_tipo_entrega: tipoEntrega,
    p_itens: itens,
    p_observacoes: observacoes || null,
  });
}

async function stockMove(produtoId, tipo, quantidade, motivo, usuarioId) {
  return rpc('central_gas_stock_move', {
    p_produto_id: produtoId,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_motivo: motivo || null,
    p_usuario_id: usuarioId || null,
  });
}

module.exports = {
  query, createOrder, stockMove, rpc,
  pool: {
    connect: async () => ({
      query: async () => { throw new Error('Use a operação transacional específica do banco.'); },
      release: () => {},
    }),
  },
};
