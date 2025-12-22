# CLAUDE.md

Technical reference for Claude Code when developing in this repository. For project scope, milestones, and strategic guidelines, see `AGENTS.md`.

## Quick Start

```bash
# 1. Environment
cp env.example .env
export $(cat .env | xargs)

# 2. Database + migrations
npm run db:up
npm run db:migrate

# 3. Development (2 terminals)
npm run dev:api   # Terminal 1: Go API (port 8080)
npm run dev:web   # Terminal 2: Next.js (port 3000)
```

**Postgres:** localhost:5432 (widia/widia)
**MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind + Better Auth
- **Backend:** Go 1.22+ REST API
- **Database:** PostgreSQL 16 + MinIO (S3-compatible)
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

### Database

```bash
npm run db:up          # Start Postgres + MinIO (compose up)
npm run db:migrate     # Apply migrations (migrate/migrate image)
npm run db:down        # Stop + remove volumes
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

## Database

**Migrations location:** `migrations/` directory

**Pattern:** `NNNN_name.{up,down}.sql` (lexicographic order)

**Current state:** 0005_costs_docs_m4 applied

**Workflow:**
1. Create `migrations/0006_name.up.sql` + `migrations/0006_name.down.sql`
2. `npm run db:migrate` applies all pending
3. Verify: `docker exec -it <container> psql -U widia -d widia_flip`

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

3. Verify schema: `docker exec -it widia_flip_db_1 psql -U widia -d widia_flip -c "\d table_name"`

## Environment Variables

**Required:**
```bash
BETTER_AUTH_SECRET="<32+ chars>"
DATABASE_URL="postgres://widia:widia@localhost:5432/widia_flip?sslmode=disable"
```

**Optional (dev defaults):**
```bash
API_PORT=8080
GO_API_BASE_URL=http://localhost:8080
BETTER_AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=widia-flip-dev
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

See `env.example` for Firecrawl/OpenRouter keys.

## Common Gotchas

### Ed25519 Warning

```
ExperimentalWarning: The Ed25519 Web Crypto API algorithm...
```

Expected and harmless. Better Auth uses Ed25519. `dev:api` script suppresses via `NODE_OPTIONS`.

### MinIO Bucket Not Created

MinIO auto-creates bucket via compose service `setup-minio` on `db:up`. If missing, manually:
```bash
docker exec widia_flip_minio_1 mc mb myminio/widia-flip-dev
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
docker exec -it widia_flip_db_1 psql -U widia -d widia_flip
\d                              # List tables
SELECT * FROM workspaces LIMIT 5;
```
