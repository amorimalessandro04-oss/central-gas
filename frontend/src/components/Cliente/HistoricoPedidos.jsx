import { useState } from 'react';
import api from '../../services/api';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const fmtData = (d) => new Date(d).toLocaleString('pt-BR');

export default function HistoricoPedidos({ telefoneInicial = '' }) {
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [pedidos, setPedidos] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar(e) {
    e?.preventDefault();
    if (!telefone.trim()) return;
    setCarregando(true);
    try {
      const { data } = await api.get(`/pedidos/historico/${encodeURIComponent(telefone.trim())}`);
      setPedidos(data);
    } catch {
      setPedidos([]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>📋 Meus pedidos</h2>
      <form onSubmit={buscar} style={{ display: 'flex', gap: 8 }}>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="Seu telefone com DDD"
          inputMode="tel"
        />
        <button className="btn-primario" type="submit" disabled={carregando}>
          {carregando ? '...' : 'Buscar'}
        </button>
      </form>

      {pedidos && pedidos.length === 0 && <p style={{ marginTop: 12 }}>Nenhum pedido encontrado para este telefone.</p>}

      {pedidos?.map((p) => (
        <div key={p.id} className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <strong>Pedido #{p.id}</strong>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{fmtData(p.data_pedido)}</span>
          </div>
          <div style={{ fontSize: '0.9rem', margin: '6px 0' }}>
            {p.itens.map((i, idx) => (
              <div key={idx}>{i.quantidade}x {i.nome} — {fmt(i.subtotal)}</div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total: <strong>{fmt(p.total)}</strong> • {p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}</span>
            <strong style={{ color: p.status === 'cancelado' ? '#b91c1c' : '#0b3d91', textTransform: 'capitalize' }}>
              {p.status}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}
