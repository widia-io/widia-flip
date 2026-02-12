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
  - `S3_ENDPOINT` (default: `http://localhost:9000`)
  - `S3_ACCESS_KEY` (default: `minioadmin`)
  - `S3_SECRET_KEY` (default: `minioadmin`)
  - `S3_BUCKET` (default: `widia-flip-dev`)
  - `S3_REGION` (default: `us-east-1`)
  - `S3_FORCE_PATH_STYLE` (default: `true`)

Exemplo (dev):

```bash
export BETTER_AUTH_SECRET="dev_secret_please_change_me_32_chars_minimum"
export GO_API_BASE_URL="http://localhost:8080"
export DATABASE_URL="postgres://widia:widia@localhost:5432/widia_flip?sslmode=disable"
export BETTER_AUTH_JWKS_URL="http://localhost:3000/api/auth/jwks"
export S3_ENDPOINT="http://localhost:9000"
export S3_ACCESS_KEY="minioadmin"
export S3_SECRET_KEY="minioadmin"
export S3_BUCKET="widia-flip-dev"
export S3_REGION="us-east-1"
export S3_FORCE_PATH_STYLE="true"
```

#### 2) Subir Postgres + MinIO + aplicar migrations

```bash
npm run db:up
npm run db:migrate
```

Se o migrate parar com estado `dirty` (ou erro de rede/stack antigo), rode:

```bash
npm run db:repair
npm run db:migrate
```

Isso também sobe o MinIO (object storage S3-compatível) para upload de documentos.

- **MinIO Console**: `http://localhost:9001`
  - User: `minioadmin`
  - Password: `minioadmin`
- O bucket `widia-flip-dev` é criado automaticamente.

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
- **Warning Ed25519**: o warning `ExperimentalWarning: The Ed25519 Web Crypto API algorithm` é esperado e não afeta funcionalidade. É causado pelo Better Auth que usa Ed25519 para assinatura de tokens. O script `dev` já suprime warnings experimentais automaticamente.

