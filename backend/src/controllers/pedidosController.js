// Controller de pedidos.
const db = require('../config/database');
const { notificarNovoPedido } = require('../utils/whatsappService');

function validarPedido(body = {}) {
  const { cliente, tipo_entrega, itens, observacoes } = body;
  if (!cliente || typeof cliente !== 'object' || Array.isArray(cliente)) {
    throw Object.assign(new Error('Dados do cliente inválidos'), { status: 400 });
  }

  const nome = typeof cliente.nome === 'string' ? cliente.nome.trim() : '';
  const telefoneInformado = typeof cliente.telefone === 'string' ? cliente.telefone.trim() : '';
  const telefone = telefoneInformado.replace(/\D/g, '');
  const endereco = typeof cliente.endereco === 'string' ? cliente.endereco.trim() : '';
  const email = typeof cliente.email === 'string' ? cliente.email.trim() : '';
  if (!nome || nome.length > 255 || telefone.length < 10 || telefone.length > 15 || email.length > 255) {
    throw Object.assign(new Error('Nome, telefone ou email inválido'), { status: 400 });
  }
  if (!['entrega', 'retirada'].includes(tipo_entrega)) {
    throw Object.assign(new Error('Tipo de entrega inválido'), { status: 400 });
  }
  if (tipo_entrega === 'entrega' && !endereco) {
    throw Object.assign(new Error('Endereço obrigatório para entrega'), { status: 400 });
  }
  if (observacoes != null && (typeof observacoes !== 'string' || observacoes.length > 1000)) {
    throw Object.assign(new Error('Observações inválidas'), { status: 400 });
  }
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
    throw Object.assign(new Error('Adicione de 1 a 50 itens ao pedido'), { status: 400 });
  }

  const quantidades = new Map();
  for (const item of itens) {
    const produtoId = Number(item?.produto_id);
    const quantidade = Number(item?.quantidade);
    if (!Number.isSafeInteger(produtoId) || produtoId < 1 ||
        !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 100) {
      throw Object.assign(new Error('Produto ou quantidade inválidos'), { status: 400 });
    }
    const somada = (quantidades.get(produtoId) || 0) + quantidade;
    if (somada > 100) {
      throw Object.assign(new Error('Limite de 100 unidades por produto'), { status: 400 });
    }
    quantidades.set(produtoId, somada);
  }

  return {
    cliente: { nome, telefone, email: email || null, endereco: endereco || null },
    tipo_entrega,
    observacoes: observacoes?.trim() || null,
    itens: [...quantidades].map(([produto_id, quantidade]) => ({ produto_id, quantidade })),
  };
}

// Cria cliente/pedido, baixa estoque e registra caixa numa única transação.
async function criar(req, res, next) {
  let client;
  let transacaoAberta = false;
  try {
    const pedidoReq = validarPedido(req.body);
    client = await db.pool.connect();
    await client.query('BEGIN');
    transacaoAberta = true;

    const { cliente, tipo_entrega, itens, observacoes } = pedidoReq;
    const { rows: clientesExistentes } = await client.query(
      `SELECT id FROM clientes
       WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = $1
       ORDER BY ultimo_pedido DESC NULLS LAST LIMIT 1 FOR UPDATE`,
      [cliente.telefone]
    );
    let clienteDb;
    if (clientesExistentes[0]) {
      const { rows } = await client.query(
        `UPDATE clientes SET nome = $1, telefone = $2,
           email = COALESCE($3, email), endereco = COALESCE($4, endereco),
           tipo_padrao = $5, ultimo_pedido = NOW()
         WHERE id = $6 RETURNING *`,
        [cliente.nome, cliente.telefone, cliente.email, cliente.endereco, tipo_entrega, clientesExistentes[0].id]
      );
      clienteDb = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO clientes (nome, telefone, email, endereco, tipo_padrao, ultimo_pedido)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (telefone) DO UPDATE SET
           nome = EXCLUDED.nome,
           email = COALESCE(EXCLUDED.email, clientes.email),
           endereco = COALESCE(EXCLUDED.endereco, clientes.endereco),
           tipo_padrao = EXCLUDED.tipo_padrao,
           ultimo_pedido = NOW()
         RETURNING *`,
        [cliente.nome, cliente.telefone, cliente.email, cliente.endereco, tipo_entrega]
      );
      clienteDb = rows[0];
    }

    let total = 0;
    const itensComPreco = [];
    for (const item of itens) {
      const { rows: prodRows } = await client.query(
        'SELECT * FROM produtos WHERE id = $1 AND ativo = TRUE FOR SHARE',
        [item.produto_id]
      );
      const produto = prodRows[0];
      if (!produto) throw Object.assign(new Error(`Produto ${item.produto_id} não encontrado`), { status: 400 });

      const preco = tipo_entrega === 'entrega'
        ? Number(produto.preco_entrega)
        : Number(produto.preco_retirada);
      const subtotal = preco * item.quantidade;
      total += subtotal;
      itensComPreco.push({ ...item, nome: produto.nome, preco_unitario: preco, subtotal });
    }

    const { rows: pedRows } = await client.query(
      `INSERT INTO pedidos (cliente_id, tipo_entrega, total, observacoes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [clienteDb.id, tipo_entrega, total.toFixed(2), observacoes]
    );
    const pedido = pedRows[0];

    for (const item of itensComPreco) {
      const { rows: estoqueRows } = await client.query(
        `UPDATE estoque
         SET quantidade_atual = quantidade_atual - $1, atualizado_em = NOW()
         WHERE produto_id = $2 AND quantidade_atual >= $1
         RETURNING produto_id`,
        [item.quantidade, item.produto_id]
      );
      if (!estoqueRows[0]) {
        throw Object.assign(new Error(`Estoque insuficiente para ${item.nome}`), { status: 409 });
      }

      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );
    }

    await client.query(
      `INSERT INTO caixa_diario (data, tipo, categoria, descricao, valor)
       VALUES (CURRENT_DATE, 'entrada', 'Venda', $1, $2)`,
      [`Pedido #${pedido.id} - ${clienteDb.nome}`, total.toFixed(2)]
    );

    await client.query('COMMIT');
    transacaoAberta = false;

    // Uma falha de WhatsApp não deve reportar falha num pedido já persistido.
    let enviado = false;
    try {
      enviado = await notificarNovoPedido(pedido, clienteDb, itensComPreco);
      if (enviado) {
        await db.query('UPDATE pedidos SET whatsapp_enviado = TRUE WHERE id = $1', [pedido.id]);
      }
    } catch (err) {
      console.error('Pedido gravado; falha ao concluir notificação WhatsApp:', err.message);
    }

    res.status(201).json({ ...pedido, whatsapp_enviado: enviado, itens: itensComPreco });
  } catch (err) {
    if (transacaoAberta && client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Falha no rollback do pedido:', rollbackError.message);
      }
    }
    next(err);
  } finally {
    client?.release();
  }
}

