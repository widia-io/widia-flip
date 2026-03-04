# Widia Flip — Mini PRD (Pós-MVP): Oferta Inteligente em 60s

> Documento de planejamento. Sem mudanças de código neste estágio.
> Este mini PRD complementa o `docs/PRD.md` para uma trilha pós-MVP.

---

## 1) Objetivo de negócio

Criar uma feature de alto impacto em conversão que transforme "análise" em "ação comercial":

* reduzir tempo até valor em novos usuários;
* aumentar conversão de lead para signup e de trial/free para pago;
* aumentar frequência de uso no fluxo de prospecção.

North Star KPI:

* `% de novos usuários que geram a 1ª oferta em < 10 minutos`.

Guardrail KPI:

* `% de ofertas com decisão REVIEW` (evitar excesso por falta de dados).

Kill criteria (30-45 dias):

* pausar/pivotar se `trial_to_paid_after_offer` não subir >= 10% vs baseline, mesmo com volume mínimo de 200 ofertas geradas.

---

## 2) Problema atual

O produto já calcula bem a viabilidade (cash/financing, flip score, market data), mas ainda existe fricção entre:

* descobrir oportunidade;
* decidir preço de oferta;
* executar contato com corretor/vendedor.

Hoje o usuário precisa montar essa decisão manualmente.

---

## 3) Proposta de feature

Feature: **Oferta Inteligente em 60s**

A partir de um prospect (ou URL já importada), gerar em um único fluxo:

* faixa de oferta (`aggressive`, `recommended`, `ceiling`);
* decisão `GO | REVIEW | NO_GO` com motivos padronizados;
* resumo de economia do deal (lucro, margem, break-even);
* mensagem pronta para contato (template determinístico);
* checklist curto de próximos passos (due diligence mínima).

---

## 4) Escopo MVP (in/out)

### In Scope

* geração server-side de 3 cenários de oferta;
* decisão determinística com razões objetivas;
* persistência de snapshots operacionais (quando usuário salva);
* detecção de oferta obsoleta (`is_stale`);
* eventos de funil e fricção para mensurar ativação/conversão.

### Out of Scope

* envio automático para WhatsApp/email;
* integração com CRM externo;
* automação de negociação;
* cálculo no frontend como fonte de verdade;
* LLM como dependência crítica de disponibilidade/performance.

---

## 5) Decisões de produto (LOCKED)

* cálculo de cenários e decisão são **100% determinísticos**;
* LLM é opcional e só pode atuar como enhancement de copy;
* endpoint `generate` **não** cria histórico definitivo;
* endpoint `save` cria snapshot operacional versionado;
* thresholds de decisão vêm de `workspace_settings` (não hardcoded global);
* resultado sempre exibe premissas e defaults usados;
* histórico padrão ordenado por `created_at DESC, id DESC`.

---

## 6) Jornada do usuário (MVP)

1. Usuário abre um prospect e clica em "Gerar oferta inteligente".
2. Backend calcula cenários com base em inputs do prospect e `workspace_settings`.
3. UI mostra:
   * preço por cenário;
   * retorno esperado por cenário;
   * decisão `GO/REVIEW/NO_GO`;
   * "por que esse preço", "quais defaults foram usados", "o que mudaria a decisão".
4. Usuário copia mensagem pronta e escolhe salvar "Oferta v1".
5. Quando inputs/settings mudam, UI marca ofertas antigas como obsoletas (`is_stale`).

---

## 7) Requisitos funcionais

