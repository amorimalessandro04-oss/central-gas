import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const fmtData = (d) => new Date(d).toLocaleString('pt-BR');

export default function Dashboard() {
  const [caixa, setCaixa] = useState(null);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/caixa'),
      api.get('/pedidos?limite=10'),
    ]).then(([c, p]) => {
      setCaixa(c.data);
      setPedidos(p.data);
    }).catch(() => {});
  }, []);

  if (!caixa) return <Loading />;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>📊 Resumo do dia</h2>

      <div className="cards-resumo">
        <div className="card card-resumo entrada">
          <div className="valor">{fmt(caixa.entradas)}</div>
          <div className="rotulo">Entradas</div>
        </div>
        <div className="card card-resumo saida">
          <div className="valor">{fmt(caixa.saidas)}</div>
          <div className="rotulo">Saídas</div>
        </div>
        <div className="card card-resumo saldo">
          <div className="valor">{fmt(caixa.saldo)}</div>
          <div className="rotulo">Saldo do dia</div>
        </div>
      </div>

      <h3 style={{ margin: '14px 0 8px' }}>Últimos 10 pedidos</h3>
      <div className="card tabela-container">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Cliente</th><th>Telefone</th><th>Tipo</th><th>Total</th><th>Status</th><th>Data</th>
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
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Nenhum pedido ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
