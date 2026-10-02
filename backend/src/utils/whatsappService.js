// Serviço de envio de mensagens WhatsApp via Twilio
const whatsapp = require('../config/whatsapp');

// Monta a mensagem de novo pedido para o gerente
function montarMensagemPedido(pedido, cliente, itens) {
  const listaItens = itens
    .map((i) => `${i.quantidade}x ${i.nome}`)
    .join(' + ');
  const tipo = pedido.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada';
  const total = Number(pedido.total).toFixed(2).replace('.', ',');

  return (
    `Olá! 🎉 Novo pedido recebido!\n` +
    `Cliente: ${cliente.nome}\n` +
    `Telefone: ${cliente.telefone}\n` +
    `Produtos: ${listaItens}\n` +
    `Total: R$ ${total}\n` +
    `Tipo: ${tipo}\n` +
    (pedido.observacoes ? `Obs: ${pedido.observacoes}\n` : '') +
    `Confirme o pedido respondendo aqui!`
  );
}

// Envia a notificação de novo pedido para o WhatsApp do gerente
async function notificarNovoPedido(pedido, cliente, itens) {
  const mensagem = montarMensagemPedido(pedido, cliente, itens);

  if (!whatsapp.ativo || !whatsapp.gerente) {
    console.log('[WhatsApp desativado] Mensagem que seria enviada:\n' + mensagem);
    return false;
  }

  try {
    await whatsapp.client.messages.create({
      from: whatsapp.from,
      to: whatsapp.gerente,
      body: mensagem,
    });
    return true;
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err.message);
    return false;
  }
}

module.exports = { notificarNovoPedido, montarMensagemPedido };
