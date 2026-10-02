import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Shared/Header.jsx';
import Footer from '../components/Shared/Footer.jsx';
import Catalogo from '../components/Cliente/Catalogo.jsx';
import Carrinho from '../components/Cliente/Carrinho.jsx';
import Checkout from '../components/Cliente/Checkout.jsx';
import HistoricoPedidos from '../components/Cliente/HistoricoPedidos.jsx';

export default function ClientePage() {
  const [aba, setAba] = useState('catalogo'); // catalogo | carrinho | checkout | historico
  const [carrinho, setCarrinho] = useState([]);
  const [tipoEntrega, setTipoEntrega] = useState('entrega');
  const [confirmacao, setConfirmacao] = useState(null);
  const [telefoneCliente, setTelefoneCliente] = useState(() => {
    try { return JSON.parse(localStorage.getItem('central_gas_cliente') || 'null')?.telefone || ''; } catch { return ''; }
  });

  function adicionar(produto) {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.id === produto.id);
      if (existente) {
        return atual.map((i) => (i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...atual, { ...produto, quantidade: 1 }];
    });
  }

  function alterarQtd(id, qtd) {
    if (qtd <= 0) {
      setCarrinho((atual) => atual.filter((i) => i.id !== id));
    } else {
      setCarrinho((atual) => atual.map((i) => (i.id === id ? { ...i, quantidade: qtd } : i)));
    }
  }

  function pedidoConfirmado(pedido, telefone) {
    setConfirmacao(pedido);
    setTelefoneCliente(telefone);
    setCarrinho([]);
  }

  const qtdCarrinho = carrinho.reduce((s, i) => s + i.quantidade, 0);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem('central_gas_cliente') || 'null');
      if (salvo?.telefone) setTelefoneCliente(salvo.telefone);
    } catch {}
  }, []);

  if (confirmacao) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: '3rem' }}>🎉</div>
            <h2>Pedido #{confirmacao.id} confirmado!</h2>
            <p style={{ margin: '10px 0' }}>
              Recebemos seu pedido e o gerente já foi notificado no WhatsApp.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <button className="btn-primario" onClick={() => { setConfirmacao(null); setAba('catalogo'); }}>
                Fazer novo pedido
              </button>
              <button className="btn-neutro" onClick={() => { setConfirmacao(null); setAba('historico'); }}>
                Ver meus pedidos
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header>
        <button className="btn-header" onClick={() => setAba('carrinho')}>
          🛒 {qtdCarrinho > 0 && `(${qtdCarrinho})`}
        </button>
        <Link to="/gestao"><button className="btn-header">Gestão</button></Link>
      </Header>

      <div className="container">
        <div className="abas">
          <button className={aba === 'catalogo' ? 'ativo' : ''} onClick={() => setAba('catalogo')}>Catálogo</button>
          <button className={aba === 'carrinho' ? 'ativo' : ''} onClick={() => setAba('carrinho')}>
            Carrinho {qtdCarrinho > 0 && `(${qtdCarrinho})`}
          </button>
          <button className={aba === 'historico' ? 'ativo' : ''} onClick={() => setAba('historico')}>Meus pedidos</button>
        </div>

        {aba === 'catalogo' && <Catalogo onAdicionar={adicionar} />}

        {aba === 'carrinho' && (
          <Carrinho
            itens={carrinho}
            tipoEntrega={tipoEntrega}
            onAlterarQtd={alterarQtd}
            onIrCheckout={() => setAba('checkout')}
            onContinuar={() => setAba('catalogo')}
          />
        )}

        {aba === 'checkout' && (
          <Checkout
            itens={carrinho}
            tipoEntrega={tipoEntrega}
            setTipoEntrega={setTipoEntrega}
            onConfirmado={pedidoConfirmado}
            onVoltar={() => setAba('carrinho')}
          />
        )}

        {aba === 'historico' && <HistoricoPedidos telefoneInicial={telefoneCliente} />}
      </div>

      <Footer />
    </>
  );
}
