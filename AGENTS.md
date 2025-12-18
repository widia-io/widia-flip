# AGENTS.md — Widia Flip

Este arquivo define **como agentes de IA devem trabalhar** neste repositório.

> **Fonte de verdade:** `docs/PRD.md`
> Antes de qualquer mudança relevante, **leia** o PRD e siga os checkpoints.

---

## 1) Documentos que mandam (ordem de prioridade)

1. `docs/PRD.md` — escopo, milestones, checkpoints, endpoints, regras (SOURCE OF TRUTH)
2. `README.md` — como rodar local, env vars, scripts
3. `services/api/README.md` e `apps/web/README.md` — detalhes por app (se existirem)

---

## 2) Como o agente deve começar (sempre)

1. Abra `docs/PRD.md`
2. Verifique:

   * **Current Checkpoint**
   * **Milestone em andamento**
   * **MVP Decisions (LOCKED)**
3. Execute apenas tarefas do milestone atual.
4. Ao terminar um bloco, atualize no PRD:

   * Current Checkpoint (se avançou)
   * status das tasks
   * Checkpoint Log (1 linha objetiva)

---

## 3) Regras de escopo (hard rules)

* **Não adicionar import CSV/XLSX no MVP.**
* **Não implementar UI de membros no MVP** (workspace é single-user).
* **Bulk paste é fora do MVP** (só após CP-03 e se sobrar tempo).
* **Não expandir pipeline** além dos status do MVP.
* **Não criar componentes UI pesados** sem necessidade (manter minimalista).
* **Não recalcular viabilidade no frontend** como fonte de verdade: cálculos são server-side.

Se algo parecer útil mas não está no PRD: registre como sugestão no log e pare.

---

## 4) Auth Contract (obrigatório)

O web é **BFF**. O browser **não** chama a Go API direto.

Fluxo:

* Browser → Next (Route Handler / Server Action)
* Next → Go API com `Authorization: Bearer <token>`

Se você não conseguir implementar exatamente assim, pare e registre no log como bloqueio.

---

## 5) Padrões de código (alto nível)

### Monorepo

* `apps/web` — Next.js App Router + Tailwind
* `services/api` — Go REST API
* `packages/shared` — tipos e validações compartilhadas

### Convensões

* IDs: UUID string
* Tenant: toda query no DB filtra `workspace_id`
* Errors: formato consistente `{ error: { code, message, details } }`
* Paginação: `limit` + `cursor`
* Logs: estruturados (request_id)

---

## 6) Como trabalhar por milestone (expected deliverables)

### M0 — Setup & Foundation

Entregáveis esperados:

* docker-compose (Postgres) + migrations base
* Next layout minimalista (sidebar/header)
* Go API com router, middleware, health
* Better Auth funcionando no web
* Client interno do Next (`apiFetch`) chamando Go com Bearer

### M1 — Prospecção + Quick Add

Entregáveis:

* CRUD de prospects
* Tela tabela minimalista com quick add enter-to-save
* Conversão prospect → property

### M2 — Imóvel Hub + Cash Viability

Entregáveis:

* Property hub com abas mínimas
* Settings por workspace com defaults BR
* Cálculo cash server-side + snapshot manual

### M3 — Financiamento

Entregáveis:

* Modelo de prestações + saldo devedor
* Cálculo financiado server-side + snapshot manual

### M4 — Custos + Docs + Timeline

Entregáveis:

* CRUD custos
* Upload doc via presigned URL
* Timeline eventos principais

### M5 — SEO Calculator + Gating

Entregáveis:

* `/calculator` público
* salvar exige login (modal)
* eventos de funil (mínimo logs)

### M6 — Polimento

Entregáveis:

* validações e UX states
* smoke test checklist completo (PRD)

---

## 7) Como atualizar progresso (obrigatório)

Ao concluir trabalho:

* Atualize `docs/PRD.md`:

  * Current Checkpoint (se mudou)
  * Task Board (marcar ✅)
  * Checkpoint Log (1 linha: data + resumo)

Formato do log:

* `CP-0X` — YYYY-MM-DD — "O que foi entregue / qual milestone avançou"

---

## 8) Como o agente deve pedir ajuda (quando travar)

Se você travar em:

* Better Auth token → Go validation
* migrations/DB schema
* tenant isolation
* storage presigned upload

Faça:

1. escreva no PRD log como **BLOCKED**
2. inclua:

   * o que tentou
   * erro/mensagem
   * 1–2 opções de solução simples


