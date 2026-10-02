// Controller de autenticação (login do gerente)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (typeof email !== 'string' || typeof senha !== 'string' ||
        !email.trim() || !senha || email.length > 255 || senha.length > 1024) {
      return res.status(400).json({ erro: 'Email e senha válidos são obrigatórios' });
    }

    const { rows } = await db.query(
      'SELECT id, email, senha, nome FROM usuarios WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const usuario = rows[0];

    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ erro: 'Autenticação temporariamente indisponível' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
