import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const fmtData = (d) => new Date(d).toLocaleString('pt-BR');

export default function PedidosRecentes() {
  const [pedidos, setPedidos] = useState(null);

  function carregar() {
    api.get('/pedidos?limite=50').then((r) => setPedidos(r.data)).catch(() => {});
  }
  useEffect(carregar, []);

  async function mudarStatus(id, status) {
    await api.patch(`/pedidos/${id}/status`, { status }).catch(() => {});
    carregar();
  }

  if (!pedidos) return <Loading />;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>🧾 Pedidos Recentes</h2>

      <div className="card tabela-container">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Cliente</th><th>Telefone</th><th>Tipo</th><th>Total</th><th>Status</th><th>Data</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.cliente_nome}</td>
                <td>{p.cliente_telefone}</td>
                <td>{p.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}</td>
                <td>{fmt(p.total)}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.status}</td>
                <td>{fmtData(p.data_pedido)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status !== 'entregue' && (
                      <button className="btn-sucesso btn-pequeno" onClick={() => mudarStatus(p.id, 'entregue')}>
                        Entregue
                      </button>
                    )}
                    {p.status !== 'cancelado' && (
                      <button className="btn-perigo btn-pequeno" onClick={() => mudarStatus(p.id, 'cancelado')}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center' }}>Nenhum pedido ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
