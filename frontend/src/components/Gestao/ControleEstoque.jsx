import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

export default function ControleEstoque() {
  const [estoque, setEstoque] = useState(null);
  const [form, setForm] = useState({ produto_id: '', tipo: 'entrada', quantidade: '', motivo: '' });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  function carregar() {
    api.get('/estoque').then((r) => setEstoque(r.data)).catch(() => {});
  }
  useEffect(carregar, []);

  async function registrar(e) {
    e.preventDefault();
    setErro(''); setOk('');
    try {
      await api.post('/estoque/movimentacao', {
        produto_id: Number(form.produto_id),
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        motivo: form.motivo || null,
      });
      setForm({ produto_id: '', tipo: 'entrada', quantidade: '', motivo: '' });
      setOk('Movimentação registrada!');
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao registrar movimentação.');
    }
  }

  if (!estoque) return <Loading />;

  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>📦 Controle de Estoque</h2>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>Registrar movimentação</h3>
        <form className="form-inline" onSubmit={registrar}>
          <div>
            <label>Produto</label>
            <select value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })} required>
              <option value="">Selecione...</option>
              {estoque.map((e2) => (
                <option key={e2.produto_id} value={e2.produto_id}>{e2.produto_nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label>Quantidade</label>
            <input type="number" min="1" value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })} required />
          </div>
          <div>
            <label>Motivo</label>
            <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="opcional" />
          </div>
          <button className="btn-primario" type="submit">Registrar</button>
        </form>
        {erro && <div className="erro-msg">{erro}</div>}
        {ok && <div className="sucesso-msg">{ok}</div>}
      </div>

      <div className="card tabela-container">
        <table>
          <thead>
            <tr><th>Produto</th><th>Categoria</th><th>Qtd. Atual</th><th>Qtd. Mínima</th><th>Status</th></tr>
          </thead>
          <tbody>
            {estoque.map((e) => (
              <tr key={e.id} className={e.estoque_baixo ? 'linha-alerta' : ''}>
                <td>{e.produto_nome}</td>
                <td>{e.categoria}</td>
                <td><strong>{e.quantidade_atual}</strong></td>
                <td>{e.quantidade_minima}</td>
                <td>{e.estoque_baixo ? '⚠️ Baixo' : '✅ OK'}</td>
              </tr>
            ))}
            {estoque.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum produto em estoque.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