// Lista pedidos recentes com dados do cliente.
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

// Detalhe de um pedido com itens.
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

// Atualiza status e estorna estoque/caixa no máximo uma vez ao cancelar.
async function atualizarStatus(req, res, next) {
  let client;
  let transacaoAberta = false;
  try {
    const { id } = req.params;
    const { status } = req.body;
    const permitidos = ['pendente', 'confirmado', 'entregue', 'cancelado'];
    if (!permitidos.includes(status)) return res.status(400).json({ erro: 'Status inválido' });

    client = await db.pool.connect();
    await client.query('BEGIN');
    transacaoAberta = true;
    const { rows: pedidoRows } = await client.query(
      'SELECT id, status, total FROM pedidos WHERE id = $1 FOR UPDATE',
      [id]
    );
    const pedido = pedidoRows[0];
    if (!pedido) {
      await client.query('ROLLBACK');
      transacaoAberta = false;
      return res.status(404).json({ erro: 'Pedido não encontrado' });
    }
    if ((pedido.status === 'entregue' && status === 'cancelado') ||
        (pedido.status === 'cancelado' && status !== 'cancelado')) {
      await client.query('ROLLBACK');
      transacaoAberta = false;
      return res.status(409).json({ erro: 'Transição de status não permitida' });
    }

    if (status === 'cancelado' && pedido.status !== 'cancelado') {
      const { rows: itens } = await client.query(
        'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
        [id]
      );
      for (const item of itens) {
        await client.query(
          `UPDATE estoque SET quantidade_atual = quantidade_atual + $1, atualizado_em = NOW()
           WHERE produto_id = $2`,
          [item.quantidade, item.produto_id]
        );
      }
      await client.query(
        `INSERT INTO caixa_diario (data, tipo, categoria, descricao, valor)
         VALUES (CURRENT_DATE, 'saida', 'Cancelamento', $1, $2)`,
        [`Estorno pedido #${id}`, pedido.total]
      );
    }

    const { rows } = await client.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    await client.query('COMMIT');
    transacaoAberta = false;
    res.json(rows[0]);
  } catch (err) {
    if (transacaoAberta && client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
}

// Histórico do cliente por telefone.
async function historicoPorTelefone(req, res, next) {
  try {
    const telefone = String(req.params.telefone || '').replace(/\D/g, '');
    if (telefone.length < 10 || telefone.length > 15) {
      return res.status(400).json({ erro: 'Telefone inválido' });
    }
    const { rows } = await db.query(
      `SELECT p.id, p.data_pedido, p.tipo_entrega, p.status, p.total,
              json_agg(json_build_object(
                'nome', pr.nome, 'quantidade', i.quantidade, 'subtotal', i.subtotal
              )) AS itens
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       JOIN itens_pedido i ON i.pedido_id = p.id
       JOIN produtos pr ON pr.id = i.produto_id
       WHERE regexp_replace(c.telefone, '[^0-9]', '', 'g') = $1
       GROUP BY p.id ORDER BY p.data_pedido DESC LIMIT 20`,
      [telefone]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, detalhar, atualizarStatus, historicoPorTelefone, validarPedido };
