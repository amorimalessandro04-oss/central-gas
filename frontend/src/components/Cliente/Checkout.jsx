import { useEffect, useState } from 'react';
import api from '../../services/api';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const CLIENTE_STORAGE = 'central_gas_cliente';

function carregarClienteSalvo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CLIENTE_STORAGE) || 'null');
    return salvo && typeof salvo === 'object' ? salvo : null;
  } catch {
    return null;
  }
}

export default function Checkout({ itens, tipoEntrega, setTipoEntrega, onConfirmado, onVoltar }) {
  const [form, setForm] = useState(() => ({
    nome: '', telefone: '', email: '', endereco: '', observacoes: '',
    ...(carregarClienteSalvo() || {})
  }));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [clienteSalvo, setClienteSalvo] = useState(() => !!carregarClienteSalvo());

  const precoDe = (p) => (tipoEntrega === 'entrega' ? p.preco_entrega : p.preco_retirada);
  const total = itens.reduce((s, i) => s + precoDe(i) * i.quantidade, 0);

  useEffect(() => {
    let ativo = true;
    async function recuperarCadastro() {
      const salvo = carregarClienteSalvo();
      if (!salvo?.telefone) return;
      try {
        const { data } = await api.get(`/clientes/telefone/${encodeURIComponent(salvo.telefone)}`);
        if (!ativo || !data) return;
        const atualizado = {
          nome: data.nome || salvo.nome || '',
          telefone: data.telefone || salvo.telefone,
          email: data.email || salvo.email || '',
          endereco: data.endereco || salvo.endereco || '',
        };
        setForm((atual) => ({ ...atual, ...atualizado }));
        localStorage.setItem(CLIENTE_STORAGE, JSON.stringify(atualizado));
        setClienteSalvo(true);
      } catch {
        if (ativo) {
          setForm((atual) => ({ ...atual, ...salvo }));
          setClienteSalvo(true);
        }
      }
    }
    recuperarCadastro();
    return () => { ativo = false; };
  }, []);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function confirmar(e) {
    e.preventDefault();
    setErro('');

    if (!form.nome.trim() || !form.telefone.trim()) {
      setErro('Preencha nome e telefone.');
      return;
    }
    if (tipoEntrega === 'entrega' && !form.endereco.trim()) {
      setErro('Informe o endereço para entrega.');
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post('/pedidos', {
        cliente: {
          nome: form.nome.trim(),
          telefone: form.telefone.trim(),
          email: form.email.trim() || null,
          endereco: form.endereco.trim() || null,
        },
        tipo_entrega: tipoEntrega,
        observacoes: form.observacoes.trim() || null,
        itens: itens.map((i) => ({ produto_id: i.id, quantidade: i.quantidade })),
      });
      const clientePersistido = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || '',
        endereco: form.endereco.trim() || '',
      };
      localStorage.setItem(CLIENTE_STORAGE, JSON.stringify(clientePersistido));
      setClienteSalvo(true);
      onConfirmado(data, form.telefone.trim());
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao confirmar o pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="card" onSubmit={confirmar}>
      <h2 style={{ marginBottom: 10 }}>📦 Finalizar pedido</h2>
      {clienteSalvo && <div className="info-msg" style={{ marginBottom: 10 }}>✓ Seus dados foram recuperados automaticamente para este pedido.</div>}

      <label>Nome *</label>
      <input value={form.nome} onChange={set('nome')} placeholder="Seu nome completo" />

      <label>Telefone (com DDD) *</label>
      <input value={form.telefone} onChange={set('telefone')} placeholder="(66) 99999-9999" inputMode="tel" />

      <label>Email</label>
      <input type="email" value={form.email} onChange={set('email')} placeholder="opcional" />

      <label>Tipo de entrega</label>
      <div className="tipo-entrega">
        <button type="button" className={tipoEntrega === 'entrega' ? 'ativo' : ''} onClick={() => setTipoEntrega('entrega')}>
          🛵 Entrega
        </button>
        <button type="button" className={tipoEntrega === 'retirada' ? 'ativo' : ''} onClick={() => setTipoEntrega('retirada')}>
          🏪 Retirada na loja
        </button>
      </div>

      {tipoEntrega === 'entrega' && (
        <>
          <label>Endereço *</label>
          <textarea rows="2" value={form.endereco} onChange={set('endereco')} placeholder="Rua, número, bairro, referência" />
        </>
      )}

      <label>Observações</label>
      <textarea rows="2" value={form.observacoes} onChange={set('observacoes')} placeholder="opcional" />

      <h3 style={{ margin: '14px 0 6px' }}>Resumo</h3>
      {itens.map((i) => (
        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '3px 0' }}>
          <span>{i.quantidade}x {i.nome}</span>
          <span>{fmt(precoDe(i) * i.quantidade)}</span>
        </div>
      ))}
      <div className="carrinho-total">Total: {fmt(total)}</div>

      {erro && <div className="erro-msg">{erro}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn-neutro" style={{ flex: 1 }} onClick={onVoltar}>
          Voltar
        </button>
        <button type="submit" className="btn-sucesso" style={{ flex: 1 }} disabled={enviando || itens.length === 0}>
          {enviando ? 'Enviando...' : 'Confirmar Pedido'}
        </button>
      </div>
    </form>
  );
}
