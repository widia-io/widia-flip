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

* **Current Checkpoint:** `CP-07 — MVP Ready`
* **Milestone em andamento:** `M6 — Polimento MVP (CONCLUÍDO)`
* **Última atualização:** `2025-12-19`

## 1.2 Milestones (visão macro)

* `M0 — Setup & Foundation`
* `M1 — Prospecção + Quick Add`
* `M2 — Imóvel Hub + Viabilidade à Vista`
* `M3 — Financiamento`
* `M4 — Custos + Documentos + Timeline`
* `M5 — SEO Calculator + Gating`
* `M6 — Polimento MVP`

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

---

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
  * condo_fee, asking_price
  * agency, broker_name, broker_phone
  * comments, tags
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
