// ============================================================
// CENTRAL GÁS - Servidor Express
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { hashPassword } = require('./utils/password');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => { if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origem não autorizada pelo CORS')); }, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/caixa', require('./routes/caixa'));

app.get('/api/saude', async (req, res) => {
  try {
    await db.query('SELECT 1 AS ok');
    res.json({ status: 'ok', app: 'Central Gás', banco: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'erro', app: 'Central Gás', banco: 'indisponivel' });
  }
});

app.use(errorHandler);

async function initializeDatabase() {
  await db.query('SELECT 1 AS ok');
  console.log('Banco de dados conectado/verificado.');
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NAME || 'Gerente';
  if (!email || !password) throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD precisam ser configurados.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  const { rows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (rows.length === 0) {
    const hash = await hashPassword(password);
    await db.query('INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3)', [email, hash, nome]);
    console.log(`Usuário gerente criado: ${email}`);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Central Gás API rodando na porta ${PORT}`);
  try {
    await initializeDatabase();
    await seedAdmin();
  } catch (err) {
    console.error('Aviso: não foi possível inicializar o banco/usuário admin:', err.message);
  }
});
