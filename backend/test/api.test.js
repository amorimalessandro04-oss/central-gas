const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'central-gas-api-test-secret-0123456789';
process.env.CORS_ORIGINS = 'http://127.0.0.1';

const db = require('../src/config/database');
const { app, start } = require('../src/server');

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function request(server, route, options = {}) {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}${route}`, options);
}

async function main() {
  const queryOriginal = db.query;
  const connectOriginal = db.pool.connect;
  let server;
  let apiServer;
  let statements = [];
  let clienteParams;
  let consultaCliente;
  let stockAvailable = true;

  try {
    db.query = async (sql) => {
      if (sql.startsWith('SELECT nome, telefone, email, endereco FROM clientes')) {
        return { rows: [{ nome: 'Cliente Teste', telefone: '66999990000', email: null, endereco: 'Rua A' }] };
      }
      if (sql.startsWith('SELECT id, nome, telefone, email, tipo_padrao')) return { rows: [] };
      if (sql.startsWith('SELECT e.*, p.nome AS produto_nome')) return { rows: [] };
      if (sql.startsWith('SELECT * FROM caixa_diario WHERE data')) return { rows: [] };
      if (sql.includes('COALESCE(SUM(CASE WHEN tipo =')) return { rows: [{ entradas: '0', saidas: '0' }] };
      if (sql.startsWith('SELECT p.*, c.nome AS cliente_nome')) return { rows: [] };
      if (sql.includes('FROM pedidos p') && sql.includes('json_agg')) return { rows: [] };
      if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) return { rows: [] };
      if (sql === 'SELECT id FROM usuarios WHERE email = $1') return { rows: [{ id: 1 }] };
      return { rows: [] };
    };

    server = await listen(app);
    const health = await request(server, '/api/saude');
    assert.equal(health.status, 200, 'health check responde');
    assert.equal((await health.json()).status, 'ok');

    const products = await request(server, '/api/produtos');
    assert.equal(products.status, 200, 'catálogo público alcança a API');
    assert.deepEqual(await products.json(), []);

    const preflight = await request(server, '/api/pedidos', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    assert.equal(preflight.status, 204, 'CORS libera preflight para o site configurado');
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1');
    const deniedOrigin = await request(server, '/api/produtos', {
      headers: { Origin: 'https://origem-invalida.example' },
    });
    assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null,
      'CORS não libera origens desconhecidas');

    const unauthorized = await request(server, '/api/pedidos');
    assert.equal(unauthorized.status, 401, 'rotas de gestão exigem JWT');
    for (const route of ['/api/estoque', '/api/caixa']) {
      assert.equal((await request(server, route)).status, 401, `${route} exige JWT`);
    }

    const token = jwt.sign({ id: 1, email: 'gerente@example.test' }, process.env.JWT_SECRET);
    const management = await request(server, '/api/clientes', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(management.status, 200, 'a mesma API libera dados de gestão autenticados');
    assert.equal((await request(server, '/api/estoque', {
      headers: { Authorization: `Bearer ${token}` },
    })).status, 200, 'estoque da gestão vem da API central');
    assert.equal((await request(server, '/api/caixa', {
      headers: { Authorization: `Bearer ${token}` },
    })).status, 200, 'caixa da gestão vem da API central');
    assert.equal((await request(server, '/api/pedidos', {
      headers: { Authorization: `Bearer ${token}` },
    })).status, 200, 'pedidos da gestão vêm da API central');

    const customer = await request(server, '/api/clientes/telefone/66999990000');
    assert.equal(customer.status, 200, 'recuperação de cadastro alcança o backend');
    const customerData = await customer.json();
    assert.deepEqual(Object.keys(customerData).sort(), ['email', 'endereco', 'nome', 'telefone']);
    assert.equal((await request(server, '/api/clientes/telefone/%2866%29%2099999-0000')).status, 200,
      'busca de cliente aceita formatação alternativa do mesmo telefone');

    let poolConnections = 0;
    db.pool.connect = async () => {
      poolConnections += 1;
      statements = [];
      return {
        async query(sql, params) {
          statements.push(sql);
          if (sql.startsWith('SELECT id FROM clientes')) {
            consultaCliente = [sql, params];
            return { rows: [] };
          }
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
          if (sql.startsWith('INSERT INTO clientes')) {
            clienteParams = params;
            return { rows: [{ id: 2, nome: 'Cliente Teste', telefone: '66999990000' }] };
          }
          if (sql.startsWith('SELECT * FROM produtos')) {
            return { rows: [{ id: 3, nome: 'Botijão', preco_entrega: '120.00', preco_retirada: '115.00' }] };
          }
          if (sql.startsWith('INSERT INTO pedidos')) {
            return { rows: [{ id: 10, total: '120.00', tipo_entrega: 'entrega' }] };
          }
          if (sql.startsWith('UPDATE estoque')) {
            return { rows: stockAvailable ? [{ produto_id: 3 }] : [] };
          }
          return { rows: [] };
        },
        release() {},
      };
    };

    const invalidOrder = await request(server, '/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente: { nome: 'Teste', telefone: '66' }, tipo_entrega: 'entrega', itens: [{ produto_id: 3, quantidade: -1 }] }),
    });
    assert.equal(invalidOrder.status, 400, 'pedido rejeita quantidade inválida');
    assert.equal(poolConnections, 0, 'validação ocorre antes de reservar conexão');

    const validOrder = await request(server, '/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nome: 'Cliente Teste', telefone: ' (66) 99999-0000 ', endereco: 'Rua A' },
        tipo_entrega: 'entrega',
        itens: [{ produto_id: 3, quantidade: 1 }],
      }),
    });
    assert.equal(validOrder.status, 201, 'pedido válido persiste pelo backend compartilhado');
    assert.ok(statements.some((sql) => sql.includes('ON CONFLICT (telefone)')),
      'pedido cria ou atualiza cadastro do cliente');
    assert.equal(clienteParams?.[1], '66999990000', 'telefone é normalizado para evitar cadastros duplicados por formatação');
    assert.equal(consultaCliente?.[1]?.[0], '66999990000', 'recuperação no backend usa o mesmo telefone normalizado');
    assert.ok(statements.some((sql) => sql.includes('quantidade_atual >= $1')),
      'baixa de estoque é condicional e atômica');

    stockAvailable = false;
    const soldOutOrder = await request(server, '/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nome: 'Cliente Teste', telefone: '66999990000', endereco: 'Rua A' },
        tipo_entrega: 'entrega',
        itens: [{ produto_id: 3, quantidade: 1 }],
      }),
    });
    assert.equal(soldOutOrder.status, 409, 'pedido sem estoque é recusado');
    assert.ok(statements.includes('ROLLBACK'), 'pedido recusado reverte a transação');
  } finally {
    db.query = queryOriginal;
    db.pool.connect = connectOriginal;
    if (server) await close(server);
  }

  // Startup só abre a porta depois de conexão, schema e usuário gerente estarem prontos.
  const oldEnv = Object.fromEntries(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'NODE_ENV'].map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    DB_HOST: 'mock', DB_NAME: 'mock', DB_USER: 'mock', DB_PASSWORD: 'mock',
    JWT_SECRET: 'startup-test-secret-at-least-32-characters', NODE_ENV: 'test',
  });
  db.query = async (sql) => {
    if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
    if (sql.includes('CREATE TABLE IF NOT EXISTS')) return { rows: [] };
    if (sql === 'SELECT id FROM usuarios WHERE email = $1') return { rows: [{ id: 1 }] };
    return { rows: [] };
  };
  try {
    apiServer = await start(0);
    assert.ok(apiServer.listening, 'backend inicializa somente após o banco responder');
  } finally {
    db.query = queryOriginal;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (apiServer) await close(apiServer);
  }

  console.log('OK: health, catálogo, autenticação, recuperação do cliente, persistência do pedido, estoque e startup.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
