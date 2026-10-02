// CENTRAL GÁS - Servidor Express
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origem não autorizada pelo CORS'), { status: 403 }));
  },
}));
app.use(express.json({ limit: '32kb' }));

// Site e gestão do aplicativo usam a mesma API e o mesmo PostgreSQL.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/caixa', require('./routes/caixa'));

// A API só começa a escutar depois de validar DB e schema.
app.get('/api/saude', (req, res) => res.json({ status: 'ok', app: 'Central Gás' }));
app.use(errorHandler);

function validarConfiguracao() {
  const obrigatorias = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  const ausentes = obrigatorias.filter((nome) => !process.env[nome]);
  if (ausentes.length) {
    throw new Error(`Configuração obrigatória ausente: ${ausentes.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres em produção.');
  }
}

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.query('SELECT 1');
  await db.query(schema);
  console.log('Banco de dados conectado e schema verificado.');
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@centralgas.com').trim().toLowerCase();
  const { rows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (rows.length) return;

  const senha = process.env.ADMIN_PASSWORD;
  if (!senha || senha.length < 12) {
    throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres para criar o primeiro gerente.');
  }

  const hash = await bcrypt.hash(senha, 12);
  const nome = (process.env.ADMIN_NAME || 'Gerente').trim();
  await db.query(
    'INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3)',
    [email, hash, nome]
  );
  console.log(`Usuário gerente criado: ${email}`);
}

async function start(port = Number(process.env.PORT || 5000)) {
  validarConfiguracao();
  await initializeDatabase();
  await seedAdmin();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Central Gás API rodando na porta ${port}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Inicialização do Central Gás falhou:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { app, start, initializeDatabase, seedAdmin, validarConfiguracao };
