import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

export default function CaixaDiario() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [caixa, setCaixa] = useState(null);
  const [form, setForm] = useState({ tipo: 'saida', categoria: '', descricao: '', valor: '' });
  const [erro, setErro] = useState('');

  function carregar(d = data) {
    api.get(`/caixa?data=${d}`).then((r) => setCaixa(r.data)).catch(() => {});
  }

  useEffect(() => { carregar(data); }, [data]);

  async function adicionar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.post('/caixa', {
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao || null,
        valor: Number(String(form.valor).replace(',', '.')),
        data,
      });
      setForm({ tipo: 'saida', categoria: '', descricao: '', valor: '' });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao adicionar movimentação.');
    }
  }

  async function remover(id) {
    if (!confirm('Remover esta movimentação?')) return;
    await api.delete(`/caixa/${id}`).catch(() => {});
    carregar();
  }

  if (!caixa) return <Loading />;

  const entradas = caixa.movimentacoes.filter((m) => m.tipo === 'entrada');
  const saidas = caixa.movimentacoes.filter((m) => m.tipo === 'saida');

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>💰 Caixa do dia</h2>

      <div className="card" style={{ marginBottom: 14 }}>
        <label>Data</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ maxWidth: 200 }} />
      </div>

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
          <div className="rotulo">Saldo</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>Adicionar movimentação</h3>
        <form className="form-inline" onSubmit={adicionar}>
          <div>
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label>Categoria</label>
            <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              placeholder="Ex.: Combustível, Aluguel" required />
          </div>
          <div>
            <label>Descrição</label>
            <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="opcional" />
          </div>
          <div>
            <label>Valor (R$)</label>
            <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0,00" inputMode="decimal" required />
          </div>
          <button className="btn-primario" type="submit">Adicionar</button>
        </form>
        {erro && <div className="erro-msg">{erro}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <div className="card tabela-container">
          <h3 style={{ color: '#16a34a', marginBottom: 8 }}>Entradas</h3>
          <table>
            <thead><tr><th>Categoria</th><th>Descrição</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {entradas.map((m) => (
                <tr key={m.id}>
                  <td>{m.categoria}</td>
                  <td>{m.descricao}</td>
                  <td>{fmt(m.valor)}</td>
                  <td><button className="btn-perigo btn-pequeno" onClick={() => remover(m.id)}>✕</button></td>
                </tr>
              ))}
              {entradas.length === 0 && <tr><td colSpan="4">Nenhuma entrada.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card tabela-container">
          <h3 style={{ color: '#e63946', marginBottom: 8 }}>Saídas</h3>
          <table>
            <thead><tr><th>Categoria</th><th>Descrição</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {saidas.map((m) => (
                <tr key={m.id}>
                  <td>{m.categoria}</td>
                  <td>{m.descricao}</td>
                  <td>{fmt(m.valor)}</td>
                  <td><button className="btn-perigo btn-pequeno" onClick={() => remover(m.id)}>✕</button></td>
                </tr>
              ))}
              {saidas.length === 0 && <tr><td colSpan="4">Nenhuma saída.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
