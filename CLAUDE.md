# CLAUDE.md

Technical reference for Claude Code when developing in this repository. For project scope, milestones, and strategic guidelines, see `AGENTS.md`.

## PRD Updates (OBRIGATÓRIO)

**Ao concluir qualquer milestone ou task significativa, SEMPRE atualizar `docs/PRD.md`:**

1. **Current Checkpoint** (seção 1.1): atualizar CP atual, milestone em andamento, próximo milestone, data
2. **Task Board** (seção 1.4): marcar tasks como ✅ done
3. **Checkpoint Log** (seção 8): adicionar linha com data e resumo do que foi entregue

Isso mantém o PRD como source of truth do projeto.

## Branch + PR Workflow (OBRIGATÓRIO)

**Ao iniciar qualquer feature/fix/chore:**

1. Criar branch seguindo o padrão:
   - `feat/descricao-curta` — nova funcionalidade
   - `fix/descricao-curta` — correção de bug
   - `chore/descricao-curta` — manutenção, docs, refactor

2. Fazer commits na branch normalmente

3. **Quando o usuário sinalizar "pronto" ou "finalizado":**
   ```bash
   git push -u origin <branch-name>
   gh pr create --title "..." --body "..."
   ```

Retornar a URL do PR para o usuário.

## Quick Start

```bash
# 1. Environment
cp env.example .env
# Edit .env with POSTGRES_PASSWORD from supabase/.env

# 2. Start Supabase (PostgreSQL + Storage + Studio)
npm run db:up
npm run db:migrate

# 3. Development (2 terminals)
npm run dev:api   # Terminal 1: Go API (port 8080)
npm run dev:web   # Terminal 2: Next.js (port 3000)
```

**Database:** localhost:54322 (postgres/[password from supabase/.env])
**Supabase Studio:** http://localhost:3001 (admin/[DASHBOARD_PASSWORD])
**Kong API Gateway:** http://localhost:8100

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind + Better Auth
- **Backend:** Go 1.22+ REST API
- **Database:** Supabase Self-Hosted (PostgreSQL 15 + Supabase Storage)
- **Shared:** TypeScript + Zod schemas

## Architecture

### BFF (Backend-For-Frontend) Pattern

**Critical constraint:** Browser NEVER calls Go API directly.

Flow:
```
Browser → Next.js Server (Route Handler / Server Action)
       → Go API (Authorization: Bearer <JWT>)
```

**Why:** Protects credentials, enforces workspace isolation server-side.

### Authentication

1. User logs in via Better Auth (apps/web/lib/auth.ts)
2. Better Auth issues JWT (Ed25519 signed)
3. Next.js calls `getServerAccessToken()` to get JWT
4. Next.js adds `Authorization: Bearer <token>` header
5. Go API validates via JWKS endpoint (`/api/auth/jwks`)
6. Go middleware extracts user_id from JWT context

**Dev note:** In CP-01, Better Auth uses in-memory storage. Restart Next.js resets sessions.

### Multi-Tenancy (Workspace Pattern)

- Every user has workspaces
- All resources (prospects, properties, costs) scoped to workspace
- Go API enforces `workspace_id` filter on all queries
- Frontend never exposes cross-workspace data

### Directory Structure

**Go API:**
```
services/api/
├── cmd/api/main.go           # Entry point, server startup
├── internal/
│   ├── auth/jwt.go           # JWKS verification + context
│   ├── config/config.go      # Load env vars
│   ├── httpapi/
│   │   ├── httpapi.go        # Routes + middleware setup
│   │   ├── middleware.go     # Auth, requestID, panic recover
│   │   ├── handlers_*.go     # Domain handlers (workspaces, prospects, etc.)
│   │   └── response.go       # Error + JSON response helpers
│   ├── storage/s3.go         # S3 client (presigned URLs)
│   └── viability/            # Business logic (cash/financing calculations)
└── go.mod, go.sum
```

