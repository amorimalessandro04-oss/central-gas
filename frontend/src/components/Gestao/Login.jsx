import { useState } from 'react';
import api from '../../services/api';
import { salvarSessao } from '../../services/auth';

export default function Login({ onLogado }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      salvarSessao(data.token, data.usuario);
      onLogado();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao entrar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-container">
      <form className="card login-card" onSubmit={entrar}>
        <img src="/icon-192.png" alt="Central Gás" />
        <h1>Central Gás</h1>
        <p style={{ color: '#6b7280', marginBottom: 10 }}>Área de gestão</p>

        <label style={{ textAlign: 'left' }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label style={{ textAlign: 'left' }}>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />

        {erro && <div className="erro-msg">{erro}</div>}

        <button className="btn-primario" style={{ width: '100%', marginTop: 14 }} disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
