# Changelog

All notable changes to Widia Flip are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

---

## [0.2.0-alpha.1] — 2025-12-21

### Added

- **M7 — UI/UX Polish + Extended Features**
  - Design system com shadcn/ui (Button, Card, Dialog, Input, Label, Select, Tabs, Checkbox, Textarea)
  - Light/dark mode theme toggle (ThemeProvider + ThemeToggle component)
  - Gestão completa de workspaces (`/app/workspaces` page)
    - Listagem de workspaces com cards
    - Criar/editar/deletar workspaces
    - Configurações do workspace (`/app/workspaces/:id/settings`)
    - DangerZone para exclusão com confirmação
  - Seletor de workspace no Header (WorkspaceSelector dropdown)
  - Redesign área de prospecção (cards responsivos)
    - ProspectCard component com status badges e ações
    - ProspectGrid component com grid adaptativo
    - ProspectAddModal com formulário completo + importação via URL
    - ProspectViewModal com visualização/edição completa
  - Importação de imóveis via URL (`/api/scrape-property`)
    - Integração com Firecrawl API para web scraping
    - Extração estruturada via OpenRouter LLM
    - Schemas Zod: ScrapePropertyRequest, ScrapePropertyResponse, ScrapedProperty
  - Novos endpoints Go API:
    - `PUT /api/v1/workspaces/:id` (atualizar workspace)
    - `DELETE /api/v1/workspaces/:id` (deletar workspace + cascade)
  - Symlink `.env.local` para facilitar desenvolvimento

### Changed

- Dashboard comercializado (remoção de textos técnicos, linguagem user-friendly)
- ProspectQuickAdd substituído por ProspectAddModal
- ProspectTable/ProspectRow substituídos por ProspectGrid/ProspectCard
- PropertyOverview layout melhorado
- Header com WorkspaceSelector integrado

### Fixed

- Cores de loading states agora usam variáveis de tema (compatibilidade light/dark)
- Loader2 icons com classes de cor apropriadas para cada tema
- FinancingPaymentsList com loading state correto

### Removed

- ProspectQuickAdd component (substituído por ProspectAddModal)
- ProspectRow component (substituído por ProspectCard)
- ProspectTable component (substituído por ProspectGrid)

---

## [0.1.0-alpha.1] — 2024-12-21

### Added

- **M0 — Setup & Foundation**
  - Monorepo structure (apps/web, services/api, packages/shared)
  - Docker Compose setup with PostgreSQL and MinIO
  - Better Auth integration (email/password login)
  - JWT token generation and validation via JWKS
  - Go API with health check and middleware (auth, requestID, panic recovery)
  - BFF pattern: Next.js Route Handlers and Server Actions for Go API communication
  - Base database schema (workspaces, users, workspace_memberships, workspace_settings)

- **M1 — Prospecting**
  - Prospect CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE /api/v1/prospects`)
  - Prospect table with quick-add enter-to-save functionality
  - Prospect status enum (active, discarded, converted)
  - Prospect to property conversion endpoint
  - Cursor-based pagination for prospect list
  - Price per m² automatic calculation

- **M2 — Properties & Cash Analysis**
  - Property CRUD endpoints with status pipeline
  - Property status enum (prospecting, analyzing, bought, renovation, for_sale, sold, archived)
  - Cash analysis calculation (server-side viability)
  - Cash snapshots (manual save on user action)
  - Workspace settings with Brazilian tax defaults (ITBI, registry fee, broker fee, PJ tax)
  - Property update with address, area, neighborhood

- **M3 — Financing Analysis**
  - Financing inputs (down payment %, term, interest rate, fees)
  - Financing outputs calculation (ROI, total paid, interest estimate)
  - Monthly payment plan generation
  - Financing snapshots (manual save)

- **M4 — Costs & Documents**
  - Cost CRUD (type: renovation/legal/tax/other)
  - Cost status (planned/paid)
  - Document upload via presigned S3 URLs (MinIO)
  - Document metadata storage (filename, size, content type, tags)
  - Timeline events tracking (status_changed, analysis_cash_saved, analysis_financing_saved, cost_added, doc_uploaded)

- **M5 — Public Calculator**
  - Public `/calculator` page (no auth required)
  - Save calculator results with login gating (modal)
  - Creates property + cash snapshot on save

- **Shared Package**
  - Zod schemas for all API contracts
  - Type definitions for request/response bodies
  - Validation helpers

### Changed

### Fixed

### Removed

---

## Version History

| Version | Checkpoint | Milestone | Status |
|---------|-----------|-----------|--------|
| 0.2.0-alpha.1 | CP-08 | M7 | Extended MVP |
| 0.1.0-alpha.1 | CP-07 | M0-M6 | MVP Ready |

---

## Notes

- **Extended MVP Status:** Core features M0-M6 + UI/UX enhancements M7 implemented
- **Current Phase:** Extended MVP complete, ready for user testing
- **No breaking changes yet** (pre-1.0.0)
- **New integrations:** Firecrawl (web scraping), OpenRouter (LLM extraction)
