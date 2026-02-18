# Plano Incremental de UX e Conversão — meuflip.com

Data: 2026-02-18  
Responsável: Produto/Growth/UX  
Fonte: Auditoria manual em produção (desktop + mobile) com Playwright + Lighthouse

---

## 1) Objetivo do plano

Aumentar conversão sem ruptura no funil atual, implantando melhorias em ondas curtas, com medição clara e rollback simples.

Objetivos de 30 dias:

1. Aumentar taxa de clique em CTA principal da home.
2. Aumentar taxa de conclusão de signup.
3. Aumentar ativação (primeiro snapshot salvo por novo usuário).
4. Reduzir abandono no fluxo da calculadora.

---

## 2) Principais achados da auditoria

## 2.1 Fricções críticas (impacto alto)

1. Calculadora com dois caminhos concorrentes no mesmo momento:
`Ver relatório completo` (com captura) e `Salvar análise (requer login)`.
2. Gating duplo na calculadora:
captura de lead + login para continuar.
3. Home longa e muito densa antes de decisão.
4. Primeira sessão pós-login não força o usuário ao primeiro valor (first win).
5. Fluxo de criação manual de prospect é pesado para primeira ação.

## 2.2 Fricções médias

1. Inconsistência de nomenclatura entre seções e ações.
2. Microcopy com erros de acentuação/padronização.
3. Banner promocional disputando atenção em páginas de decisão (login/app).

## 2.3 Sinais técnicos

1. Home desktop: P95 / A11y91.
2. Home mobile: P93 / A11y85 / LCP 2.7s.
3. Calculadora mobile: P80 / LCP 4.4s.
4. Signup mobile: P82 / LCP 4.0s.
5. Warning de acessibilidade em diálogo (`DialogContent` sem descrição).

---

## 3) Estratégia de implantação (sem ruptura)

Princípio: medir primeiro, simplificar depois, escalar só após ganho comprovado.

## Onda 0 (2-3 dias) — Instrumentação e baseline

Objetivo: saber exatamente onde o funil quebra hoje.

Entregas:

1. Padronizar eventos de funil com `session_id`, `variant`, `source`, `device`.
2. Criar painel mínimo de funil diário (home -> signup -> login -> primeiro snapshot).
3. Garantir rastreio dos dois CTAs da calculadora separadamente.

Critério de aceite:

1. Relatório diário com volumes e taxas por etapa.
2. Queda de dados < 5% entre pageviews e eventos de ação.

---

## Onda 1 (4-7 dias) — Quick wins de baixo risco

Objetivo: reduzir fricção sem mexer na lógica de negócio principal.

Entregas:

1. Mobile header da home: exibir `Entrar` + `Testar grátis` (não só um CTA).
2. Revisão de microcopy (acentuação, consistência e clareza).
3. Remover distrações em telas de decisão:
ocultar banner promocional em `/login`, `/calculator` e dentro de `/app`.
4. Melhorar acessibilidade dos modais (descrição/aria).

Critério de aceite:

1. Aumento de CTR em CTA principal da home.
2. Redução de abandono entre `/login?tab=signup` e submit de cadastro.

---

## Onda 2 (1-2 semanas) — Simplificação da calculadora

Objetivo: reduzir abandono no momento de maior intenção.

Abordagem recomendada:

1. Manter controle atual (funnel 2 etapas) como baseline.
2. Testar variante A:
resultado completo sem captura obrigatória; login exigido apenas para salvar no app.
3. Testar variante B:
resultado completo liberado e captura de lead opcional (post-value, não bloqueante).
4. Comparar por 7-14 dias antes de decisão final.

Métricas de decisão:

1. `calculator_completed_rate`
2. `signup_start_rate_from_calculator`
3. `property_saved_rate_from_calculator`
4. `lead_capture_rate` (para acompanhar impacto comercial)

Regra de rollout:

1. Liberar para 20% do tráfego.
2. Subir para 50% se não houver regressão de signup e ativação.
3. Expandir para 100% só após significância mínima acordada.

---

## Onda 3 (1-2 semanas) — Signup e ativação inicial

Objetivo: diminuir tempo até primeiro valor percebido.

Entregas:

1. Cadastro mais direto:
Nome + Email + Senha + Termos (telefone opcional fora do primeiro passo).
2. Pós-login com caminho único:
`Adicionar lead` -> `Converter` -> `Salvar primeira análise`.
3. Checklist de ativação com progresso visível.
4. CTA primário único no dashboard vazio.

Métrica alvo:

1. `first_snapshot_saved <= 10 min` em novos usuários.

---

