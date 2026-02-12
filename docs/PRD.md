# Widia Flip — PRD + Delivery Checkpoints (SOURCE OF TRUTH)

> **Este documento é a referência principal (source of truth)** do projeto Widia Flip.
> **Agente/IA:** antes de criar tarefas, código, PRs ou alterar escopo, **leia este arquivo**.
> Sempre que concluir trabalho, **atualize o "Current Checkpoint" e marque tasks**.

---

## Agent Operating Rules (IMPORTANTE)

1. Use este doc como referência para escopo, decisões e prioridade.
2. **Não invente features** fora do milestone atual.
3. Ao finalizar uma entrega (mesmo parcial), atualize:

   * `Current Checkpoint`
   * status das tasks
   * `Checkpoint Log` (1 linha com o que foi feito)
4. Em ambiguidades, assuma a opção mais simples alinhada ao MVP e registre no log.

---

# 0) MVP Decisions (LOCKED)

> **Estas decisões evitam escopo flutuante.** Não mude sem registrar no log.

## 0.1 MVP Scope Locks

* **Sem import CSV/XLSX** no MVP.
* **Quick Add é obrigatório** no MVP (prospecção).
* **Bulk paste é fora do MVP** (pode entrar só após CP-03, se sobrar tempo).
* **Workspace no MVP é single-user** (sem convite de membros na UI).

  * Tabelas `workspace_memberships` podem existir desde M0, mas **UI de membros fica V1**.
* **Snapshot não é automático:**

  * Inputs "current" salvam a cada edição (`PUT`)
  * Snapshot só quando o usuário clica **Salvar análise** (`POST snapshot`)
* **Pipeline MVP simplificado** (apenas estes status):

  * `prospecting → analyzing → bought → renovation → for_sale → sold → archived`

## 0.2 Definition of "Current"

* "Current analysis" = último estado salvo em `analysis_*_inputs`.
* "Official/historical" = snapshots (`analysis_*_snapshots`) criados por ação explícita do usuário.

---

# 1) Progress Tracker

## 1.1 Current Checkpoint

* **Current Checkpoint:** `CP-14 — Email Marketing (Mini Mailchimp)`
* **Milestone em andamento:** `M13 — Email Marketing (CONCLUÍDO)`
* **Próximo milestone (planejado):** N/A (MVP Complete)
* **Última atualização:** `2026-02-12`

## 1.2 Milestones (visão macro)

* ✅ `M0 — Setup & Foundation`
* ✅ `M1 — Prospecção + Quick Add`
* ✅ `M2 — Imóvel Hub + Viabilidade à Vista`
* ✅ `M3 — Financiamento`
* ✅ `M4 — Custos + Documentos + Timeline`
* ✅ `M5 — SEO Calculator + Gating`
* ✅ `M6 — Polimento MVP`
* ✅ `M7 — UI/UX Polish + Extended Features`
* ✅ `M8 — Flip Score (Prospecção)`
* ✅ `M9 — Flip Score v1 (Economics + ARV) + Responsive Refactor`
* ✅ `M10 — Billing Foundation (Stripe) + Entitlements (soft)`
* ✅ `M11 — Usage Tracking (v1) + Soft Limits`
* ✅ `M12 — Paywall + Enforcement (Hard Limits)`
* ✅ `M13 — Email Marketing (Mini Mailchimp)`

## 1.3 CP Map (o que deve existir em cada checkpoint)

### CP-01 — Foundation Running

Deve existir:

* Monorepo com:

  * `apps/web` (Next App Router + Tailwind)
  * `services/api` (Go API)
  * `packages/shared` (tipos/validações/helpers)
* Docker Compose local com Postgres
* Migrations iniciais aplicando schema base (workspaces/memberships/settings)
* Better Auth funcionando no web (login/logout/session)
* API com health check e middleware de auth/tenant (mesmo que mínimo)
* README "como rodar local"
* **Auth contract fechado (ver seção 2.1)**

### CP-02 — Prospecção Operacional

Deve existir:

* Entidade `prospecting_properties` persistida no Postgres
* CRUD API + tela de tabela
* **Quick Add** funcionando (enter-to-save) + validações
* Preço/m² calculado exibido
* Converter prospecção → `property`

### CP-03 — Imóvel + Viabilidade à Vista

Deve existir:

* Entidade `properties` com status pipeline
* Tela do imóvel com abas mínimas
* Parâmetros por workspace (`workspace_settings`)
* Cálculo à vista **server-side** + outputs na UI
* Snapshot versionado (`analysis_cash_snapshots`) + histórico simples

### CP-04 — Financiamento Completo

Deve existir:

* Modelos de financiamento: `financing_plans`, `financing_payments`, snapshot
* UI de prestações + soma
* Cálculo financiado **server-side** + outputs
* Snapshot financiado + histórico

### CP-05 — Custos + Docs + Timeline

Deve existir:

* CRUD de custos (`cost_items`) + anexos simples
* Upload docs (S3 compatível) + listagem
* Timeline registra eventos (status/análise/custo/doc)

### CP-06 — SEO Calculator + Gating

Deve existir:

* Página pública calculadora (inputs mínimos)
* CTA "salvar/ver completo" exige login (modal Better Auth)
* Eventos básicos de funil (log/analytics)

### CP-07 — MVP Ready

Deve existir:

* Permissões consistentes (mesmo single-user)
* Validações e mensagens coerentes
* UI polida (loading/empty states)
* Smoke test manual documentado (seção 6)

### CP-08 — Extended MVP

Deve existir:

* **UI Comercial:**
  * Design system com shadcn/ui (buttons, cards, modals, inputs)
  * Light/dark mode toggle funcional (persiste preferência)
  * Dashboard comercializado (sem termos técnicos)

* **Gestão de Workspaces:**
  * Página `/app/workspaces` com listagem de workspaces
  * Criar/editar/deletar workspaces
  * Seletor de workspace no Header (dropdown)
  * Configurações do workspace (`/app/workspaces/:id/settings`)

* **Prospecção Redesenhada:**
  * Layout em cards responsivos (grid adaptativo)
  * Modal de adição de prospect (formulário completo)
  * Modal de visualização/edição de prospect
  * Importação via URL (web scraping com Firecrawl + LLM)

* **Integrações:**
  * Firecrawl API para scraping de anúncios
  * OpenRouter/LLM para extração estruturada de dados

### CP-09 — Flip Score v0 (Prospecção)

Deve existir:

* **Flip Score persistido no prospect:**
  * `flip_score` (0–100) + `flip_score_updated_at`
  * `flip_score_version` (ex: `v0`)
  * `flip_score_confidence` (0–1)
  * `flip_score_breakdown` (componentes + detalhes)
* **Cálculo server-side (fonte da verdade):**
  * Score calculado e persistido no backend (Go API), nunca no browser.
  * LLM usado apenas para sinais de risco (não para “dar nota final” diretamente).
* **UI (prospecção):**
  * Cards exibem o score e uma explicação mínima (tooltip/drawer leve).
  * Botão “Atualizar score” para recomputar manualmente.
* **Sem ARV/comps externos no v0:**
  * v0 usa rank interno do workspace + heurísticas objetivas.

### CP-10 — Flip Score v1 (Economics + ARV)

Deve existir:

* **Inputs mínimos no prospect para v1:**
  * `offer_price` (ou usa `asking_price` como default)
  * `expected_sale_price` (ARV alvo)
  * `renovation_cost_estimate`
  * `hold_months` (default 6)
  * `other_costs_estimate` (opcional)
* **Score v1 usa economia do deal (server-side):**
  * ROI, lucro líquido, margem de segurança e “break-even sale price”.
  * Usa `workspace_settings` (taxas) como fonte de verdade.
* **UI:**
  * Cards exibem `v0` e `v1` (ou toggle), com breakdown leve.
  * “Atualizar score v1” deve funcionar sem converter para property.

### CP-11 — Billing Foundation (Stripe) + Tier ativo (soft)

Deve existir:

