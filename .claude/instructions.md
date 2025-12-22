# Claude Code Instructions

Applied to every prompt in this repository.

## Priority Documents

1. **AGENTS.md** — Milestones, checkpoints, scope constraints, source of truth
2. **CLAUDE.md** — Technical architecture, patterns, development commands
3. **docs/PRD.md** — Official project requirements (if exists)

## Universal Constraints (Non-Negotiable)

### Architecture
- **BFF Pattern (LOCKED):** Browser NEVER calls Go API directly. All API calls → Next.js server-side → Go API with Bearer token
- **Multi-Tenancy:** Every resource filtered by `workspace_id`. No cross-workspace data leaks
- **Server-Side Truth:** Cash/financing calculations are server-side only (Go). Frontend never recalculates as source of truth

### Database
- Migrations always created as pair: `NNNN_name.up.sql` + `NNNN_name.down.sql`
- Lexicographic order (filename number determines order)
- All queries must filter `workspace_id` (tenant isolation)

### Code Standards

**Go:**
- Handler functions: max 30 lines
- Pattern: extract user_id from context → validate → execute → respond
- No repository layer (handlers query DB directly, keep simple)
- Consistent error format: `{ error: { code, message, details } }`

**TypeScript/Next.js:**
- Define schemas in `packages/shared/src/index.ts` (Zod)
- Server actions: always `"use server"` at top, use `apiFetch()` for Go API
- Route handlers in `apps/web/app/api/*` for BFF endpoints
- Never expose Bearer token to client

**Types:**
- IDs: UUID string
- Pagination: cursor + limit pattern
- Nullability: be explicit (nullable fields in schemas)

### Testing & QA
- Always test end-to-end in browser (login → action → verify data)
- Check browser console for errors/warnings
- Verify auth token flow (Request headers show `Authorization: Bearer`)
- Use `X-Request-ID` header in logs for tracing
- Smoke test checklist in AGENTS.md (milestone final deliverables)

### Commits
- Convention: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Format: `type(scope): concise description`
- Examples: `feat(M1): add prospect quick-add`, `fix: workspace isolation in costs query`
- One feature per commit when possible
- Include milestone context: `feat(M2): add property cash analysis`

### Git Workflow
- Create branch: `type/description` (e.g., `feat/prospect-quick-add`)
- Merge with main (not rebase)
- Resolve conflicts locally, test, then commit merge
- PR should reference milestone + task checklist

## Before Every Task

1. **Check AGENTS.md:**
   - Current checkpoint (CP-XX)
   - Active milestone
   - Task status + blockers

2. **Verify Scope:**
   - Single-tenant workspace MVP only (not multi-user yet)
   - Don't add CSV/XLSX import (post-MVP)
   - Don't expand property pipeline beyond MVP status
   - Don't create heavy UI components without need

3. **Read CLAUDE.md:**
   - Architecture overview
   - Relevant patterns for your task
   - Database/migration workflow if needed

4. **Plan Before Coding:**
   - Check if feature already exists
   - Verify it's in current milestone
   - Ask for clarification if scope is unclear

## Common Pitfalls to Avoid

- Frontend calling Go API directly (violates BFF)
- Calculating viability on frontend (use server-side)
- Forgetting `workspace_id` filter in queries
- Creating client components in server actions
- Mixing refactor + feature in same PR
- Not updating AGENTS.md checkpoint after work

## When Blocked

1. Update PRD/AGENTS.md with:
   - What you attempted
   - Exact error/message
   - 1–2 simple solution options

2. Document as `[BLOCKED]` in checkpoint log

3. Examples of blockers: Better Auth token flow, tenant isolation edge case, presigned URL generation, migrations

## Development Setup

```bash
# Quick start
npm run db:up && npm run db:migrate

# Two terminals
npm run dev:api   # Go API (port 8080)
npm run dev:web   # Next.js (port 3000)

# Quality checks
npm run lint:web && npm run typecheck:web && npm run fmt:api
```

See CLAUDE.md for full commands.

## Useful Context

- **Better Auth:** In-memory storage in dev (CP-01). Restart Next.js resets sessions
- **MinIO:** S3-compatible, auto-creates bucket on `db:up`
- **Ed25519 Warning:** Expected (Better Auth JWT signing). `dev:api` suppresses
- **No tests yet:** Go packages have no test files (add as needed)

## Updating Progress (After Every Task)

**MANDATORY:** Update AGENTS.md immediately after completing work:

1. **Mark Task Board:**
   - Move completed task to ✅ (check mark)
   - Keep incomplete tasks as `[ ]`
   - Update task status/notes if needed

2. **Update Current Checkpoint:**
   - Only if moved to new checkpoint
   - Format: `CP-0X`

3. **Add Checkpoint Log Entry:**
   - Format: `CP-0X — YYYY-MM-DD — "What delivered / which milestone advanced"`
   - One line, objective

**Example after task completion:**
```markdown
## Task Board (M1)

- [x] Create prospect table
- [x] Add prospect CRUD endpoints
- [ ] Add prospect quick-add UI
- [ ] Convert prospect to property

## Current Checkpoint
CP-01

## Checkpoint Log
- CP-01 — 2024-12-21 — "Prospect CRUD endpoints working, quick-add UI pending"
```

## Milestone Completion

**When you believe a milestone is fully complete:**
1. Mark ALL tasks ✅
2. Update AGENTS.md
3. **WAIT for user confirmation** before declaring milestone done
4. Do NOT move to next milestone without explicit user approval
5. Ask: "M1 appears complete. Ready to advance to M2?"

## Feature Changes & Documentation (After Every Feature)

**MANDATORY:** After implementing or modifying any feature:

1. **Update docs/PRD.md:**
   - Reflect feature in relevant checkpoint (CP-XX)
   - Update "Deve existir" sections if affected
   - Update "Task Board" for that milestone
   - Update "Current Checkpoint" if advanced
   - Add entry to "Checkpoint Log"

2. **Update CHANGELOG.md:**
   - Add entry with version, date, feature description
   - Format: `## [X.Y.Z] — YYYY-MM-DD` with bullet points
   - Group by: Added, Changed, Fixed, Removed
   - Example:
     ```markdown
     ## [0.1.0] — 2024-12-21

     ### Added
     - Prospect quick-add functionality (M1)
     - Prospect to property conversion endpoint
     - Prospect CRUD API with cursor-based pagination

     ### Changed
     - Property table schema: added `origin_prospect_id` field

     ### Fixed
     - Workspace isolation in properties query
     ```

3. **Commit message should reference both:**
   ```
   feat(M1): add prospect quick-add

   - Implemented quick-add enter-to-save on prospects table
   - Updated PRD checkpoint CP-02
   - See CHANGELOG.md for details
   ```

4. **If feature affects schema/API:**
   - Document new endpoints in PRD "Endpoints" section
   - Update Zod schemas in `packages/shared/src/index.ts`
   - Note breaking changes in CHANGELOG

**Example workflow:**
```
1. Implement quick-add feature
2. Update docs/PRD.md (CP-02 "Quick Add" ✅)
3. Add entry to CHANGELOG.md
4. Commit with reference to PRD
5. Update AGENTS.md Task Board
```
