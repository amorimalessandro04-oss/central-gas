const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

export default function Carrinho({ itens, tipoEntrega, onAlterarQtd, onIrCheckout, onContinuar }) {
  const precoDe = (p) => (tipoEntrega === 'entrega' ? p.preco_entrega : p.preco_retirada);
  const total = itens.reduce((s, i) => s + precoDe(i) * i.quantidade, 0);

  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>🛒 Seu carrinho</h2>

      {itens.length === 0 && <p>Carrinho vazio. Adicione produtos no catálogo.</p>}

      {itens.map((item) => (
        <div key={item.id} className="carrinho-item">
          <div style={{ flex: 1 }}>
            <strong>{item.nome}</strong>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {fmt(precoDe(item))} cada • Subtotal: {fmt(precoDe(item) * item.quantidade)}
            </div>
          </div>
          <div className="qtd">
            <button className="btn-neutro" onClick={() => onAlterarQtd(item.id, item.quantidade - 1)}>−</button>
            <strong>{item.quantidade}</strong>
            <button className="btn-neutro" onClick={() => onAlterarQtd(item.id, item.quantidade + 1)}>+</button>
          </div>
        </div>
      ))}

      {itens.length > 0 && (
        <>
          <div className="carrinho-total">Total: {fmt(total)}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-neutro" style={{ flex: 1 }} onClick={onContinuar}>
              Continuar comprando
            </button>
            <button className="btn-primario" style={{ flex: 1 }} onClick={onIrCheckout}>
              Ir para checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
