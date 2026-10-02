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
npm install
copy .env.example .env   # edite com suas credenciais
npm run dev              # http://localhost:5000
```

Na primeira execução é criado o usuário gerente:
- **Email:** `admin@centralgas.com`
- **Senha:** `admin123` (troque depois!)

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev              # http://localhost:5173
```

- Cliente: http://localhost:5173
- Gestão: http://localhost:5173/gestao

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

O arquivo `render.yaml` define o backend Express, o frontend React/Vite e o PostgreSQL compartilhado. O backend inicializa `database/schema.sql` na primeira execução e usa as mesmas tabelas para o aplicativo de gestão e para o site.