* Stripe Checkout funcional (criar sessão server-side no Next e completar assinatura).
* Webhook Stripe validado (assinatura) atualizando estado do workspace (tier/status).
* `user_billing` persistido e retornado pela Go API (entitlements v0).
* UI simples de billing por workspace (`/app/workspaces/:id/billing`) mostrando plano atual.

### CP-12 — Usage Tracking v1 + avisos (sem bloqueio)

Deve existir:

* Uso medido por período por workspace para: prospects, snapshots, uploads de docs.
* UI exibindo uso vs limite + avisos (80%/100%), sem bloquear ações.
* Logs estruturados para excedência de limite (soft) para ajuste de pricing.

### CP-13 — Paywall + Enforcement ativo

Deve existir:

* Enforcement server-side nos endpoints de criação (prospect/snapshot/doc) com erro padronizado.
* UX de paywall (modal/CTA upgrade) sem quebrar navegação.
* Estados `past_due/unpaid` tratados (read-only mode).

### CP-14 — Email Marketing (Mini Mailchimp)

Deve existir:

* Opt-in de marketing no cadastro + banner no app para quem **ainda não decidiu**.
* Base de destinatários = usuários ativos com email verificado e opt-in.
* Campanhas de email (criar/listar) + fila mínima de envio com status por destinatário.
* Template fixo com logo + link de descadastro público (unsubscribe).
* Envio via Resend (mesmo provedor já usado no auth).

---

## 1.4 Task Board (MVP)

> Status: ⬜ todo | 🟦 doing | ✅ done | 🟥 blocked

### M0 — Setup & Foundation

* ✅ T0.1 Monorepo (apps/web, services/api, packages/shared)
* ✅ T0.2 Next.js App Router + Tailwind + UI base minimalista (layout/sidebar)
* ✅ T0.3 Go API skeleton (router, middleware, config, health)
* ✅ T0.4 Postgres local (docker compose) + migrations base
* ✅ T0.5 Better Auth integrado no web + sessão funcionando
* ✅ T0.6 Auth contract web↔api (BFF + bearer) implementado
* ✅ T0.7 Multi-tenant base (workspace + membership + role, single-user UI)
* ✅ T0.8 Seed/dev scripts + README "como rodar"
  **Checkpoint alvo:** `CP-01`

### M1 — Prospecção + Quick Add

* ✅ T1.1 Tabela `prospecting_properties` + CRUD API
* ✅ T1.2 Tela Prospecção (tabela minimalista + filtros)
* ✅ T1.3 Quick Add (enter-to-save) + validações
* ✅ T1.4 Preço/m² calculado e exibido
* ✅ T1.5 Tags + comentários (simples)
* ✅ T1.6 Converter prospecção → imóvel (criar `properties` e linkar origem)
  **Checkpoint alvo:** `CP-02`

### M2 — Imóvel Hub + Viabilidade à Vista

* ✅ T2.1 Entidade `properties` + status pipeline
* ✅ T2.2 Tela do Imóvel (abas mínimas)
* ✅ T2.3 `workspace_settings` com defaults BR
* ✅ T2.4 Cálculos viabilidade à vista (server-side) + UI outputs
* ✅ T2.5 Snapshot versionado (cash) + histórico
  **Checkpoint alvo:** `CP-03`

### M3 — Financiamento

* ✅ T3.1 Modelos financiamento (plano, prestações, saldo devedor)
* ✅ T3.2 UI de prestações (lista 1..N) + somatórios
* ✅ T3.3 Cálculos financiado (server-side) + outputs
* ✅ T3.4 Snapshot financiado + histórico
  **Checkpoint alvo:** `CP-04`

### M4 — Custos + Documentos + Timeline

* ✅ T4.1 CRUD custos (planejado/pago) + vínculo com imóvel
* ✅ T4.2 Upload docs (S3 compatível) + listagem por imóvel
* ✅ T4.3 Timeline: eventos de status/custos/docs/análises
  **Checkpoint alvo:** `CP-05`

### M5 — SEO Calculator + Gating

* ✅ T5.1 Página pública "Calculadora de Viabilidade" (inputs mínimos)
* ✅ T5.2 "Salvar/Ver completo" → modal login (Better Auth)
* ✅ T5.3 Eventos de funil (mínimo: logs; opcional: PostHog/etc.)
  **Checkpoint alvo:** `CP-06`

### M6 — Polimento MVP

* ✅ T6.1 Validações e mensagens de erro consistentes
* ✅ T6.2 UI polida (estados vazios, loading, feedback minimalista)
* ✅ T6.3 Smoke test E2E manual (happy path) documentado
  **Checkpoint alvo:** `CP-07 (MVP Ready)`

### M7 — UI/UX Polish + Extended Features

* ✅ T7.1 Design system com shadcn/ui (buttons, cards, modals, inputs, checkbox, textarea)
* ✅ T7.2 Light/dark mode theme toggle (ThemeProvider + ThemeToggle)
* ✅ T7.3 Dashboard comercializado (remoção de textos técnicos)
* ✅ T7.4 Fix cores loading states para compatibilidade com temas
* ✅ T7.5 Gestão completa de workspaces (CRUD + página `/app/workspaces`)
* ✅ T7.6 Seletor de workspace no Header (WorkspaceSelector dropdown)
* ✅ T7.7 Configurações do workspace (`/app/workspaces/:id/settings` + DangerZone)
* ✅ T7.8 Redesign prospecção: cards responsivos (ProspectCard, ProspectGrid)
* ✅ T7.9 Modal de adição de prospect (ProspectAddModal com formulário completo)
* ✅ T7.10 Modal de visualização/edição (ProspectViewModal)
* ✅ T7.11 Importação de imóveis via URL (scrape-property API route + Firecrawl + LLM)
* ✅ T7.12 Schemas Zod para scraping (ScrapePropertyRequest/Response, ScrapedProperty)
  **Checkpoint alvo:** `CP-08 (Extended MVP)`

### M8 — Flip Score (Prospecção)

* ✅ T8.1 Modelagem DB: campos `flip_score_*` em `prospecting_properties` + migration
* ✅ T8.2 `packages/shared`: schemas para `FlipRiskAssessment` e `FlipScoreBreakdown`
* ✅ T8.3 Go API: serviço de score v0 (determinístico) + persistência
* ✅ T8.4 Go API: endpoint para recompute manual do score
* ✅ T8.5 Integração LLM (OpenRouter): extração de risco (JSON estrito) + fallback
* ✅ T8.6 Web: exibir score no `ProspectCard` + breakdown leve + "Atualizar score"
* ✅ T8.7 Observabilidade: logs (request_id) + contagem de falhas LLM
  **Checkpoint alvo:** `CP-09 (Flip Score v0) — ALCANÇADO`

### M9 — Flip Score v1 (Economics + ARV)

* ✅ T9.1 Modelagem DB: inputs `offer_price`, `expected_sale_price`, `renovation_cost_estimate`, `hold_months`, `other_costs_estimate`
* ✅ T9.2 Go API: calcular "cash viability" para prospect (sem converter) usando `workspace_settings`
* ✅ T9.3 Go API: serviço de score v1 (economia do deal) + persistência em `flip_score_*` com `flip_score_version=v1`
* ✅ T9.4 Web: inputs mínimos v1 no Prospect modal + estado "is_partial"/validações
* ✅ T9.5 Web: exibir breakdown v1 (ROI, lucro, break-even) nos cards (leve)
* ✅ T9.6 Guardrails: score v1 só se inputs mínimos existirem; senão exibir "Complete os dados"
* ✅ T9.7 UI: "Análise de Investimento" cards (Objetivo/Tributos/Pagamento) + view/edit modes
* ✅ T9.8 Responsive refactor: mobile-first grid, compacted padding, breakpoints otimizados
  **Checkpoint alvo:** `CP-10 (Flip Score v1) — ALCANÇADO`

---

## 1.5 Task Board (Pós-MVP: Billing/Tiers)

> Status: ⬜ todo | 🟦 doing | ✅ done | 🟥 blocked

### M10 — Billing Foundation (Stripe) + Entitlements (soft)

