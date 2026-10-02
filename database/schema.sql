-- ============================================================
-- CENTRAL GÁS - Schema do Banco de Dados (PostgreSQL)
-- Execute: psql -U postgres -d central_gas -f schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  tipo_padrao VARCHAR(20) DEFAULT 'entrega',
  endereco TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_pedido TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  preco_entrega DECIMAL(10, 2) NOT NULL,
  preco_retirada DECIMAL(10, 2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tipo_entrega VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente',
  total DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  whatsapp_enviado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade_atual INTEGER DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 5,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  tipo VARCHAR(50) NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS caixa_diario (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor DECIMAL(10, 2) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedido_id);
-- Consolida linhas duplicadas de estoque mantendo a soma antes de tornar produto_id único.
WITH estoque_consolidado AS (
  SELECT produto_id, MIN(id) AS id_manter,
         SUM(quantidade_atual)::INTEGER AS quantidade_total,
         MAX(quantidade_minima) AS quantidade_minima,
         MAX(atualizado_em) AS atualizado_em
  FROM estoque
  GROUP BY produto_id
  HAVING COUNT(*) > 1
)
UPDATE estoque e
SET quantidade_atual = c.quantidade_total,
    quantidade_minima = c.quantidade_minima,
    atualizado_em = c.atualizado_em
FROM estoque_consolidado c
WHERE e.id = c.id_manter;

WITH estoque_duplicado AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY produto_id ORDER BY id) AS ordem
  FROM estoque
)
DELETE FROM estoque e
USING estoque_duplicado d
WHERE e.id = d.id AND d.ordem > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estoque_produto_unico ON estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_caixa_data ON caixa_diario(data);

-- O primeiro usuário gerente é criado pelo backend com ADMIN_EMAIL e
-- ADMIN_PASSWORD configurados no ambiente; nenhuma senha padrão é definida.
