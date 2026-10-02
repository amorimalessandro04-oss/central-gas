// Controller de pedidos
const db = require('../config/database');
const { notificarNovoPedido } = require('../utils/whatsappService');

// Cria pedido: cadastra/atualiza cliente, grava pedido + itens, baixa estoque e notifica WhatsApp
async function criar(req, res, next) {
  const client = await db.pool.connect();
  try {
    const { cliente, tipo_entrega, itens, observacoes } = req.body;

    if (!cliente?.nome || !cliente?.telefone || !tipo_entrega || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Dados do pedido incompletos' });
    }

    await client.query('BEGIN');

    // Cadastra ou atualiza o cliente (telefone é único)
    const { rows: cliRows } = await client.query(
      `INSERT INTO clientes (nome, telefone, email, endereco, tipo_padrao, ultimo_pedido)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (telefone) DO UPDATE SET
         nome = EXCLUDED.nome,
         email = COALESCE(EXCLUDED.email, clientes.email),
         endereco = COALESCE(EXCLUDED.endereco, clientes.endereco),
         tipo_padrao = EXCLUDED.tipo_padrao,
         ultimo_pedido = NOW()
       RETURNING *`,
      [cliente.nome, cliente.telefone, cliente.email || null, cliente.endereco || null, tipo_entrega]
    );
    const clienteDb = cliRows[0];

    // Calcula o total com base nos preços atuais do banco (segurança)
    let total = 0;
    const itensComPreco = [];
    for (const item of itens) {
      const { rows: prodRows } = await client.query('SELECT * FROM produtos WHERE id = $1 AND ativo = TRUE', [item.produto_id]);
      const produto = prodRows[0];
      if (!produto) throw Object.assign(new Error(`Produto ${item.produto_id} não encontrado`), { status: 400 });

      const preco = tipo_entrega === 'entrega' ? Number(produto.preco_entrega) : Number(produto.preco_retirada);
      const subtotal = preco * item.quantidade;
      total += subtotal;
      itensComPreco.push({ ...item, nome: produto.nome, preco_unitario: preco, subtotal });
    }

    // Grava o pedido
    const { rows: pedRows } = await client.query(
      `INSERT INTO pedidos (cliente_id, tipo_entrega, total, observacoes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [clienteDb.id, tipo_entrega, total.toFixed(2), observacoes || null]
    );
    const pedido = pedRows[0];

    // Grava os itens e baixa o estoque
    for (const item of itensComPreco) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );
      await client.query(
        `UPDATE estoque SET quantidade_atual = quantidade_atual - $1, atualizado_em = NOW()
         WHERE produto_id = $2`,
        [item.quantidade, item.produto_id]
      );
    }

    // Registra a venda no caixa do dia (entrada)
    await client.query(
      `INSERT INTO caixa_diario (data, tipo, categoria, descricao, valor)
       VALUES (CURRENT_DATE, 'entrada', 'Venda', $1, $2)`,
      [`Pedido #${pedido.id} - ${clienteDb.nome}`, total.toFixed(2)]
    );

    await client.query('COMMIT');

    // Notifica o gerente no WhatsApp (fora da transação)
    const enviado = await notificarNovoPedido(pedido, clienteDb, itensComPreco);
    if (enviado) {
      await db.query('UPDATE pedidos SET whatsapp_enviado = TRUE WHERE id = $1', [pedido.id]);
    }

    res.status(201).json({ ...pedido, whatsapp_enviado: enviado, itens: itensComPreco });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Lista pedidos recentes com dados do cliente
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

// Detalhe de um pedido com itens
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

// Atualiza status do pedido (pendente/entregue/cancelado)
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

// Histórico de pedidos de um cliente pelo telefone (tela do cliente)
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