* ✅ T10.1 Definir tiers finais + mapping de features/limites (ver seção 10)
* ✅ T10.2 Modelagem DB: `user_billing` (tier atual + status) + ids Stripe (customer/subscription/price)
* ✅ T10.3 Web (Next): página `/app/workspaces/:id/billing` (plano atual + CTA upgrade)
* ✅ T10.4 Web (Next): criar Checkout Session (Stripe) via Route Handler (BFF) e redirect
* ✅ T10.5 Webhook Stripe (Route Handler): validar assinatura e persistir status do subscription (por user) no Go API
* ✅ T10.6 Go API: endpoint interno para upsert billing (user_id) + leitura de entitlements
* ✅ T10.7 Admin override (dev only): endpoint/script para setar tier manualmente em user (para testes)
  **Checkpoint alvo:** `CP-11 — Billing Foundation (Stripe) + Tier ativo (soft)` ✅

### M11 — Usage Tracking (v1) + Soft Limits

* ✅ T11.1 Definir métricas e período de cobrança (billing cycle do Stripe; fallback calendário)
* ✅ T11.2 Implementar contadores (incrementais) por workspace: prospects criados, snapshots criados, docs enviados
* ✅ T11.3 UI: exibir uso/limite (barras simples) na página Billing + avisos (80%/100%)
* ✅ T11.4 Logs estruturados: eventos `usage_exceeded_soft` (sem bloquear)
  **Checkpoint alvo:** `CP-12 — Usage Tracking v1 + avisos (sem bloqueio)` ✅

### M12 — Paywall + Enforcement (Hard Limits)

* ✅ T12.1 Definir regra de enforcement por ação (criar workspace, prospect, snapshot, upload docs)
* ✅ T12.2 Go API: middleware/guards de entitlements por endpoint (retorna `PAYWALL_REQUIRED` / `LIMIT_EXCEEDED`)
* ✅ T12.3 Web: tratamento de erro (modal paywall + CTA upgrade) sem quebrar fluxo
* ✅ T12.4 Stripe Customer Portal (self-serve: trocar cartão/cancelar/downgrade)
* ✅ T12.5 Estados de cobrança: `past_due/unpaid` → read-only mode (não criar novos itens, mas visualizar)
  **Checkpoint alvo:** `CP-13 — Paywall + Enforcement ativo` ✅

### M13 — Email Marketing (Mini Mailchimp)

* ✅ T13.1 Modelagem DB: `email_campaigns`, `email_sends` + campos `marketing_opt_in_at`, `marketing_opt_out_at`, `unsubscribe_token` em `user`
* ✅ T13.2 Signup: checkbox opt-in marketing (se marcado, grava `marketing_opt_in_at`)
* ✅ T13.3 Banner no app para quem **ainda não decidiu** (opt-in/opt-out) e persistir decisão
* ✅ T13.4 Go API (admin): criar/listar campanhas + listar destinatários elegíveis (ativos, email verificado, opt-in)
* ✅ T13.5 Fila mínima de envio: enfileirar `email_sends` + worker batch para processar `queued`
* ✅ T13.6 Resend integration: envio de template fixo com logo + conteúdo da campanha
* ✅ T13.7 Unsubscribe público: rota `/unsubscribe/:token` que grava `marketing_opt_out_at`
* ✅ T13.8 Admin UI: lista de campanhas + criar campanha + botão "Enviar agora" com confirmação
  **Checkpoint alvo:** `CP-14 — Email Marketing (Mini Mailchimp)` ✅

## 1.6 Status Atual (Audit 2026-01-30)

> **Nota:** auditoria rápida baseada em presença de código/migrations/rotas. **Não** inclui QA completo, e pode haver diferenças de comportamento em runtime.

### M0 — Setup & Foundation

* ✅ Monorepo + docker compose presentes (`apps/`, `services/`, `packages/`, `docker-compose*.yml`).
* ✅ Better Auth no web (`apps/web/lib/auth.ts`) + BFF `apiFetch` (`apps/web/lib/apiFetch.ts`).
* ✅ Migrations base e schema (`migrations/0001_*`, `migrations/0011_*`, `migrations/0012_*`).

### M1 — Prospecção + Quick Add

* ✅ Migrations de prospecção (`migrations/0002_*`).
* ✅ CRUD API de prospects (`services/api/internal/httpapi/handlers_prospects.go`).
* ✅ UI de prospecção (página `/app/prospects` e modais de add/view).

### M2 — Imóvel Hub + Viabilidade à Vista

* ✅ Migrations de properties/settings (`migrations/0003_*`).
* ✅ API de properties + cash analysis (`handlers_properties.go`, `handlers_cash_analysis.go`).
* ✅ Hub do imóvel com abas (`apps/web/app/(app)/app/properties/[id]/*`).

### M3 — Financiamento

* ✅ Migrations de financiamento (`migrations/0004_*`).
* ✅ API de financing (`handlers_financing.go`).
* ✅ UI de financiamento (`apps/web/app/(app)/app/properties/[id]/financing`).

### M4 — Custos + Documentos + Timeline

* ✅ Migrations custos/docs/timeline (`migrations/0005_*`).
* ✅ API de custos/docs/timeline (`handlers_costs.go`, `handlers_documents.go`, timeline em `handlers_properties.go`).
* ✅ UI de custos/docs/timeline (`apps/web/app/(app)/app/properties/[id]/{costs,documents,timeline}`).

### M5 — SEO Calculator + Gating

* ✅ Página pública calculadora (`apps/web/app/calculator/page.tsx`).
* ✅ Cálculo/salvar via routes (`apps/web/app/api/calculator/*`) com gating por login (`CalculatorForm`).

### M6 — Polimento MVP

* ⚠️ **Não revalidado** — estados de loading/empty e smoke test manual não foram auditados nesta revisão.

### M7 — UI/UX Polish + Extended Features

* ✅ Theme toggle (`ThemeToggle`, `ThemeProvider`).
* ✅ Gestão de workspaces + settings (`/app/workspaces`, `/app/workspaces/[id]/settings`).
* ✅ Redesign prospecção + modais (`ProspectCard`, `ProspectAddModal`, `ProspectViewModal`).
* ✅ Importação via URL (`apps/web/app/api/scrape-property/route.ts`).

### M8 — Flip Score v0

* ✅ Migrations Flip Score v0 (`migrations/0007_*`).
* ✅ API Flip Score (`handlers_flip_score.go`) + UI em prospecção.

### M9 — Flip Score v1 (Economics + ARV)

* ✅ Migrations inputs v1 (`migrations/0009_*`).
* ✅ Cálculo server-side + UI inputs (handlers de cash/flip + modais de prospect).

### M10 — Billing Foundation (Stripe) + Entitlements

* ✅ Migrations billing (`migrations/0010_*`).
* ✅ API billing (`handlers_billing.go`) + routes Stripe no web (`/api/billing/*`).
* ✅ UI billing (`/app/billing`).

### M11 — Usage Tracking v1 + Soft Limits

* ✅ API usage (`handlers_usage.go`, `/api/v1/workspaces/:id/usage`).
* ✅ UI usage (`UsageCard`).

### M12 — Paywall + Enforcement (Hard Limits)

* ✅ Enforcement server-side (`handlers_enforcement.go`) + consumo no web (`PaywallModal`, `apiFetch`).

### M13 — Email Marketing (Mini Mailchimp)

* ✅ **Implementado** — Migration `0032_email_marketing.up.sql` cria tabelas `email_campaigns`, `email_sends` + campos `marketing_opt_in_at`, `marketing_opt_out_at`, `unsubscribe_token` em `user`.
* ✅ **Implementado** — Checkbox de opt-in no cadastro (`SignupForm.tsx`) + banner de decisão no app (`MarketingConsentBanner.tsx`).
* ✅ **Implementado** — Go API admin (`handlers_email.go`): criar/listar campanhas, listar recipients, queue, send batch.
* ✅ **Implementado** — Rota pública de unsubscribe (`/unsubscribe/:token`) + Go handler.
* ✅ **Implementado** — Admin UI (`/app/admin/email/*`): lista, create, detail + actions (queue/send).
* ✅ **Já existia** — Resend integrado no web para emails transacionais (auth) e reutilizado para marketing.

