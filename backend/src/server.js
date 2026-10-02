// ============================================================
// CENTRAL GÁS - Servidor Express
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Rotas públicas e protegidas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/caixa', require('./routes/caixa'));

// Health check
app.get('/api/saude', (req, res) => res.json({ status: 'ok', app: 'Central Gás' }));

app.use(errorHandler);

// Cria o usuário gerente padrão na primeira execução
async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.query(schema);
  console.log('Banco de dados inicializado/verificado.');
}

async function seedAdmin() {
  const email = 'admin@centralgas.com';
  const { rows } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.query('INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3)', [email, hash, 'Gerente']);
    console.log('Usuário gerente criado: admin@centralgas.com / admin123 (TROQUE a senha!)');
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
