import { useState } from 'react';
import { estaLogado, logout, getUsuario } from '../services/auth';
import Login from '../components/Gestao/Login.jsx';
import Dashboard from '../components/Gestao/Dashboard.jsx';
import CaixaDiario from '../components/Gestao/CaixaDiario.jsx';
import ControleProdutos from '../components/Gestao/ControleProdutos.jsx';
import ControleEstoque from '../components/Gestao/ControleEstoque.jsx';
import HistoricoClientes from '../components/Gestao/HistoricoClientes.jsx';
import PedidosRecentes from '../components/Gestao/PedidosRecentes.jsx';

const TELAS = [
  { id: 'dashboard', rotulo: '📊 Dashboard' },
  { id: 'caixa', rotulo: '💰 Caixa do Dia' },
  { id: 'produtos', rotulo: '🏷️ Produtos' },
  { id: 'estoque', rotulo: '📦 Estoque' },
  { id: 'clientes', rotulo: '👥 Clientes' },
  { id: 'pedidos', rotulo: '🧾 Pedidos' },
];

export default function GestaoPage() {
  const [logado, setLogado] = useState(estaLogado());
  const [tela, setTela] = useState('dashboard');
  const usuario = getUsuario();

  if (!logado) {
    return <Login onLogado={() => setLogado(true)} />;
  }

  function sair() {
    logout();
    setLogado(false);
  }

  return (
    <div className="gestao-layout">
      <nav className="menu-lateral">
        <h2>Central Gás{usuario?.nome ? ` • ${usuario.nome}` : ''}</h2>
        {TELAS.map((t) => (
          <button key={t.id} className={tela === t.id ? 'ativo' : ''} onClick={() => setTela(t.id)}>
            {t.rotulo}
          </button>
        ))}
        <button className="sair" onClick={sair}>🚪 Sair</button>
      </nav>

      <main className="conteudo-gestao">
        {tela === 'dashboard' && <Dashboard />}
        {tela === 'caixa' && <CaixaDiario />}
        {tela === 'produtos' && <ControleProdutos />}
        {tela === 'estoque' && <ControleEstoque />}
        {tela === 'clientes' && <HistoricoClientes />}
        {tela === 'pedidos' && <PedidosRecentes />}
      </main>
    </div>
  );
}