# 2) API & Data Model (para guiar implementação)

## 2.1 Auth Contract (LOCKED) — BFF + Bearer (Next → Go)

> **Objetivo:** evitar CORS/cookies complexos e manter auth consistente.

**Regra:** o browser **não chama a Go API direto** no MVP.
O web (Next) atua como **BFF (Backend for Frontend)**:

* Browser → Next Route Handler / Server Action
* Next → Go API com `Authorization: Bearer <access_token>`
* Go valida token e aplica tenant/perm.

### Implementação sugerida

* Better Auth emite **access token** acessível no server-side do Next (via sessão).
* Next cria um client interno `apiFetch()` que:

  * lê a sessão do Better Auth (server-side)
  * injeta header `Authorization: Bearer ...`
  * chama `services/api`
* Go valida o token (estratégia):

  * no MVP: valida assinatura/claims conforme Better Auth (mecanismo exato depende da config)
  * exigir ao menos: `sub` (user id/email) e expiração
* `workspace_id` vem no body/query/route, mas **sempre verificado** pelo membership.

> Se futuramente expor API diretamente ao browser: aí sim avaliar cookie/CORS.

## 2.2 Convenções de API (Go)

* Base: `/api/v1`
* IDs: UUID (string)
* Tenant: sempre filtrar por `workspace_id`
* Erros:

  * `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
* Paginação:

  * `limit`, `cursor`
* Ordenação:

  * `sort=created_at:desc`

## 2.3 Regras de cálculo (LOCKED) — rounding/null/defaults

* Moeda BRL exibida com **2 casas**.
* Percentuais persistidos como decimal (ex: 2,7% = `0.027`).
* `pj_tax_rate`:

  * se null/undefined → tratar como `0`
* Outputs nunca devem ser `null`; se input incompleto:

  * retornar erro de validação claro **ou** (preferível) assumir 0 apenas para campos opcionais e registrar no output uma flag `is_partial=true`.
* Arredondamento:

  * cálculos internos em alta precisão (decimal), arredondar só na apresentação.
* Server-side é fonte da verdade:

  * UI não "recalcula por conta própria" (pode mostrar preview, mas exibe resultado do server).

---

# 3) Entidades (tabelas mínimas MVP)

## 3.1 Tenant

* `workspaces` (id, name, created_by_user_id, created_at)
* `workspace_memberships` (id, workspace_id, user_id, role, created_at)

  * **MVP:** apenas owner (1 usuário), mas tabela já pronta.
* `workspace_settings` (workspace_id PK + rates/defaults)

## 3.2 Prospecção

* `prospecting_properties`

  * id, workspace_id
  * status, link, neighborhood, address
  * area_usable, bedrooms, suites, bathrooms
  * gas, floor, elevator, face, parking
  * condo_fee, iptu, asking_price
  * agency, broker_name, broker_phone
  * comments, tags
  * flip_score, flip_score_version, flip_score_confidence, flip_score_breakdown, flip_score_updated_at
  * offer_price, expected_sale_price, renovation_cost_estimate, other_costs_estimate, hold_months (V1)
  * created_at, updated_at

## 3.3 Imóvel central

* `properties`

  * id, workspace_id
  * origin_prospect_id (nullable)
  * status_pipeline (locked list no MVP)
  * neighborhood, address, area_usable
  * created_at, updated_at

## 3.4 Viabilidade à vista

* `analysis_cash_inputs` (current)
* `analysis_cash_snapshots` (historical)

## 3.5 Financiamento

* `financing_plans`
* `financing_payments`
* `analysis_financing_snapshots`

## 3.6 Custos, Docs e Timeline

* `cost_items`
* `documents`
* `timeline_events`

---

# 4) Endpoints por Milestone

## M0 — Foundation

### Workspaces

* `POST /api/v1/workspaces` → `{ name }`
* `GET /api/v1/workspaces`
* `GET /api/v1/workspaces/:id`

### Settings

* `GET /api/v1/workspaces/:id/settings`
* `PUT /api/v1/workspaces/:id/settings`

### Health

* `GET /api/v1/health`

**CP-01 validação:** web loga, cria workspace, API responde health.

---

## M1 — Prospecção + Quick Add

### Prospects

* `POST /api/v1/prospects`
* `GET /api/v1/prospects?workspace_id=...&status=...&q=...`
* `GET /api/v1/prospects/:id`
* `PUT /api/v1/prospects/:id`
* `DELETE /api/v1/prospects/:id`

### Convert prospect → property

* `POST /api/v1/prospects/:id/convert` → `{ property_id }`

---

## M2 — Property Hub + Cash Viability

### Properties

* `POST /api/v1/properties`
* `GET /api/v1/properties?workspace_id=...&status_pipeline=...`
* `GET /api/v1/properties/:id`
* `PUT /api/v1/properties/:id`
* `POST /api/v1/properties/:id/status` → `{ status_pipeline }`

### Cash Analysis

* `PUT /api/v1/properties/:id/analysis/cash` → retorna `{ inputs, outputs }`
* `GET /api/v1/properties/:id/analysis/cash`
* `POST /api/v1/properties/:id/analysis/cash/snapshot`
* `GET /api/v1/properties/:id/analysis/cash/snapshots`

---

## M3 — Financing

* `PUT /api/v1/properties/:id/financing` → `{ inputs, outputs }`
* `GET /api/v1/properties/:id/financing`
* `POST /api/v1/financing/:planId/payments`
* `DELETE /api/v1/financing/:planId/payments/:paymentId`
* `GET /api/v1/financing/:planId/payments`
* `POST /api/v1/properties/:id/analysis/financing/snapshot`
* `GET /api/v1/properties/:id/analysis/financing/snapshots`

---

## M4 — Costs + Docs + Timeline

* `POST /api/v1/properties/:id/costs`
* `GET /api/v1/properties/:id/costs`
* `PUT /api/v1/costs/:costId`
* `DELETE /api/v1/costs/:costId`

Docs:

* `POST /api/v1/documents/upload-url`
* `POST /api/v1/documents`
* `GET /api/v1/properties/:id/documents`
* `DELETE /api/v1/documents/:docId`

Timeline:

* `GET /api/v1/properties/:id/timeline`

---

## M5 — SEO Calculator + Gating

* `GET /calculator` (Next page pública)
* (opcional) `POST /api/v1/public/cash-calc` (calcular sem salvar)
* Salvar snapshot só logado: `POST /api/v1/properties/:id/analysis/cash/snapshot`

---

## M7 — UI/UX Polish + Extended Features

### Workspaces Extended

* `PUT /api/v1/workspaces/:id` → `{ name }` (atualizar workspace)
* `DELETE /api/v1/workspaces/:id` (deletar workspace + cascade)

### Scrape Property (Next.js BFF)

* `POST /api/scrape-property` → `{ url }` → `{ success, data: ScrapedProperty, warning? }`
  * Internamente usa Firecrawl para scraping + OpenRouter LLM para extração
  * Retorna dados estruturados do imóvel (bairro, endereço, área, quartos, valor, etc.)
  * (Extensão M8 - opcional) pode retornar também `risk_assessment` para alimentar o Flip Score

---

## M8 — Flip Score (Prospecção)

### Objetivo

Dar um **score de 0–100** em cada prospect para priorização rápida no contexto de House Flipping.

**Princípios:**

* **Server-side é fonte da verdade:** score calculado e persistido no backend (Go).
* **LLM não “decide” o score:** LLM só extrai **sinais de risco** (red flags + nível de reforma).
* **v0 não usa ARV/comps externos:** apenas rank interno do workspace + heurísticas objetivas.
* **Sem UI pesada:** mostrar score e um breakdown leve (tooltip/drawer).

### Modelo de dados (proposta)

Adicionar em `prospecting_properties`:

* `flip_score` (int 0–100, nullable)
* `flip_score_version` (text, ex: `v0`, nullable)
* `flip_score_confidence` (numeric 0–1, nullable)
* `flip_score_breakdown` (jsonb, nullable)
* `flip_score_updated_at` (timestamptz, nullable)

`flip_score_breakdown` deve armazenar, no mínimo:

* componentes (`S_price`, `S_carry`, `S_liquidity`, `S_risk`, `S_data`)
* valores intermediários relevantes (`price_per_sqm`, `carry_ratio`, `cohort_n`, `cohort_scope`)
* `risk_assessment` (abaixo), quando disponível
* `missing_fields` (lista de campos críticos ausentes)

### Contrato do LLM (OpenRouter) — FlipRiskAssessment

O LLM deve retornar **JSON estrito**:

```json
{
  "rehab_level": "light|medium|heavy|null",
  "llm_confidence": 0,
  "red_flags": [
    {
      "category": "legal|structural|moisture|condo_rules|security|noise|access|listing_inconsistency",
      "severity": 1,
      "confidence": 0,
      "evidence": "trecho curto do anúncio"
    }
  ],
  "missing_critical": ["asking_price", "area_usable"]
}
```

Notas:

* `llm_confidence` deve refletir o quão “apoiado em texto” o output está.
* Se não houver texto suficiente, o LLM deve retornar `llm_confidence` baixo e `red_flags` vazio.

### Fórmula do Flip Score v0 (0–100)

O score final é calculado a partir de um **raw score** e multiplicadores de qualidade/confiança:

1) **Componentes (0–100)**

* `S_price` (peso 40%) — “barato vs. seus prospects”
  * `price_per_sqm = asking_price / area_usable` (se ambos existirem)
  * Coorte:
    * Se `neighborhood` existir e houver `n >= 10` prospects no mesmo bairro com `price_per_sqm`, usar **bairro**
    * Senão, usar **workspace**
  * `percent_rank` (0–1):
    * Definição: percentil do `price_per_sqm` dentro da coorte (mais baixo = melhor)
    * Fallback: se `n < 5`, `S_price = 50`
  * `S_price = round(100 * (1 - percent_rank))`

* `S_carry` (peso 15%) — custo recorrente relativo ao ticket
  * `carry_month = condo_fee + (iptu / 12)` (missing tratados como 0, mas penalizados em `S_data`)
  * `carry_ratio = carry_month / asking_price`
  * Mapeamento (interpolação linear entre pontos):
    * `<= 0.10%` → 100
    * `0.20%` → 85
    * `0.30%` → 70
    * `0.50%` → 50
    * `0.70%` → 30
    * `>= 1.00%` → 0

* `S_liquidity` (peso 20%) — proxy simples de “vendabilidade”
  * Base 50, ajustes (clamp 0–100):
    * `bedrooms` 2–3: `+15` | `bedrooms` 1 ou 4+: `-5`
    * `parking >= 1`: `+10` | `parking == 0`: `-5`
    * `area_usable` 50–120: `+15` | fora disso: `-5`
    * `elevator == true`: `+5` (se existir o campo)

* `S_risk` (peso 25%) — penalidades por risco + nível de reforma
  * Sem `risk_assessment`: `S_risk = 50`
  * Penalidade por nível de reforma:
    * `light`: 0 | `medium`: 8 | `heavy`: 15
  * Penalidade por red flags:
    * `risk_penalty = Σ (weight[category] * severity(1–5) * confidence(0–1))`
    * Pesos por categoria:
      * `legal=10`, `structural=9`, `moisture=8`, `condo_rules=6`, `security=6`,
        `listing_inconsistency=5`, `noise=4`, `access=3`
  * `S_risk = clamp(100 - rehab_penalty - risk_penalty, 0, 100)`

* `S_data` (0–100) — completude dos dados críticos
  * Começa em 100 e perde pontos:
    * sem `asking_price`: `-35`
    * sem `area_usable`: `-35`
    * sem `neighborhood`: `-15`
    * sem `bedrooms`: `-10`
    * sem `condo_fee`: `-5`
    * sem `iptu`: `-5`
  * `S_data = clamp(S_data, 0, 100)`

2) **Raw score**

`raw = 0.40*S_price + 0.15*S_carry + 0.20*S_liquidity + 0.25*S_risk`

3) **Multiplicadores**

* Qualidade de dados: `m_data = 0.6 + 0.4*(S_data/100)`
* Confiança do LLM (se disponível):
  * `m_llm = 0.7 + 0.3*(llm_confidence)` (se `risk_assessment` não existir, `llm_confidence=0`)

4) **Final**

`final = round(clamp(raw * m_data * m_llm, 0, 100))`

### Recomputation (manual)

* Score deve ser recalculado por ação explícita do usuário (botão “Atualizar score”).
* Fallback obrigatório:
  * Se OpenRouter falhar, computar score sem `risk_assessment` (usar `S_risk=50`, `llm_confidence=0`).
* Rate limit / custo:
  * Evitar chamadas repetidas: se `flip_score_updated_at` < 15 min, retornar o atual (a menos que `force=true`).

### Endpoints

* `POST /api/v1/prospects/:id/flip-score/recompute` → retorna o prospect atualizado (incluindo `flip_score_*`)

---

# (PLANEJADO) ## M9 — Flip Score v1 (Economics + ARV)

### Objetivo

Transformar o score em **priorização por economia do deal**, usando inputs mínimos (ARV e custos) no próprio prospect — **sem depender de dados externos** no início.

**Princípios (mantidos):**

* Score calculado **server-side** e persistido.
* UI não recalcula viabilidade como fonte de verdade.
* LLM continua apenas como “sinais de risco” (opcional no v1).

### Inputs v1 (mínimos)

Campos no prospect (valores em BRL / meses):

* `offer_price` (nullable) — se null, usar `asking_price`
* `expected_sale_price` (nullable) — ARV alvo (manual)
* `renovation_cost_estimate` (nullable)
* `other_costs_estimate` (nullable)
* `hold_months` (nullable, default 6)

### Saídas calculadas (para breakdown)

Reusar a lógica do cálculo cash existente (viability engine) adaptada para prospect:

* `roi`, `net_profit`, `investment_total`
* `gross_profit`, `broker_fee`, `pj_tax_value`
* `break_even_sale_price` (novo, útil no v1)
* `is_partial` (se inputs faltantes)

### Fórmula do Flip Score v1 (0–100)

v1 substitui o peso principal por economia do deal:

* `S_econ` (peso 60%) — derivado de ROI + margem + buffer
  * Exemplo de mapeamento:
    * ROI:
      * `roi <= 0` → 0
      * `roi 10%` → 40
      * `roi 20%` → 70
      * `roi 30%` → 90
      * `roi >= 40%` → 100
    * Buffer:
      * `buffer = expected_sale_price - break_even_sale_price` (ou 0 se parcial)
      * Normalizar por `expected_sale_price` para reduzir efeito do ticket
* `S_liquidity` (peso 20%) — mantém proxy simples do v0 (ou evolui para “time-to-sell” manual)
* `S_risk` (peso 20%) — mantém sinal de risco do v0 (se disponível)

Multiplicadores:

* `m_data` e `m_llm` seguem a mesma ideia do v0, mas:
  * v1 exige inputs mínimos; se faltarem, não calcular (ou calcular parcial e marcar como “incompleto”)

### Recomputation (manual)

* “Atualizar score v1” recomputa e persiste.
* Se inputs mínimos faltarem, responder `VALIDATION_ERROR` com mensagem curta.

### Endpoints (proposta)

* `PUT /api/v1/prospects/:id/flip-inputs` → atualiza inputs v1 (parcial)
* `POST /api/v1/prospects/:id/flip-score/recompute?v=1` → retorna prospect com `flip_score_*` e breakdown v1

---

# 5) Acceptance Criteria by Journeys (LOCKED)

## Journey A — Quick Add (prospecção) em 3 minutos

Critérios:

* Usuário cria workspace e abre `/app/prospects`
* Consegue cadastrar **3 prospects** via quick add (enter-to-save)
* Validação impede `area_usable <= 0`
* Preço/m² aparece automaticamente após salvar
* Lista mantém foco para próxima linha sem travar

## Journey B — Viabilidade à vista + snapshot

Critérios:

* Usuário converte um prospect para property
* Na aba Viabilidade:

  * preenche inputs mínimos
  * outputs aparecem (investment_total, lucro_liquido, roi)
  * ao clicar "Salvar análise", snapshot aparece no histórico com timestamp

## Journey C — Financiamento + snapshot

Critérios:

* Usuário preenche entrada %, taxas e adiciona ao menos 3 prestações
* Define saldo devedor
* Outputs aparecem (incluindo ROI e lucro líquido)
* Snapshot financiado é criado e aparece no histórico

## Journey D — Flip Score v0 (prospecção)

Critérios:

* Em `/app/prospects`, cada card mostra um **Flip Score (0–100)** quando disponível.
* Ao abrir o prospect (modal), existe ação **“Atualizar score”**.
* Ao atualizar:
  * o score é calculado server-side e persistido no prospect
  * a UI mostra um breakdown leve (componentes + red flags, se existirem)
  * falha do LLM não bloqueia (score volta com fallback)

## Journey E — Flip Score v1 (economia do deal)

Critérios:

* No modal do prospect, usuário preenche `expected_sale_price` e `renovation_cost_estimate` (mínimos).
* Ao clicar “Atualizar score v1”, o backend calcula viabilidade cash para o prospect e persiste:
  * `flip_score_version=v1`
  * `flip_score_breakdown` contendo ao menos ROI, lucro líquido e break-even
* Cards exibem `Flip Score v1` quando disponível; caso contrário mostram “Complete os dados”.

---

# 6) MVP Demo Script (3-5 min)

**Roteiro para demonstração do MVP:**

1. **Login + Workspace** (30s)
   - Abrir http://localhost:3000 → redirect para `/login`
   - Criar conta ou logar
   - Criar workspace "Bruno Flip"

2. **Quick Add - Prospecção** (1min)
   - Ir em `/app/prospects`
   - Adicionar prospect #1: Bairro="Centro", Endereço="Rua A, 100", Área=80, Valor=400000 → Enter
   - Adicionar prospect #2: "Jardins", "Av B, 200", 100, 600000 → Enter
   - Mostrar R$/m² calculado automaticamente

3. **Converter para Property** (30s)
   - Clicar "Converter" no primeiro prospect
   - Mostrar redirect para property hub

4. **Viabilidade Cash** (1min)
   - Aba Viabilidade → preencher: Compra=400000, Reforma=50000, Venda=550000
   - Mostrar outputs: Investment Total, ROI, Lucro Líquido
   - Clicar "Salvar Análise" → mostrar snapshot no histórico

5. **Financiamento** (1min)
   - Aba Financiamento → Entrada 20%, adicionar 3 prestações de R$3000
   - Definir saldo devedor
   - Mostrar outputs calculados
   - Salvar snapshot

6. **Custos + Docs + Timeline** (1min)
   - Aba Custos → Adicionar custo "Reforma" R$15000 "Planejado"
   - Aba Documentos → Upload PDF de exemplo
   - Aba Timeline → Mostrar eventos registrados

---

# 7) Smoke Test Checklist (CP-07) — Executável

## Pré-requisitos

```bash
npm run db:up        # Postgres + MinIO rodando
npm run db:migrate   # Migrations aplicadas
npm run dev:api      # API Go em http://localhost:8080 (terminal 1)
cd apps/web && npm run dev  # Next em http://localhost:3000 (terminal 2)
```

## Teste Passo a Passo

| # | Ação | URL/Input | Resultado Esperado |
|---|------|-----------|-------------------|
| 1 | Acessar app | http://localhost:3000 | Redirect para `/login` |
| 2 | Criar conta | Sign up com email+senha | Conta criada, redirect para `/app` |
| 3 | Criar workspace | Nome: "Smoke Test WS" | Workspace selecionado |
| 4 | Ir para Prospecção | `/app/prospects` | Tabela vazia com Quick Add visível |
| 5 | Quick Add #1 | Bairro="Centro", Endereço="Rua A, 100", Área=80, Valor=400000, Enter | Linha salva, R$/m²=5000 |
| 6 | Quick Add #2 | "Jardins", "Av B, 200", 100, 600000, Enter | 2 linhas na tabela |
| 7 | Quick Add #3 | "Vila Nova", "Rua C, 50", 60, 300000, Enter | 3 linhas, R$/m²=5000 |
| 8 | Validação área | Área=0, submeter | Erro "Área deve ser maior que 0" |
| 9 | Converter prospect | Linha 1 → "Converter" | Redirect para `/app/properties/[id]` |
| 10 | Overview | Aba Overview | Endereço, bairro, área exibidos |
| 11 | Viabilidade cash | Aba Viabilidade: compra=400000, reforma=50000, venda=550000 | Outputs calculados (ROI, lucro) |
| 12 | Salvar snapshot cash | "Salvar Análise" | Sucesso, snapshot no histórico |
| 13 | Financiamento | Aba Financiamento: entrada 20%, 3 prestações R$3000 | Outputs calculados |
| 14 | Salvar snapshot financing | "Salvar Análise" | Snapshot no histórico |
| 15 | Adicionar custo | Aba Custos: Tipo=Reforma, Valor=15000, Status=Planejado | Custo na lista, total atualizado |
| 16 | Upload documento | Aba Documentos: upload arquivo PDF | Doc na lista com tamanho/data |
| 17 | Timeline | Aba Timeline | Eventos: status_changed, analysis_cash_saved, cost_added, doc_uploaded |

## Teste de Tenant Isolation

1. Criar segundo usuário (logout → signup com outro email)
2. Criar workspace "WS-B"
3. Tentar acessar property do primeiro usuário via URL direta
4. **Resultado esperado:** Erro "Imóvel não encontrado" (404)

## Checklist Final

* [ ] Login funciona (Better Auth)
* [ ] Workspace criado e selecionado
* [ ] `/app/prospects` carrega sem erros
* [ ] Quick Add salva 3 linhas e valida área
* [ ] Converter prospect → property funciona
* [ ] Aba Viabilidade calcula server-side e salva snapshot
* [ ] Aba Financiamento calcula e salva snapshot
* [ ] Custos CRUD funciona
* [ ] Upload documento funciona
* [ ] Timeline mostra eventos recentes
* [ ] Tenant isolation: nenhuma rota vaza dados entre workspaces

---

# 8) Checkpoint Log

* `CP-00` — 2025-12-18 — PRD v2: locks + auth contract + journeys + demo/smoke adicionados.
* `CP-01` — 2025-12-18 — M0 entregue: monorepo (Next+Go+shared), Postgres+Migrations base, Better Auth + BFF bearer, API health + auth (JWKS) + workspaces.
* `CP-02` — 2025-12-18 — M1 entregue: CRUD prospects (Go API), tabela prospecção com Quick Add (enter-to-save), preço/m² calculado server-side, conversão prospect→property.
* `CP-03` — 2025-12-18 — M2 entregue: Property hub com abas (overview/viability/timeline/prospect), workspace_settings BR (ITBI/registro/corretagem), cálculo cash server-side (viability engine), snapshots versionados + histórico, timeline de eventos.
* `CP-04` — 2025-12-18 — M3 entregue: financing_plans/payments/snapshots (migrations), cálculo financiado server-side (viability engine), API endpoints (PUT/GET financing, CRUD payments, snapshots), aba Financiamento no hub (inputs, prestações, outputs, histórico), timeline event analysis_financing_saved.
* `CP-05` — 2025-12-19 — M4 entregue: MinIO (S3 compatível) no docker-compose, CRUD custos (cost_items), upload docs via presigned URL (documents), timeline events (cost_added, cost_updated, doc_uploaded), abas Custos e Documentos no property hub.
* `CP-06` — 2025-12-19 — M5 entregue: página pública /calculator com inputs mínimos, cálculo server-side via BFF (endpoint público POST /api/v1/public/cash-calc), AuthModal para gating (login/signup), fluxo save (cria property + inputs + snapshot + redirect), eventos de funil via logs estruturados.
* `CP-07` — 2025-12-19 — M6 entregue: validações consistentes (percentuais 0-1, mensagens PT-BR), UI polish (loading states, empty states, aria-labels), smoke test executável documentado, demo script atualizado. MVP Ready.
* `CP-08` — 2025-12-21 — M7 entregue: UI comercial com shadcn/ui (design system completo), light/dark mode toggle, dashboard comercializado, gestão completa de workspaces (CRUD + seletor no header + settings page + DangerZone), redesign prospecção (cards responsivos + modals de adição/visualização/edição), importação de imóveis via URL (Firecrawl + OpenRouter LLM extraction). Extended MVP.
* `CP-08` — 2025-12-22 — PRD: adicionado milestone M8 (Flip Score v0) + planejamento do V1 (M9) com dados, endpoints e acceptance criteria.
* `CP-09` — 2025-12-22 — M8 entregue: DB migration (flip_score_* fields), Zod schemas (RedFlag, FlipRiskAssessment, FlipScoreBreakdown), Go flipscore package (v0 formula 5 componentes), endpoint recompute c/ rate limiting (15min) + fallback LLM, OpenRouter/Haiku integration (risk assessment), Web UI (FlipScoreBadge, modal "Atualizar score"), structured logs. Fixed: list query now includes flip_score. Flip Score v0 production-ready.
* `CP-09` — 2025-12-22 — UI polish prospecção: soft delete c/ undo (migration 0008, restore endpoint), toast feedback (sonner), ordenação client-side (score/recente/preço/R$m²), skeleton loading (Suspense boundary), filtros avançados (chips/limpar/×), microcopy padronizado, FlipScoreBadge c/ label, a11y (aria-labels).
* `CP-10` — 2025-12-22 — M9 UI: "Análise de Investimento" refactor - new components (MetricDisplay, PremiseCard, PaymentMethodToggle, InvestmentPremisesView), 3-card layout (Objetivo/Tributos/Pagamento), view mode with tooltips, edit mode reorganized with subheadings, static BR tax rates, disabled financing toggle. Visual polish: compacted padding, mobile-first grid (1→2→3 cols), renamed from "Premissas".
* `CP-10` — 2025-12-23 — M9 entregue: Flip Score v1 economics-based (migration 0009 v1 inputs), Go API viability calc para prospects, score v1 formula (S_econ peso 60%), endpoint recompute?v=1, Web inputs v1 no modal, breakdown ROI/lucro/break-even, guardrails inputs mínimos. Responsive refactor: mobile-first grids, compacted padding, breakpoints otimizados desktop/mobile.
* `CP-10` — 2025-12-23 — PRD: seção 10 (tiers comerciais) expandida + roadmap M10–M12 (Stripe billing, usage tracking e enforcement).
* `CP-10` — 2025-12-23 — PRD: billing por usuário + limite de workspaces por tier (ciclo de cobrança Stripe).
* `CP-10` — 2025-12-23 — PRD: limites workspaces por tier ajustados (Starter 1 / Pro 5 / Growth 20).
* `CP-11` — 2025-12-23 — M10 entregue: DB migration `user_billing` (tiers, status, Stripe IDs), Go API endpoints (GET /billing/me, POST internal sync/override), Next.js BFF (checkout, webhook, portal route handlers), billing page + components (BillingStatusCard, UpgradeCTA, TierLimitsCard), server actions. Stripe SDK 20.1.0 integration. 14-day free trial default.
* `CP-12` — 2025-12-23 — M11 entregue: Usage tracking v1 (prospects/snapshots/docs por workspace por período), Go API endpoint GET /workspaces/:id/usage (derivação de período Stripe/calendário, contagem via queries agregadas, flags 80%/100%), Web UI UsageCard com barras de progresso e avisos de limite, Zod schemas (WorkspaceUsageResponse, UsageMetric), structured logs `usage_exceeded_soft`. Sem enforcement (soft limits only).
* `CP-13` — 2025-12-23 — M12 entregue: Enforcement hard limits (Go handlers_enforcement.go c/ guards por endpoint), HTTP 402 + error codes PAYWALL_REQUIRED/LIMIT_EXCEEDED, PaywallModal + usePaywall hook (React Context), integração paywall em: prospect creation, cash/financing snapshots, document upload, workspace creation. Stripe Customer Portal existente. Estados past_due/unpaid bloqueiam criação.
* `CP-13` — 2026-01-07 — Landing page modernizada (tipografia, hero e seções com novo visual).
* `CP-13` — 2026-01-13 — PRD: proposta de Cronograma da Obra (V0/V1) adicionada ao backlog.
* `CP-14` — 2026-01-30 — PRD: milestone/tarefas do Email Marketing (Mini Mailchimp) adicionadas ao backlog (opt-in signup + banner, fila mínima, Resend, unsubscribe).
* `CP-13` — 2026-01-30 — PRD: auditoria no código confirma M13 (Email Marketing) ainda não implementado; Resend existe apenas para emails transacionais.
* `CP-13` — 2026-01-30 — PRD: auditoria rápida do código para M0–M12 (presença de migrations/handlers/rotas) + resumo de pendências.
* `CP-14` — 2026-01-30 — M13 entregue: Email Marketing MVP com LGPD compliance. Migration 0032 (email_campaigns, email_sends, user fields). Go API (handlers_email.go): admin routes + public unsubscribe. Web: SignupForm checkbox, MarketingConsentBanner, server actions, admin UI (/app/admin/email). Resend integration reutilizada.
* `CP-14` — 2026-02-12 — Branding: monograma SVG MF+seta padronizado conforme manual (componentes web + templates de email Next/Go), removendo variação antiga de ícone.
* `CP-14` — 2026-02-12 — Branding: stories (slides 01/03/05) alinhados ao branco oficial do monograma (`#FFFFFF`) e sistema `.interface-design/system.md` salvo com regras de logo/tokens.
* `CP-14` — 2026-02-12 — Dev setup local: `dev:api` passou a carregar `.env.local.shared` + `.env`; `DATABASE_URL` alinhado ao Supabase ativo (`supabase_admin@54322`) e API validada sem erro de autenticação.
* `CP-14` — 2026-02-12 — Migrations: `scripts/apply-migrations.sh` ajustado para detectar rede/credenciais do container Supabase ativo; reparo de estado `dirty` e aplicação concluída até `0036` (corrigido `0020_admin_flag` para idempotência).
* `CP-14` — 2026-02-12 — Dev tooling: adicionado `npm run db:repair` (script `scripts/db-repair.sh`) para reparar estado `schema_migrations` dirty automaticamente; README atualizado com fluxo de recovery.
* `CP-14` — 2026-02-12 — Oportunidades/Admin: tela de execução do scraper com parâmetros (cidade/bairro), placeholders salvos (criar/editar/executar) e registro de última execução por placeholder; API admin + migration `0038` para persistência.
* `CP-14` — 2026-02-12 — Oportunidades/Admin: execução do scraper agora suporta `dry_run` (sem persistência) e retorna lista de imóveis na própria resposta; UI exibe resultados da última execução (score/preço/área/link) para validação imediata.
* `CP-14` — 2026-02-12 — Oportunidades/Admin: parâmetro `state` adicionado na execução e nos placeholders, persistido em DB (migration `0039`) e normalizado em lowercase (ex: `pr`) antes de chamar o scraper.
* `CP-14` — 2026-02-12 — Oportunidades/Scraper: fallback inteligente de URL por localidade (formato legado `++`, formato `+`, zonas para capitais como São Paulo e aliases `vila`/`vl`, `jardim`/`jd`), destravando buscas como `São Paulo/Mooca` e `Curitiba/Vila Izabel` sem exigir slug manual.
* `CP-14` — 2026-02-12 — Oportunidades V2: API protegida (`GET /opportunities`, `GET /opportunities/facets`, `PATCH /opportunities/:id/status`) com filtros canônicos+aliases, facets dinâmicos (UF/cidade/bairro/status/quartos/ranges), actions web via Bearer e UI refeita com faixa de mercado ativa, filtros dependentes, chips removíveis e toggle Cards/Tabela com atualização de status em tempo real.
* `CP-14` — 2026-02-12 — Deploy scraper-ready: `services/api/Dockerfile` atualizado para builder `golang:1.24-alpine` e runtime com `chromium` + dependências/fontes (`CHROME_PATH`), garantindo execução do scraper de oportunidades em produção sem setup manual no host.
* `CP-14` — 2026-02-12 — Hotfix scraper: validação de aderência geográfica (cidade+bairro+UF) antes de aceitar listagens de fallback, evitando dry-run de `Curitiba/Vila Izabel` retornar imóveis de outras praças (ex.: SP) em páginas genéricas do Zap.
* `CP-14` — 2026-02-12 — Hotfix scraper (filtro geográfico v2): UF passou a ser validação flexível (aceita URLs sem token de estado, mas bloqueia UF explícita divergente), mantendo trava por cidade e fallback inteligente por bairro; dry-run `Curitiba/Vila Izabel` subiu de 3 para 24 itens mantendo consistência de praça.
* `CP-14` — 2026-02-12 — Oportunidades/UI hotfix: removido filtro implícito `min_score=50` na página (`/app/opportunities`), evitando lista vazia em produção quando o scraper retorna oportunidades com score < 50 (agora default sem corte e chip/slider de score só aplicam quando configurados).

