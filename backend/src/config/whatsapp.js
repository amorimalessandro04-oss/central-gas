// Configuração do cliente Twilio (WhatsApp)
// Se as credenciais não estiverem configuradas, o envio é desativado (modo simulação).
require('dotenv').config();

let client = null;
const ativo = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

if (ativo) {
  const twilio = require('twilio');
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

module.exports = {
  client,
  ativo,
  from: process.env.TWILIO_WHATSAPP_NUMBER || '',
  gerente: process.env.GERENTE_WHATSAPP || '',
};
