# 🔥 Central Gás

Aplicativo PWA de gestão e pedidos para distribuidora de gás.

- **Cliente** (aberto): catálogo, carrinho, checkout e histórico de pedidos
- **Gestão** (com login): dashboard, caixa do dia, produtos, estoque, clientes e pedidos
- **Notificação automática** de novos pedidos no WhatsApp do gerente (Twilio)

## Estrutura

```
central-gas/
├── frontend/   # React + Vite (PWA)
├── backend/    # Node.js + Express + PostgreSQL
└── database/   # schema.sql
```

## Instalação

### 1. Banco de dados (PostgreSQL)

```powershell
# Crie o banco e rode o schema
psql -U postgres -c "CREATE DATABASE central_gas;"
psql -U postgres -d central_gas -f database\schema.sql
```

### 2. Backend

```powershell
cd backend
npm ci
copy .env.example .env   # edite com suas credenciais
npm run dev              # http://localhost:5000
```

Na primeira execução é criado o usuário gerente:
- **Email:** `admin@centralgas.com`
- **Senha:** defina `ADMIN_PASSWORD` no arquivo `backend/.env` (mínimo de 12 caracteres).

Não existe senha padrão no backend. Se o usuário gerente já existir no banco, as variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` não recriam nem redefinem a conta.

### 3. Frontend

```powershell
cd frontend
npm ci
npm run dev              # http://localhost:5173
```

- Cliente: http://localhost:5173
- Gestão: http://localhost:5173/gestao

Para testar os fluxos da API com banco simulado, execute `npm test` dentro de `backend/`. O build de produção do site é `npm run build` dentro de `frontend/`.

## WhatsApp (Twilio)

1. Crie uma conta grátis em https://www.twilio.com (sandbox de WhatsApp para testes)
2. Preencha no `backend/.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER` (ex.: `whatsapp:+14155238886` — sandbox)
   - `GERENTE_WHATSAPP` (ex.: `whatsapp:+5566996123459`)
3. Sem essas credenciais, o app funciona normalmente e apenas **simula** o envio (a mensagem aparece no console do backend).

## PWA (instalar no celular)

- O app já tem `manifest.json`, service worker e ícones (192/512).
- Em produção (HTTPS), abra no Chrome/Safari do celular e use **"Adicionar à tela inicial"**.
- Para trocar o ícone pela logo oficial, substitua `frontend/public/icon-192.png` e `icon-512.png` (ou edite e rode `gerar-icones.ps1`).

## Deploy em produção

- **Frontend:** Vercel/Netlify (`npm run build` → pasta `frontend/dist`)
- **Backend:** Railway/Render (configure as variáveis de ambiente do `.env`)
- **Banco:** PostgreSQL em nuvem (Neon, Railway, Supabase)
- Em produção, ajuste o `baseURL` em `frontend/src/services/api.js` para a URL do backend.

## API (resumo)

| Rota | Acesso | Descrição |
|---|---|---|
| `POST /api/auth/login` | público | Login do gerente (retorna JWT) |
| `GET /api/produtos` | público | Catálogo |
| `POST /api/pedidos` | público | Cria pedido + notifica WhatsApp |
| `GET /api/pedidos/historico/:telefone` | público | Histórico do cliente |
| `GET /api/pedidos` | gestão | Pedidos recentes |
| `PATCH /api/pedidos/:id/status` | gestão | Entregue/Cancelado |
| `GET/POST /api/caixa` | gestão | Caixa do dia |
| `GET/POST /api/estoque/...` | gestão | Estoque e movimentações |
| `GET /api/clientes` | gestão | Clientes + dias sem pedir |


## Deploy no Render

O arquivo `render.production.yaml` prepara o backend Express, o frontend React/Vite e o PostgreSQL compartilhado para produção. Selecione esse caminho no campo **Blueprint Path** do Render; `render.yaml` continua sendo a configuração de teste sem cobrança. O backend espera o banco, verifica o schema e cria o primeiro gerente antes de aceitar tráfego. No primeiro deploy, informe `ADMIN_EMAIL` e `ADMIN_PASSWORD` no painel do Render. `CORS_ORIGINS` já contém o domínio Render do site; acrescente também qualquer domínio personalizado. O processo do backend parte da raiz do repositório para acessar `database/schema.sql`. A configuração de produção fixa Node.js 24.21.0, API sempre ativa no plano `0.5c-512mb` e PostgreSQL `0.1c-256mb` com 1 GB de armazenamento.

O site e o PWA de gestão usam a mesma URL `VITE_API_URL`; a API consulta e grava o mesmo banco PostgreSQL para catálogo, clientes, estoque, pedidos e caixa.

#### Variáveis do serviço `central-gas-api`

- Render injeta do PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
- Render gera `JWT_SECRET` automaticamente.
- Valores do Blueprint: `NODE_ENV=production`, `NODE_VERSION=24.21.0`, `DB_SSL=false`, `DB_POOL_SIZE=5`, `ADMIN_NAME=Gerente` e `CORS_ORIGINS=https://central-gas-site.onrender.com`.
- Configurar manualmente no primeiro deploy: `ADMIN_EMAIL` e `ADMIN_PASSWORD` (mínimo de 12 caracteres). `ADMIN_EMAIL` deve ser a conta de gestão que será usada para login.
- O Render fornece `PORT`; não é necessário preencher.
- WhatsApp é opcional: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` e `GERENTE_WHATSAPP`.

#### Variáveis do site `central-gas-site`

- `VITE_API_URL=https://central-gas-api.onrender.com/api`
- `NODE_VERSION=24.21.0`

O Blueprint de produção usa compute pago para API e PostgreSQL; o site estático continua no CDN. Não aplique esse Blueprint sem autorizar a cobrança. Bancos gratuitos expiram após 30 dias e não têm backups gerenciados, e serviços web gratuitos podem dormir quando ociosos.

O menor porte configurado custa aproximadamente US$ 13,30 por mês antes de impostos e uso excedente: US$ 7 para a API, US$ 6 para o compute do PostgreSQL e cerca de US$ 0,30 para 1 GB de armazenamento. O site estático não tem cobrança de compute. O preço pode variar; confira a página de cobrança do Render antes de aplicar o Blueprint.

Antes de abrir para clientes, configure senhas e segredos próprios, adicione autenticação do cliente (por exemplo, código de confirmação por SMS/WhatsApp) para proteger a recuperação do cadastro e do histórico por telefone, confirme backups/restauração do PostgreSQL e monitore os serviços e o envio de WhatsApp. A rota pública de recuperação exige o telefone, mas isso sozinho não comprova a identidade do cliente.