* RF-01: geração deve ocorrer no backend (Go API) e retornar em <= 3s p95.
* RF-02: `generate` calcula e retorna resultado efêmero (sem histórico definitivo).
* RF-03: `save` cria snapshot operacional append-only.
* RF-04: suporte a prospect com inputs mínimos (`asking_price`, `area_sqm`, `expected_sale_price`, `renovation_cost_estimate`).
* RF-05: usar defaults de `workspace_settings` quando input estiver ausente e listar isso em `assumptions[]`.
* RF-06: retornar 3 cenários (`aggressive`, `recommended`, `ceiling`) com breakdown.
* RF-07: retornar `decision` (`GO|REVIEW|NO_GO`), `confidence` (0-1), `reason_codes[]` e `reason_labels[]`.
* RF-08: gerar mensagem pronta determinística (`short` e `full`) com placeholders resolvidos.
* RF-09: todo acesso deve respeitar tenant (`workspace_id`) e membership.
* RF-10: browser nunca chama Go direto (contrato BFF obrigatório).
* RF-11: erros no padrão `{ error: { code, message, details } }`.
* RF-12: histórico paginado por `limit + cursor`.
* RF-13: aplicar sanity check de preço de venda otimista e sinalizar `OPTIMISTIC_SALE_PRICE_ESTIMATE` quando `expected_sale_price / asking_price` exceder limite configurado.
* RF-14: `generate` deve ter rate limit por `workspace_id` (default: `10 req/min`), com resposta `429` e `error.code=RATE_LIMITED`.
* RF-15: front/BFF não deve disparar `generate` por keystroke; usar debounce mínimo de `600ms` e disparo por ação explícita.

---

## 8) Modelo objetivo de confidence (MVP)

`confidence` deve ser calculada explicitamente, sem heurística opaca.

Proposta de score (0-1):

`confidence = 0.30*input_quality + 0.25*default_dependency + 0.20*economic_consistency + 0.15*risk_signals + 0.10*market_coverage`

Definições:

* `input_quality`: completude e validade dos campos críticos.
* `default_dependency`: penalidade para % de campos assumidos por default.
* `economic_consistency`: coerência entre `asking_price`, `expected_sale_price`, `renovation_cost_estimate`, taxas e prazo.
* `risk_signals`: flags de risco estruturadas do prospect.
* `market_coverage`: qualidade/amostra de apoio (quando disponível no módulo market data).

Configuração e calibragem:

* os pesos default acima são baseline inicial e **revisáveis**;
* permitir override opcional por `workspace_settings` via `offer_confidence_weights_json`;
* validar no backend: pesos >= 0, soma = 1.00 e chaves conhecidas;
* se configuração estiver ausente/inválida, usar pesos default e registrar `assumption`.

Buckets:

* `high`: `confidence >= 0.75`
* `medium`: `0.55 <= confidence < 0.75`
* `low`: `confidence < 0.55`

---

## 9) Política de decisão GO / REVIEW / NO_GO

Regra deve ser determinística e parametrizada por `workspace_settings`.

Parâmetros mínimos sugeridos:

* `offer_min_margin_pct`
* `offer_min_net_profit_brl`
* `offer_min_confidence`
* `offer_max_risk_score`

Política:

* `GO`: `recommended.margin >= offer_min_margin_pct` **e** `recommended.net_profit >= offer_min_net_profit_brl` **e** `confidence >= offer_min_confidence` **e** `risk_score <= offer_max_risk_score`.
* `REVIEW`: retorno financeiro aceitável, mas `confidence` baixa, dados incompletos ou risco intermediário.
* `NO_GO`: `ceiling` já viola margem/lucro mínimo, ou risco acima do limite.

Reason codes padronizados:

* `LOW_MARGIN`
* `LOW_NET_PROFIT`
* `LOW_DATA_CONFIDENCE`
* `MISSING_CRITICAL_INPUT`
* `HIGH_RENOVATION_RISK`
* `MARKET_SAMPLE_TOO_LOW`
* `UNFAVORABLE_BREAK_EVEN`
* `OPTIMISTIC_SALE_PRICE_ESTIMATE`

---

## 10) Regras de cálculo e dependências

Base:

* reaproveitar engine existente de viabilidade cash/flip score v1;
* cenários de oferta devem sair mesmo com serviços opcionais indisponíveis.

Estratégia de cenário:

* `aggressive`: alvo de margem maior e maior desconto;
* `recommended`: equilíbrio retorno x chance de fechamento;
* `ceiling`: preço máximo que preserva thresholds mínimos.

Resiliência:

* LLM fora do caminho crítico de cálculo;
* fallback de copy sempre por template determinístico;
* se enhancement LLM falhar, resposta mantém cálculos e decisão.