---

# 9) Backlog (Pós-MVP)

> Itens planejados para futuro. Não implementar até milestone específico autorizar.

* ⬜ T-FUTURE.1 Job de limpeza: hard delete de prospects com `deleted_at` > 30 dias
* ⬜ T-FUTURE.2 Ordenação server-side: `GET /prospects?sort=flip_score:desc|created_at:desc|asking_price:asc|price_per_sqm:asc`
* ⬜ T-FUTURE.3 Cronograma da Obra (V0 — sem backend novo)
  * **Objetivo:** responder rápido “o que vem agora?”, “o que está atrasado?” e “quanto já foi executado (R$ e itens)”.
  * **Fonte de verdade (existente):**
    * Custos de reforma: `GET /api/v1/properties/:id/costs` → filtrar `cost_type=renovation`; usar `due_date` como data do cronograma e `status planned/paid` como progresso.
    * Marcos/histórico: `GET /api/v1/properties/:id/timeline` → status changes + eventos de custo/doc/análises.
  * **UI mínima sugerida (Property Hub → aba Cronograma/Obra):**
    * Resumo: fase atual, início da reforma (primeiro `status_changed` para `renovation`), “dias em reforma”, `R$ pago vs planejado` (reforma), contagem de atrasados.
    * Lista por data: seções “Atrasados”, “Próximos 7 dias”, “Futuros”; cada linha = `cost_item` (categoria, fornecedor, valor, `due_date`, status).
    * Ações rápidas: editar `due_date`/valor/fornecedor e marcar “Pago” (reaproveita endpoints de custos).
