import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export default function HistoricoClientes() {
  const [clientes, setClientes] = useState(null);

  useEffect(() => {
    api.get('/clientes').then((r) => setClientes(r.data)).catch(() => {});
  }, []);

  if (!clientes) return <Loading />;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>👥 Histórico de Clientes</h2>
      <p style={{ marginBottom: 12, color: '#6b7280', fontSize: '0.9rem' }}>
        Ordenado por quem está há mais tempo sem pedir — ideal para fazer contato e reativar clientes.
      </p>

      <div className="card tabela-container">
        <table>
          <thead>
            <tr><th>Nome</th><th>Telefone</th><th>Último Pedido</th><th>Dias sem pedir</th></tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className={c.dias_sem_pedir >= 45 ? 'linha-alerta' : ''}>
                <td>{c.nome}</td>
                <td>{c.telefone}</td>
                <td>{fmtData(c.ultimo_pedido)}</td>
                <td>
                  {c.dias_sem_pedir != null
                    ? <strong style={{ color: c.dias_sem_pedir >= 45 ? '#b91c1c' : 'inherit' }}>{c.dias_sem_pedir} dias</strong>
                    : '—'}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>Nenhum cliente ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
