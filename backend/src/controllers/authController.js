// Controller de autenticação do gerente
const jwt = require('jsonwebtoken');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body || {};
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const nome = process.env.ADMIN_NAME || 'Gerente';

    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    if (!adminEmail || !adminPassword || !process.env.JWT_SECRET) {
      return res.status(503).json({ erro: 'Autenticação temporariamente indisponível' });
    }
    if (String(email).trim().toLowerCase() !== adminEmail || senha !== adminPassword) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = { id: 1, email: adminEmail, nome };
    const token = jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, usuario });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