**Next.js:**
```
apps/web/
├── app/
│   ├── (app)/                # Group: protected routes
│   ├── (auth)/               # Group: public auth pages
│   ├── api/                  # Route handlers (BFF endpoints)
│   ├── calculator/           # Public calculator page
│   └── page.tsx              # Landing
├── lib/
│   ├── actions/              # Server actions
│   ├── apiFetch.ts           # Go API client (server-only)
│   ├── auth.ts               # Better Auth config
│   ├── serverAuth.ts         # Token retrieval
│   └── workspace.ts          # Workspace utilities
└── components/               # React components
```

**Shared:**
```
packages/shared/src/index.ts  # Zod schemas (API contracts, validation)
```

## Development Commands

### Database (Supabase Self-Hosted)

```bash
npm run db:up          # Start Supabase stack (compose up)
npm run db:migrate     # Apply migrations (migrate/migrate image)
npm run db:down        # Stop containers
npm run db:legacy:up   # [Legacy] Start old Postgres + MinIO stack
```

### Development

```bash
npm run dev:api        # Go API (scripts/dev-api.sh) → port 8080
npm run dev:web        # Next.js → port 3000
```

Details:
- `dev:api` kills port 8080 process if exists, loads .env
- Migrations auto-run on `db:up` via compose dependency

### Quality

```bash
npm run build:web      # Production build
npm run lint:web       # ESLint
npm run typecheck:web  # tsc --noEmit
npm run fmt:api        # gofmt -w
```

### Testing

```bash
cd services/api && go test ./...    # No tests exist currently
```

## Database (Supabase Self-Hosted)

**Migrations location:** `migrations/` directory

**Pattern:** `NNNN_name.{up,down}.sql` (lexicographic order)

**Current state:** 0011_better_auth applied

**Supabase config:** `supabase/` directory (docker-compose.yml, .env)

**Workflow:**
1. Create `migrations/00NN_name.up.sql` + `migrations/00NN_name.down.sql`
2. `npm run db:migrate` applies all pending
3. Verify via Supabase Studio: http://localhost:3001

**Down migrations:** Manual via docker if needed (migrate/migrate CLI)

## Go Patterns

### HTTP Handler Structure

```go
// Handler signature
func (api *api) handleWorkspacesCollection(w http.ResponseWriter, r *http.Request) {
    // 1. Extract userID from context (set by auth middleware)
    userID := auth.UserIDFromContext(r.Context())

    // 2. Parse request
    var req CreateWorkspaceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, ...)
        return
    }

    // 3. Execute (DB query, business logic)
    ws, err := createWorkspace(api.db, userID, req)
    if err != nil {
        writeError(w, http.StatusInternalServerError, ...)
        return
    }

    // 4. Respond
    writeJSON(w, http.StatusCreated, ws)
}
```

**Patterns:**
- No repository layer (handlers query DB directly)
- Middleware sets user_id in context
- All queries filter `workspace_id` (multi-tenancy)
- Consistent error format: `{ error: { code, message, details } }`

### Routing

Handlers registered in `httpapi.go`:
```go
// Public routes (no auth required)
publicMux.HandleFunc("/api/v1/health", api.handleHealth)
publicMux.HandleFunc("/api/v1/public/cash-calc", api.handlePublicCashCalc)

// Protected routes (auth middleware applied)
protectedMux.HandleFunc("/api/v1/workspaces", api.handleWorkspacesCollection)
protectedMux.HandleFunc("/api/v1/workspaces/", api.handleWorkspacesSubroutes)
```

Middleware stacking:
```go
var h http.Handler = mainMux
h = recoverMiddleware(h)          // Panic recovery
h = requestIDMiddleware(h)         // X-Request-ID
return h
```

## TypeScript / Next.js Patterns

### apiFetch Helper

Located in `apps/web/lib/apiFetch.ts` — server-only helper for calling Go API.

```typescript
import { apiFetch } from "@/lib/apiFetch";

// In server action or route handler
const workspaces = await apiFetch<ListWorkspacesResponse>("/api/v1/workspaces");
```

**Behavior:**
- Automatically adds Bearer token
- Sets `Accept: application/json`
- No caching
- Parses `ApiErrorSchema` for consistent error handling

### Zod Schemas

