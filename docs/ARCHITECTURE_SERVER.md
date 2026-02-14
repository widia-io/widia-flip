# Arquitetura do MeuFlip - Guia para Agentes Locais

Este documento descreve a arquitetura do MeuFlip hospedada em produção. Use-o como referência ao fazer alterações para garantir compatibilidade com o ambiente de deploy.

---

## Visao Geral da Infraestrutura

```
                    Internet
                        |
                   [Traefik] (reverse proxy + TLS)
                        |
                        v
            +-------------------+
            |   meuflip.com     |
            +-------------------+
                        |
        +---------------+---------------+
        |                               |
   [meuflip-web]                  [meuflip-api]
   Next.js 15                      Go 1.23
   porta 3000                      porta 8080
        |                               |
        +---------------+---------------+
                        |
                        v
                 [supabase_default network]
                        |
        +---------------+---------------+
        |               |               |
   [supabase-db]  [supabase-kong]  [supabase-storage]
   PostgreSQL 15    porta 8000      S3-compatible
```

---

## Redes Docker (CRITICO)

| Rede | Uso | Servicos Conectados |
|------|-----|---------------------|
| `proxy` | Traefik reverse proxy | traefik, meuflip-web |
| `meuflip_meuflip` | Comunicacao interna meuflip | meuflip-web, meuflip-api |
| `supabase_default` | Comunicacao com Supabase | meuflip-api, todos servicos supabase |

### Regras de Rede

1. **meuflip-web** deve estar em `proxy` (para Traefik) e `meuflip` (para comunicar com api)
2. **meuflip-api** deve estar em `meuflip` e `supabase_default` (para acessar DB)
3. **Nunca exponha** meuflip-api diretamente na rede `proxy` - usa BFF pattern

---

## Estrutura de Pastas

```
/opt/stacks/meuflip/
├── .env                          # Variaveis de ambiente PRODUCAO
├── .github/workflows/
│   └── deploy.yml                # CI/CD pipeline
├── docker-compose.prod.yml       # Compose de PRODUCAO
├── apps/
│   └── web/                      # Frontend Next.js
│       ├── Dockerfile            # Build multi-stage
│       ├── app/                  # App Router
│       │   ├── (app)/            # Rotas protegidas
│       │   ├── (auth)/           # Auth pages
│       │   ├── api/              # Route handlers (BFF)
│       │   └── calculator/       # Pagina publica
│       ├── lib/
│       │   ├── apiFetch.ts       # Cliente para Go API (server-only)
│       │   ├── auth.ts           # Better Auth config
│       │   └── actions/          # Server Actions
│       └── components/           # React components
├── services/
│   └── api/                      # Backend Go
│       ├── Dockerfile            # Build multi-stage
│       ├── cmd/api/main.go       # Entry point
│       └── internal/
│           ├── auth/             # JWT/JWKS validation
│           ├── config/           # Env config
│           ├── httpapi/          # Handlers + middleware
│           ├── storage/          # S3 client
│           ├── llm/              # OpenRouter integration
│           ├── flipscore/        # Business logic
│           └── viability/        # Calculos financeiros
├── packages/
│   └── shared/                   # Schemas Zod compartilhados
│       └── src/index.ts          # API contracts
├── migrations/                   # SQL migrations
│   └── NNNN_name.{up,down}.sql
└── (externo) ~/Developer/infra/supabase
    ├── docker-compose.yml        # Supabase self-hosted config
    └── .env                      # Supabase secrets
```

---

## Deploy Pipeline (GitHub Actions)

### Trigger
- Push para `main` branch
- Manual via `workflow_dispatch`

### Fluxo

```
1. Build images
   ├── ghcr.io/widia-io/meuflip-web:latest
   └── ghcr.io/widia-io/meuflip-api:latest

2. SSH para VPS (/opt/stacks/meuflip)
   ├── git pull
   ├── Run migrations (migrate/migrate container)
   ├── docker compose pull
   └── docker compose up -d
```

### O que Quebra o Deploy

| Acao | Risco | Solucao |
|------|-------|---------|
| Alterar Dockerfile context paths | ALTO | Build usa context `.` (raiz), ajuste paths relativos |
| Remover dependencias do package.json | ALTO | Verifique se nao quebra build |
| Alterar estrutura standalone Next.js | ALTO | Manter `output: 'standalone'` em next.config |
| Alterar porta da API (8080) | ALTO | Atualizar docker-compose.prod.yml e healthcheck |
| Alterar porta web (3000) | ALTO | Atualizar Traefik labels e healthcheck |
| Migrations com erros de sintaxe | ALTO | Testar localmente com `npm run db:migrate` |

---

## Comunicacao Entre Servicos

### BFF Pattern (CRITICO)

```
Browser --> Next.js (porta 3000) --> Go API (porta 8080) --> PostgreSQL

NUNCA: Browser --> Go API (expoe credentials, quebra multi-tenancy)
```

### URLs Internas em Producao

| De | Para | URL |
|----|------|-----|
| meuflip-web | meuflip-api | `http://api:8080` |
| meuflip-api | meuflip-web (JWKS) | `http://web:3000/api/auth/jwks` |
| meuflip-api | PostgreSQL | `postgres://postgres:xxx@supabase-db:5432/postgres` |
| meuflip-api | Supabase Storage | `http://supabase-kong:8000/storage/v1/s3` |