* ⬜ T-FUTURE.4 Cronograma da Obra (V1 — milestones manuais)
  * **Opção A (mais simples):** adicionar `event_type` de timeline para milestones manuais (ex: `renovation_milestone_created/updated`) + endpoint `POST/PUT` para criar/editar (mantém leitura via timeline).
  * **Opção B (mais correta):** tabela `schedule_items` com CRUD (itens de cronograma dedicados com `title`, `planned_date`, `done_at?`, `notes?`, `order?`), e timeline apenas como log.
  * **Regras:** manter minimalista (sem Gantt pesado), sem expandir pipeline além dos status do MVP.

---

# 10) Tiers comerciais (interno) + limites (enforcement ativo desde M12)

> **Preços e limites atualizados em 2025-12-23.**
> **Enforcement via código ativo desde M12 (CP-13).**

## 10.1 Tiers e preços

> **Modelo comercial:** assinatura **por usuário** (Stripe subscription). Cada tier define workspaces máximos + limites de uso.

| Tier | Preço | Workspaces | Prospects/mês | Snapshots/mês | Docs/mês |
|------|-------|------------|---------------|---------------|----------|
| **Starter** | R$ 29/mês | 1 | 50 | 30 | 10 |
| **Pro** | R$ 97/mês | 3 | 300 | 200 | 100 |
| **Growth** | R$ 297/mês | 10 | Ilimitado* | Ilimitado* | 500 |

