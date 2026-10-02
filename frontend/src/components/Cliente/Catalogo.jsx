import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Loading from '../Shared/Loading';

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

export default function Catalogo({ onAdicionar }) {
  const [produtos, setProdutos] = useState([]);
  const [categoria, setCategoria] = useState('todas');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/produtos')
      .then((r) => setProdutos(r.data))
      .catch(() => setErro('Não foi possível carregar os produtos. Verifique sua conexão.'))
      .finally(() => setCarregando(false));
  }, []);

  const categorias = useMemo(
    () => ['todas', ...new Set(produtos.map((p) => p.categoria))],
    [produtos]
  );

  const filtrados = categoria === 'todas'
    ? produtos
    : produtos.filter((p) => p.categoria === categoria);

  if (carregando) return <Loading />;
  if (erro) return <div className="erro-msg">{erro}</div>;

  return (
    <div>
      <div className="filtros">
        {categorias.map((c) => (
          <button
            key={c}
            className={c === categoria ? 'ativo' : ''}
            onClick={() => setCategoria(c)}
          >
            {c === 'todas' ? 'Todas' : c}
          </button>
        ))}
      </div>

      {filtrados.length === 0 && <p>Nenhum produto disponível no momento.</p>}

      <div className="grade-produtos">
        {filtrados.map((p) => (
          <div key={p.id} className="card produto-card">
            <span className="categoria">{p.categoria}</span>
            <span className="nome">{p.nome}</span>
            {p.descricao && <small style={{ color: '#6b7280' }}>{p.descricao}</small>}
            <span className="preco">Entrega: <strong>{fmt(p.preco_entrega)}</strong></span>
            <span className="preco">Retirada: <strong>{fmt(p.preco_retirada)}</strong></span>
            <button className="btn-primario" onClick={() => onAdicionar(p)}>
              Adicionar ao carrinho
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