Sanity checks mínimos:

* parâmetro `offer_max_sale_to_ask_ratio` em `workspace_settings` (default `1.5`);
* se `expected_sale_price > asking_price * offer_max_sale_to_ask_ratio`, forçar `reason_code=OPTIMISTIC_SALE_PRICE_ESTIMATE` e rebaixar `confidence_bucket` para no máximo `medium`.

---

## 11) Obsolescência de oferta (staleness)

Toda oferta salva deve armazenar:

* `input_hash`
* `settings_hash`
* `formula_version`

Campos derivados:

* `is_stale` (boolean)
* `stale_reason` (`INPUT_CHANGED|SETTINGS_CHANGED|FORMULA_CHANGED`)

Comportamento:

* ao abrir histórico, backend compara hash atual vs hash da oferta;
* UI destaca oferta obsoleta e oferece ação "Regenerar".

---

## 12) Contratos API/BFF (planejado)

Go API (autenticada):

* `POST /api/v1/prospects/:id/offer-intelligence/generate`
* `POST /api/v1/prospects/:id/offer-intelligence/save`
* `GET /api/v1/prospects/:id/offer-intelligence/history?limit=...&cursor=...`

Semântica:

* `generate`: resposta calculada para preview, sem persistência definitiva.
* `save`: persiste snapshot operacional e retorna `offer_recommendation_id`.

Comportamento de proteção:

* `generate` limitado por `workspace_id` (`10 req/min`, default configurável);
* ao exceder limite, retornar `429` + `Retry-After` + `error.code=RATE_LIMITED`.

Resposta de `generate` (resumo):

* `decision`, `confidence`, `confidence_bucket`, `reason_codes[]`
* `assumptions[]`, `defaults_used[]`
* `scenarios[]` com `offer_price`, `net_profit`, `roi`, `margin`, `break_even_sale_price`
* `message_templates` (`short`, `full`)

Resposta de `history`:

* paginação `limit + cursor`
* ordenação fixa `created_at DESC, id DESC`

Next BFF:

* `apps/web/app/api/prospects/[id]/offer-intelligence/generate/route.ts`
* `apps/web/app/api/prospects/[id]/offer-intelligence/save/route.ts`
* `apps/web/app/api/prospects/[id]/offer-intelligence/history/route.ts`

---

## 13) Modelo de dados (mínimo)

Tabela proposta: `offer_recommendations`

* `id` (uuid)
* `workspace_id` (uuid)
* `prospect_id` (uuid)
* `created_by_user_id` (text/uuid do auth)
* `formula_version` (text)
* `decision` (text)
* `confidence` (numeric)
* `confidence_bucket` (text)
* `reason_codes` (text[])
* `recommended_offer_price` (numeric)
* `recommended_margin` (numeric)
* `recommended_net_profit` (numeric)
* `input_hash` (text)
* `settings_hash` (text)
* `is_stale` (boolean default false)
* `stale_reason` (text nullable)
* `inputs_json` (jsonb)
* `outputs_json` (jsonb)
* `created_at` (timestamptz)

Índices mínimos:

* `(workspace_id, prospect_id, created_at DESC, id DESC)`
* `(workspace_id, is_stale)`
* `(workspace_id, decision)`

---

## 14) UX e monetização

Posicionamento:

* "Saia da análise com uma oferta concreta em 60 segundos."

Princípio anti-falsa-precisão:

* mostrar faixa e pressupostos, não só número "mágico";
* destacar o que mais impactou a recomendação.

Gating orientado a ativação:

* `free/trial`: primeira oferta completa liberada (3 cenários + mensagem full).
* `free/trial` após 1ª oferta: mostrar apenas cenário `recommended`, bloquear `aggressive`/`ceiling`, bloquear `history` e liberar somente `message_templates.short`.
* `Pro+`: acesso completo contínuo (3 cenários, histórico, mensagem full, regeneração sem bloqueio comercial).

---

## 15) Instrumentação (obrigatória)

Eventos de valor:

