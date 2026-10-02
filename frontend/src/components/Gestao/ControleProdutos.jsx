import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const vazio = { nome: '', categoria: '', preco_entrega: '', preco_retirada: '', descricao: '' };

export default function ControleProdutos() {
  const [produtos, setProdutos] = useState(null);
  const [form, setForm] = useState(vazio);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState('');

  function carregar() {
    api.get('/produtos?ativos=false').then((r) => setProdutos(r.data)).catch(() => {});
  }
  useEffect(carregar, []);

  const num = (v) => Number(String(v).replace(',', '.'));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.post('/produtos', {
        nome: form.nome,
        categoria: form.categoria,
        preco_entrega: num(form.preco_entrega),
        preco_retirada: num(form.preco_retirada),
        descricao: form.descricao || null,
      });
      setForm(vazio);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar produto.');
    }
  }

  async function alternarAtivo(p) {
    await api.put(`/produtos/${p.id}`, { ativo: !p.ativo }).catch(() => {});
    carregar();
  }

  if (!produtos) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h2>🏷️ Produtos</h2>
        <button className="btn-primario" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? 'Cancelar' : '+ Adicionar Novo Produto'}
        </button>
      </div>

      {mostrarForm && (
        <form className="card" onSubmit={salvar} style={{ marginBottom: 14 }}>
          <div className="form-inline">
            <div>
              <label>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <label>Categoria *</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex.: Gás, Carvão, Água" required />
            </div>
            <div>
              <label>Preço Entrega *</label>
              <input value={form.preco_entrega} onChange={(e) => setForm({ ...form, preco_entrega: e.target.value })}
                placeholder="135,00" inputMode="decimal" required />
            </div>
            <div>
              <label>Preço Retirada *</label>
              <input value={form.preco_retirada} onChange={(e) => setForm({ ...form, preco_retirada: e.target.value })}
                placeholder="130,00" inputMode="decimal" required />
            </div>
          </div>
          <label>Descrição</label>
          <textarea rows="2" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          {erro && <div className="erro-msg">{erro}</div>}
          <button className="btn-sucesso" style={{ marginTop: 12 }} type="submit">Salvar</button>
        </form>
      )}

      <div className="card tabela-container">
        <table>
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Preço Entrega</th><th>Preço Retirada</th><th>Ativo</th></tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.categoria}</td>
                <td>{fmt(p.preco_entrega)}</td>
                <td>{fmt(p.preco_retirada)}</td>
                <td>
                  <button
                    className={`btn-pequeno ${p.ativo ? 'btn-sucesso' : 'btn-neutro'}`}
                    onClick={() => alternarAtivo(p)}
                  >
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum produto cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