*Ilimitado = 999999 no código (sem limite prático)

## 10.2 Features por tier

* **Starter (R$ 29/mês)**
  * Prospecção + Quick Add
  * Flip Score básico (v0)
  * Property Hub
  * Viabilidade cash
  * Snapshots manuais

* **Pro (R$ 97/mês)**
  * Tudo do Starter
  * **Flip Score v1** (economics + ARV)
  * Financiamento completo
  * Custos e documentos
  * Timeline

* **Growth (R$ 297/mês)**
  * Tudo do Pro
  * Import via URL
  * Suporte prioritário

## 10.3 Limites de uso (enforcement ativo)

> **Unidade:**
>
> * Assinatura é **por usuário** (Stripe subscription no user).
> * Limites de **uso** são por **workspace** por **período de cobrança** (billing cycle do Stripe).
> * Limite de **workspaces** é por **usuário** (contagem absoluta de workspaces ativos).

* **Workspaces ativos por usuário**
  * Starter: até **1**
  * Pro: até **3**
  * Growth: até **10**

* **Prospects por mês**
  * Starter: até **50**
  * Pro: até **300**
  * Growth: **ilimitado** (999999)

* **Snapshots por mês** (cash + financing somados)
  * Starter: até **30**
  * Pro: até **200**
  * Growth: **ilimitado** (999999)