* `offer_intelligence_opened`
* `offer_intelligence_generated`
* `offer_intelligence_saved`
* `offer_message_copied`
* `offer_intelligence_regenerated`

Eventos de fricção e monetização:

* `offer_intelligence_blocked_missing_inputs`
* `offer_intelligence_paywall_viewed`
* `offer_intelligence_upgrade_cta_clicked`
* `offer_intelligence_assumptions_used`
* `offer_decision_review_reason`
* `offer_intelligence_rate_limited`

Propriedades mínimas:

* `workspace_id`, `prospect_id`, `tier`, `decision`, `reason_codes`, `confidence_bucket`, `defaults_count`, `source` (`blog|calculator|direct`)

---

## 16) Plano de rollout (4-6 semanas)

Semana 1:

* modelagem de dados + contratos compartilhados (`packages/shared`);
* endpoint `generate` determinístico + confidence model.

Semana 2:

* BFF + UI inicial no modal de prospect;
* render de cenários, decisão, pressupostos e reason codes.

Semana 3:

* endpoint `save` + histórico paginado;
* `is_stale` e regeneração.

Semana 4:

* gating por tier orientado a ativação;
* eventos completos + dashboard admin básico.

Semanas 5-6 (opcional):

* experimento A/B de copy e paywall;
* calibração de thresholds e pesos de `confidence` com dados reais.

---

## 17) Riscos centrais e mitigação

Risco 1: falsa precisão.

Mitigação:

* exibir faixa de segurança, pressupostos e sensibilidade.

Risco 2: percepção de caixa-preta.

Mitigação:

* expor reason codes, defaults usados e condições que mudariam a decisão.

Risco 3: recomendação inconsistente por dados incompletos.

Mitigação:

* confidence com fórmula objetiva + bucket explícito + bloqueio de inputs críticos.

---

## 18) Critérios de aceite (MVP)

* geração funcional para prospect válido em <= 3s p95;
* decisão determinística `GO/REVIEW/NO_GO` com `reason_codes`;
* `confidence` auditável conforme fórmula documentada;
* `generate` sem persistência definitiva e `save` com snapshot;
* sanity check de preço otimista ativo (`OPTIMISTIC_SALE_PRICE_ESTIMATE`);
* rate limit de `generate` aplicado por workspace com erro padronizado (`429/RATE_LIMITED`);
* histórico paginado com ordenação `created_at DESC, id DESC`;
* detecção `is_stale` funcional para mudanças de input/settings/fórmula;
* contrato BFF respeitado de ponta a ponta;
* eventos de valor/fricção chegando no painel admin;
* sem regressão no fluxo existente de prospects/flip score.

---

## 19) Task Board de execução (M17a proposto)

> Objetivo: transformar este mini PRD em backlog executável, com ordem obrigatória de implementação.
> Status inicial: todas as tasks em aberto.

### Ordem de execução

`DB/Shared -> API -> BFF -> UI -> Analytics -> Hardening`

### DB + Shared

* ✅ `T17A.1` Migration: criar tabela `offer_recommendations` com colunas/índices definidos na seção 13.
  * Dependência: nenhuma.
  * DoD: migration aplica/rollback sem erro; índices criados.
* ✅ `T17A.2` Migration: estender `workspace_settings` com parâmetros de oferta (`offer_min_*`, `offer_max_*`, `offer_confidence_weights_json`, `offer_max_sale_to_ask_ratio`).
  * Dependência: nenhuma.
  * DoD: defaults seguros aplicados; leitura compatível com workspaces existentes.
* ✅ `T17A.3` Shared contracts: adicionar schemas/tipos em `packages/shared` para payloads, respostas e enums (`reason_codes`, `confidence_bucket`, `decision`).
  * Dependência: `T17A.1`, `T17A.2`.
  * DoD: validação de request/response cobrindo `generate`, `save`, `history`.

### API (Go)

* ✅ `T17A.4` Engine determinística: implementar pacote de domínio `offerintelligence` reutilizando viabilidade existente e política GO/REVIEW/NO_GO.
  * Dependência: `T17A.2`.
  * DoD: cálculo independente de LLM; `confidence` via fórmula documentada.