All API contracts defined in `packages/shared/src/index.ts`:

```typescript
export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;
```

**Usage:**
- Frontend validates user input before sending
- Go API validates request body (implement server-side)
- Shared types prevent mismatch

### Server Actions

Located in `apps/web/lib/actions/*`:

```typescript
"use server";

import { apiFetch } from "@/lib/apiFetch";

export async function createWorkspace(name: string) {
  const result = await apiFetch("/api/v1/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return result;
}
```

**Rules:**
- Always `"use server"` at top
- Use `apiFetch` for Go API calls
- Return serializable data (no client components)

## Adding Features

### Add API Endpoint (Full Flow)

1. **Define schemas** in `packages/shared/src/index.ts`
   ```typescript
   export const MyRequestSchema = z.object({ /* ... */ });
   export type MyRequest = z.infer<typeof MyRequestSchema>;
   ```

2. **Add Go handler** in `services/api/internal/httpapi/handlers_*.go`
   ```go
   func (api *api) handleMyEndpoint(w http.ResponseWriter, r *http.Request) {
       userID := auth.UserIDFromContext(r.Context())
       // logic...
       writeJSON(w, http.StatusOK, response)
   }
   ```

3. **Register route** in `services/api/internal/httpapi/httpapi.go`
   ```go
   protectedMux.HandleFunc("/api/v1/my-endpoint", api.handleMyEndpoint)
   ```

4. **Create Next.js wrapper** in `apps/web/app/api/my-endpoint/route.ts` OR `apps/web/lib/actions/myAction.ts`
   ```typescript
   export async function myAction(data: MyRequest) {
     return apiFetch("/api/v1/my-endpoint", {
       method: "POST",
       body: JSON.stringify(data),
     });
   }
   ```

### Add Database Migration

1. Create files:
   - `migrations/NNNN_description.up.sql`
   - `migrations/NNNN_description.down.sql`

2. Run: `npm run db:migrate`

3. Verify via Supabase Studio (http://localhost:3001) or: `docker exec -it supabase-db psql -U postgres -d postgres -c "\d table_name"`

## Environment Variables

**Root `.env`:**
```bash
BETTER_AUTH_SECRET="<32+ chars>"
DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:54322/postgres?sslmode=disable"
S3_ENDPOINT=http://localhost:8100/storage/v1/s3
S3_ACCESS_KEY=<SERVICE_ROLE_KEY from supabase/.env>
S3_SECRET_KEY=<SERVICE_ROLE_KEY from supabase/.env>
S3_BUCKET=documents
STORAGE_PROVIDER=supabase
```

**Supabase config:** `supabase/.env` (generated via `utils/generate-keys.sh`)

See `env.example` for Firecrawl/OpenRouter keys.

## Common Gotchas

### Ed25519 Warning

```
ExperimentalWarning: The Ed25519 Web Crypto API algorithm...
```

Expected and harmless. Better Auth uses Ed25519. `dev:api` script suppresses via `NODE_OPTIONS`.

### Supabase Storage Bucket

Create bucket via Supabase Studio (http://localhost:3001) or SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
```

### Workspace Isolation

All Go handlers MUST filter queries by user's workspace. Use context user_id + workspace_id from request. Never expose cross-workspace data.

### BFF Pattern Violation

If frontend calls Go API directly:
- Auth tokens leak to client
- Workspace isolation breaks
- CORS complications

Always route through Next.js server-side.

## Monorepo Commands

```bash
npm -w apps/web run <command>        # Run in web workspace
npm -w packages/shared run <command> # Run in shared workspace
npm install                          # Install for all workspaces
```

## Debugging

### Go API Logs

```bash
# Running with debug
LOG_LEVEL=debug npm run dev:api

# View health
curl http://localhost:8080/api/v1/health
```

### Request IDs

All responses include `X-Request-ID` header. Use in logs for tracing.

### Database Inspection

```bash
# Via Supabase Studio (recommended): http://localhost:3001

# Or via psql
docker exec -it supabase-db psql -U postgres -d postgres
\d                              # List tables
SELECT * FROM workspaces LIMIT 5;
```