* **Uploads de documentos por mês**
  * Starter: até **10**
  * Pro: até **100**
  * Growth: até **500**

## 10.4 Métricas (definição objetiva)

* **Workspaces ativos:** contagem de `workspaces` ativos (sem `deleted_at`) onde `created_by_user_id = user_id` (MVP: single-user).
* **Prospects:** contagem de `prospecting_properties` criados no período.
* **Snapshots:** contagem de snapshots criados (`analysis_cash_snapshots` + `analysis_financing_snapshots`) no período.
* **Uploads de docs:** contagem de `documents` criados no período (1 registro = 1 upload finalizado).

## 10.5 Implementação Stripe (marcos)

> **Princípios:**
>
> * **BFF permanece obrigatório:** browser nunca fala com a Go API direto.
> * Go API é a **fonte da verdade** para entitlements (tier + limites) e para enforcement futuro.
> * Integrações Stripe ficam no **server-side** (Next Route Handlers + webhook).
> * Assinatura é **por usuário**; workspaces herdam entitlements do owner (MVP: `created_by_user_id`).

### M10 — Billing Foundation (Stripe) + Entitlements (soft)

* Stripe: criar **Products/Prices** para `starter/pro/growth` (mensal) e registrar `price_id` no app.
* Fluxos:
  * `/app/workspaces/:id/billing` → “Assinar / trocar plano”
  * Checkout (Stripe Checkout Session) criado por Route Handler no Next
  * Webhook Stripe atualiza `workspace_billing` (customer/subscription/status/tier)
* Entitlements v0:
  * API retorna `tier` + limites configurados (sem bloquear nada ainda)
  * UI exibe “Plano atual” (sem paywall)

### M11 — Usage Tracking (v1) + Soft Limits

* Medição de uso por workspace + período:
  * implementar contadores e/ou queries otimizadas (sem custo alto)
  * UI mostra **uso vs limite** e avisos de 80%/100% (somente informativo)
* Observabilidade:
  * logs/eventos quando exceder limite (para guiar pricing e tuning)

### M12 — Paywall + Enforcement (Hard Limits)

* Enforcement no Go API (server-side):
  * bloquear apenas ações de criação (workspace/prospect/snapshot/doc) ao exceder limite
  * leitura continua liberada (view-only) para evitar “app quebrado”
* Web UX:
  * modal paywall com CTA “Fazer upgrade” + link para Billing
* Billing states:
  * `past_due/unpaid` → modo leitura (e-mail/aviso + self-serve via Stripe Portal)