### Variaveis de Ambiente Criticas

```bash
# Web container
GO_API_BASE_URL=http://api:8080        # INTERNO, nao localhost

# API container
BETTER_AUTH_JWKS_URL=http://web:3000/api/auth/jwks
DATABASE_URL=postgres://...@supabase-db:5432/...  # Host: supabase-db
S3_ENDPOINT=http://supabase-kong:8000/storage/v1/s3
```

---

## Dependencias Externas

### APIs de Terceiros

| Servico | Uso | Env Var |
|---------|-----|---------|
| Firecrawl | Web scraping | `FIRECRAWL_API_KEY` |
| OpenRouter | LLM (Claude Haiku) | `OPENROUTER_API_KEY` |
| Stripe | Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

### Supabase Self-Hosted

Todos os servicos Supabase rodam na rede `supabase_default`:

| Container | Porta Interna | Funcao |
|-----------|--------------|--------|
| supabase-db | 5432 | PostgreSQL |
| supabase-kong | 8000 | API Gateway |
| supabase-storage | 5000 | Storage API |
| supabase-auth | - | GoTrue (nao usado, Better Auth) |
| supabase-studio | 3000 | Admin UI |

---

## Migrations (Database)

### Convencao

```
migrations/
├── 0001_base.up.sql
├── 0001_base.down.sql
├── 0002_prospecting.up.sql
├── 0002_prospecting.down.sql
...
```

### Aplicar em Producao

Migrations sao aplicadas automaticamente no deploy via:

```bash
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  --network supabase_default \
  migrate/migrate:v4.17.1 \
  -path=/migrations \
  -database="$DATABASE_URL" \
  up
```

### Regras

1. **Nunca altere** migrations ja aplicadas em producao
2. **Sempre crie** down migration correspondente
3. **Teste localmente** antes de fazer merge em main
4. Migrations devem ser **idem potentes** quando possivel

---

## Autenticacao (Better Auth)

### Fluxo

```
1. Usuario faz login (Better Auth)
2. Better Auth gera JWT (Ed25519)
3. Next.js pega token via getServerAccessToken()
4. Next.js envia para Go API: Authorization: Bearer <token>
5. Go API valida via JWKS endpoint (/api/auth/jwks)
6. Middleware extrai user_id do JWT context
```

### Arquivos Relevantes

- `apps/web/lib/auth.ts` - Config Better Auth
- `apps/web/lib/serverAuth.ts` - Token retrieval
- `services/api/internal/auth/jwt.go` - JWKS validation

---

## Traefik (Reverse Proxy)

### Labels Criticas no docker-compose.prod.yml

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.meuflip.rule=Host(`meuflip.com`) || Host(`www.meuflip.com`)"
  - "traefik.http.routers.meuflip.entrypoints=websecure"
  - "traefik.http.routers.meuflip.tls.certresolver=letsencrypt"
  - "traefik.http.services.meuflip.loadbalancer.server.port=3000"
```

### Middleware de Redirect

- `www.meuflip.com` -> `meuflip.com` (redirect permanente)

---

## Healthchecks

### meuflip-web

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://0.0.0.0:3000/api/health"]
  interval: 30s
```

Endpoint: `apps/web/app/api/health/route.ts`

### meuflip-api

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8080/api/v1/health"]
  interval: 30s
```

Endpoint: `services/api/internal/httpapi/handlers_health.go`

---

## Checklist Pre-Deploy

Antes de fazer merge em `main`:

- [ ] `npm run build:web` passa sem erros
- [ ] `npm run typecheck:web` passa
- [ ] `npm run lint:web` passa
- [ ] `cd services/api && go build ./...` compila
- [ ] Novas migrations testadas localmente
- [ ] Variaveis de ambiente novas adicionadas em `.env` do servidor
- [ ] Nao quebra BFF pattern (browser nunca chama Go API direto)
- [ ] Novos endpoints registrados em httpapi.go
- [ ] Schemas Zod atualizados em packages/shared

---

## Comandos Uteis no Servidor

```bash
# Ver logs em tempo real
docker logs -f meuflip-web
docker logs -f meuflip-api

# Restart forcado
docker compose -f docker-compose.prod.yml restart web api

# Rebuild completo
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Conectar no banco
docker exec -it supabase-db psql -U postgres

# Ver status containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## Troubleshooting Comum

### Container nao inicia

```bash
# Ver logs detalhados
docker logs meuflip-web --tail 100

# Verificar healthcheck
docker inspect meuflip-web | grep -A 10 Health
```

### API nao conecta no banco

```bash
# Verificar rede
docker network inspect supabase_default | grep meuflip-api

# Testar conexao
docker exec -it meuflip-api wget -qO- http://supabase-db:5432 || echo "OK if refused"
```

### JWKS validation failing

```bash
# API deve acessar web:3000
docker exec -it meuflip-api wget -qO- http://web:3000/api/auth/jwks
```

---

## Contatos e Referencias

- **Repositorio:** github.com/widia-io/meuflip
- **Registry:** ghcr.io/widia-io/meuflip-*
- **Dominio:** meuflip.com
- **VPS Path:** /opt/stacks/meuflip