* ✅ `T17A.5` Endpoint `generate`: `POST /api/v1/prospects/:id/offer-intelligence/generate` com validação, sanity checks, reason codes e rate limiting por `workspace_id`.
  * Dependência: `T17A.3`, `T17A.4`.
  * DoD: sem persistência definitiva; `429/RATE_LIMITED` + `Retry-After` quando excedido.
* ✅ `T17A.6` Endpoints `save` e `history`: persistência append-only, paginação `limit+cursor`, ordenação fixa e cálculo de `is_stale`.
  * Dependência: `T17A.1`, `T17A.3`, `T17A.4`.
  * DoD: `save` cria snapshot único por ação; `history` retorna `created_at DESC, id DESC`.
* ✅ `T17A.7` Testes API: unitário do engine + integração dos handlers (inclui tenant isolation, paywall, rate limit e staleness).  
  Status atual: suíte concluída com testes de integração em `handlers_offer_intelligence_test.go`.
  * Dependência: `T17A.5`, `T17A.6`.
  * DoD: suite verde com cenários `GO/REVIEW/NO_GO` e erro padronizado.

### BFF (Next)

* ✅ `T17A.8` Route Handlers BFF: criar rotas em `apps/web/app/api/prospects/[id]/offer-intelligence/{generate,save,history}` com Bearer e validação.
  * Dependência: `T17A.3`, `T17A.5`, `T17A.6`.
  * DoD: browser não chama Go direto; mapping de erros preserva `{ error: { code, message, details } }`.
* ✅ `T17A.9` Client layer: adicionar helpers/actions web para consumo dos endpoints com tratamento explícito de `RATE_LIMITED` e `PAYWALL_REQUIRED`.
  * Dependência: `T17A.8`.
  * DoD: fallback UI pronto para rate limit/paywall sem quebrar fluxo.

### UI (Web)

* ✅ `T17A.10` Modal de prospect: adicionar ação "Gerar oferta inteligente" com debounce `600ms`, render de cenários e explicabilidade (`assumptions`, `defaults_used`, `reason_codes`).
  * Dependência: `T17A.9`.
  * DoD: resultado visível em <= 3s p95 em ambiente alvo.
* ✅ `T17A.11` Gating comercial: implementar regra de 1ª oferta completa no free/trial; pós-1ª oferta exibir apenas `recommended` + `message_templates.short`.
  * Dependência: `T17A.10`.
  * DoD: bloqueios coerentes por tier com CTA de upgrade.
* ✅ `T17A.12` Histórico e obsolescência: lista paginada de ofertas, badge `is_stale`, ação "Regenerar".
  * Dependência: `T17A.10`, `T17A.6`.
  * DoD: histórico consistente com ordenação backend e status stale.

### Analytics + Admin

* ✅ `T17A.13` Eventos de funil/fricção: instrumentar eventos da seção 15 via trilha analítica existente.
  * Dependência: `T17A.10`, `T17A.11`.
  * DoD: eventos chegam com propriedades obrigatórias (`workspace_id`, `tier`, `decision`, `reason_codes`, `confidence_bucket`).
* ✅ `T17A.14` Painel admin: adicionar blocos de acompanhamento de adoção/conversão da feature em `/app/admin/metrics`.
  * Dependência: `T17A.13`.
  * DoD: visualização diária de geração, save, paywall viewed e upgrade CTA.

### Hardening + rollout

* ⬜ `T17A.15` QA e performance: smoke do fluxo fim-a-fim + validação de p95 e carga de rate limit.
  * Dependência: `T17A.7`, `T17A.12`, `T17A.13`.
  * DoD: checklist de regressão sem falhas em prospects/flip score.
* ✅ `T17A.16` Go-live controlado: rollout por feature flag (`off` -> `internal` -> `all`) + baseline dos KPIs (North Star + kill criteria).
  * Dependência: `T17A.14`, `T17A.15`.
  * DoD: critérios de monitoramento ativos para decisão de continuidade em 30-45 dias.
