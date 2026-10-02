// Controller de pedidos
const db = require('../config/database');
const { notificarNovoPedido } = require('../utils/whatsappService');

async function criar(req, res, next) {
  try {
    const { cliente, tipo_entrega, itens, observacoes } = req.body;
    if (!cliente?.nome || !cliente?.telefone || !tipo_entrega || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Dados do pedido incompletos' });
    }

    const resultado = await db.createOrder(cliente, tipo_entrega, itens, observacoes);
    const pedido = resultado.pedido;
    const clienteDb = resultado.cliente;
    const itensComPreco = resultado.itens || [];

    const enviado = await notificarNovoPedido(pedido, clienteDb, itensComPreco);
    if (enviado) {
      await db.query('UPDATE pedidos SET whatsapp_enviado = TRUE WHERE id = $1', [pedido.id]);
      pedido.whatsapp_enviado = true;
    }

    res.status(201).json({ ...pedido, whatsapp_enviado: enviado, itens: itensComPreco });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const limite = Math.min(Number(req.query.limite) || 50, 200);
    const { rows } = await db.query(
      `SELECT p.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
       ORDER BY p.data_pedido DESC LIMIT $1`,
      [limite]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function detalhar(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: pedRows } = await db.query(
      `SELECT p.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.endereco AS cliente_endereco
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = $1`,
      [id]
    );
    if (!pedRows[0]) return res.status(404).json({ erro: 'Pedido não encontrado' });

    const { rows: itens } = await db.query(
      `SELECT i.*, pr.nome AS produto_nome FROM itens_pedido i
       JOIN produtos pr ON pr.id = i.produto_id WHERE i.pedido_id = $1`,
      [id]
    );

    res.json({ ...pedRows[0], itens });
  } catch (err) {
    next(err);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const permitidos = ['pendente', 'confirmado', 'entregue', 'cancelado'];
    if (!permitidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const { rows } = await db.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Pedido não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function historicoPorTelefone(req, res, next) {
  try {
    const { telefone } = req.params;
    const { rows } = await db.query(
      `SELECT p.id, p.data_pedido, p.tipo_entrega, p.status, p.total,
              json_agg(json_build_object(
                'nome', pr.nome, 'quantidade', i.quantidade, 'subtotal', i.subtotal
              )) AS itens
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       JOIN itens_pedido i ON i.pedido_id = p.id
       JOIN produtos pr ON pr.id = i.produto_id
       WHERE c.telefone = $1
       GROUP BY p.id ORDER BY p.data_pedido DESC LIMIT 20`,
      [telefone]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, detalhar, atualizarStatus, historicoPorTelefone };
