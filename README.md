## Widia Flip

Monorepo do Widia Flip (Next.js + Go + Postgres).

### Estrutura

- **`apps/web`**: Next.js (App Router) + Tailwind (BFF)
- **`services/api`**: Go REST API (`/api/v1`)
- **`packages/shared`**: tipos/validações/helpers compartilhados (TS)
- **`migrations`**: migrations SQL (Postgres)

### Requisitos

- **Node**: 20 LTS ou 22 LTS
- **Go**: 1.22+
- **Docker**: Docker Desktop / Engine + Compose

### Como rodar local (CP-01)

#### 1) Variáveis de ambiente

Use `env.example` como referência e exporte as variáveis no seu shell (ou copie para um `.env` local).

- **Web (Next / Better Auth)**
  - `BETTER_AUTH_SECRET` (**obrigatório**, >= 32 chars)
  - `GO_API_BASE_URL` (default: `http://localhost:8080`)
- **API (Go)**
  - `DATABASE_URL` (**obrigatório**)
  - `API_PORT` (default: `8080`)
  - `BETTER_AUTH_JWKS_URL` (default: `http://localhost:3000/api/auth/jwks`)

Exemplo (dev):

```bash
export BETTER_AUTH_SECRET="dev_secret_please_change_me_32_chars_minimum"
export GO_API_BASE_URL="http://localhost:8080"
export DATABASE_URL="postgres://widia:widia@localhost:5432/widia_flip?sslmode=disable"
export BETTER_AUTH_JWKS_URL="http://localhost:3000/api/auth/jwks"
```

#### 2) Subir Postgres + aplicar migrations

```bash
npm run db:up
npm run db:migrate
```

#### 3) Subir API Go

Em um terminal:

```bash
npm run dev:api
```

#### 4) Subir Web (Next)

Em outro terminal:

```bash
cd apps/web
npm run dev
```

Abra:

- Web: `http://localhost:3000`

### Validação CP-01 (smoke)

- **Login**: acesse `/login`, crie uma conta (dev) e faça login.
- **BFF + Bearer**: em `/app`, a UI faz chamadas **server-side** (Next) para a Go API com `Authorization: Bearer <token>`.
- **Workspace**: ainda em `/app`, crie um workspace e veja ele listado.

### Notas importantes (M0)

- **BFF (LOCKED/PRD)**: o browser **não** chama a Go API diretamente. Chamadas são feitas no server-side (Route Handlers / Server Actions).
- **Auth tokens (Go)**: a API valida JWT via **JWKS** exposto pelo Better Auth em `GET /api/auth/jwks` (config em `BETTER_AUTH_JWKS_URL`).
- **Persistência do Better Auth**: no CP-01 o Better Auth roda com storage **em memória** (dev). Reiniciar o servidor do Next reseta as contas/sessões.