## Onda 4 (contínua) — Otimização e escala

Objetivo: manter ganho contínuo sem regressão.

Entregas:

1. Revisar seção da home por desempenho (manter o que converte, remover excesso).
2. Rodar testes de copy nos CTAs principais.
3. Refinar onboarding com base em heatmap/replay.

---

## 4) Backlog priorizado (ordem de execução)

| ID | Iniciativa | Impacto | Esforço | Prioridade |
|---|---|---:|---:|---:|
| UX-01 | Instrumentar eventos de funil completos | Alto | Baixo | P0 |
| UX-02 | Exibir `Entrar` no mobile header | Alto | Baixo | P0 |
| UX-03 | Ocultar promo banner em páginas de decisão | Médio | Baixo | P0 |
| UX-04 | Correção de microcopy e acessibilidade de modal | Médio | Baixo | P0 |
| UX-05 | Teste A/B do gating da calculadora | Muito alto | Médio | P1 |
| UX-06 | Simplificar signup (1º passo) | Alto | Médio | P1 |
| UX-07 | Onboarding orientado ao primeiro snapshot | Muito alto | Médio | P1 |
| UX-08 | Reduzir densidade da home (copy + hierarquia) | Alto | Médio | P2 |
| UX-09 | Ajustes finos de performance mobile calculator/signup | Médio | Médio | P2 |

---

## 5) Métricas e metas

## 5.1 Funil principal

1. `home_cta_click_rate`  
Meta inicial: +15% vs baseline.
2. `signup_start_rate`  
Meta inicial: +10%.
3. `signup_complete_rate`  
Meta inicial: +12%.
4. `activation_rate_24h` (primeiro snapshot em até 24h)  
Meta inicial: +20%.
5. `calculator_to_signup_rate`  
Meta inicial: +15%.

## 5.2 Guardrails

1. `lead_capture_rate` não pode cair sem decisão explícita de negócio.
2. `server_error_rate` em rotas da calculadora/auth deve permanecer estável.
3. `time_to_interactive` mobile não deve piorar.

---

## 6) Plano semanal sugerido

Semana 1:

1. Onda 0 completa.
2. Quick wins UX-02, UX-03, UX-04.

Semana 2:

1. Início A/B calculadora (UX-05).
2. Ajustes de copy na home.

Semana 3:

1. Consolidar resultado do A/B.
2. Executar UX-06 (signup simplificado).

Semana 4:

1. Executar UX-07 (onboarding para first snapshot).
2. Revisão de impacto e próxima rodada.

---

## 7) Mapa técnico (arquivos-alvo)

Landing e CTA:

1. `apps/web/app/page.tsx`
2. `apps/web/components/landing/MobileStickyBar.tsx`
3. `apps/web/components/PromoBanner.tsx`

Calculadora e gating:

1. `apps/web/components/CalculatorForm.tsx`
2. `apps/web/components/CalculatorOutputs.tsx`
3. `apps/web/app/api/calculator/calculate/route.ts`
4. `apps/web/app/api/calculator/report/route.ts`
5. `apps/web/app/api/calculator/save/route.ts`

Auth/signup:

1. `apps/web/app/(auth)/login/page.tsx`
2. `apps/web/components/SignupForm.tsx`
3. `apps/web/lib/actions/auth.ts`
4. `apps/web/components/AuthModal.tsx`

Onboarding e ativação:

1. `apps/web/app/(app)/app/page.tsx`
2. `apps/web/components/dashboard/OnboardingJourney.tsx`
3. `apps/web/components/dashboard/QuickActions.tsx`
4. `apps/web/components/OnboardingChecklist.tsx`
5. `apps/web/components/FeatureTour.tsx`

Tracking:

1. `apps/web/lib/analytics.ts`
2. `apps/web/app/layout.tsx`

---

## 8) Riscos e mitigação

Risco 1: queda de leads ao aliviar o gating da calculadora.  
Mitigação: rollout por variante com controle, decisão por dados, não por percepção.

Risco 2: aumento de signup sem ativação real.  
Mitigação: meta principal de ativação (`first_snapshot_saved`), não só cadastro.

Risco 3: mudanças simultâneas dificultarem leitura de causa.  
Mitigação: implantar por ondas pequenas e registrar baseline antes de cada etapa.

---

## 9) Critério de sucesso do plano

O plano é considerado bem sucedido quando, por 2 semanas consecutivas:

1. Conversão de topo (`home -> signup`) melhora.
2. Ativação (`signup -> first snapshot`) melhora.
3. Não há regressão relevante em captação de lead ou estabilidade técnica.

