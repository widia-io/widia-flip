# Funnel KPI Definitions

## Objetivo

Padronizar a leitura operacional do funil do produto após o saneamento da WID-38.

Princípios:

1. O funil oficial do admin usa **jornadas únicas** por etapa.
2. Volume bruto continua disponível apenas como diagnóstico.
3. Browser fala com o Next BFF; o BFF e a Go API preservam o contexto de analytics (`session_id`, `request_id`, `path`, `device`).
4. Sem renomear eventos históricos: o saneamento é por owner, definição e fórmula.

## Semântica oficial

### `view`

- `home_view`
- `calculator_viewed`
- `offer_intelligence_paywall_viewed`

Definição: visualização única da etapa por jornada.

### `start`

- `signup_started`
- `login_started`

Definição: intenção explícita de avançar no fluxo.

### `complete`

- `signup_completed`
- `login_completed`
- `calculator_completed`
- `property_saved`
- `offer_intelligence_generated`

Definição: sucesso confirmado da etapa.

### `save`

- `calculator_save_clicked`
- `calculator_lead_capture_submitted`
- `offer_intelligence_saved`
- `first_snapshot_saved`

Definição:

- `calculator_save_clicked`: clique no CTA de salvar.
- `calculator_lead_capture_submitted`: persistência opcional do lead após o valor já ter sido entregue.
- `offer_intelligence_saved`: persistência concluída da oferta.
- `first_snapshot_saved`: primeira persistência concluída de análise do usuário.

### `upgrade_cta`

- `offer_intelligence_upgrade_cta_clicked`

Definição: clique explícito no CTA de upgrade.

## Owner matrix

| Evento | Owner oficial | Observação |
| --- | --- | --- |
| `home_view` | browser | Tracker client-side com dedupe por sessão de navegação. |
| `calculator_viewed` | browser | Só no tracker da página da calculadora. |
| `calculator_completed` | browser | Emitido uma vez por sessão quando o primeiro resultado não-parcial é renderizado na calculadora. |
| `signup_started` | browser | Emitido no submit real; origem blog via `src/post/cta`. |
| `signup_completed` | browser | Confirmado via fluxo de sucesso/redirect. |
| `login_started` | browser | Emitido no submit real de login. |
| `login_completed` | browser | Confirmado no retorno do login. |
| `calculator_save_clicked` | browser | Clique explícito no CTA de salvar análise. |
| `calculator_lead_capture_submitted` | server | Persistência bem-sucedida do lead opcional da calculadora. |
| `property_saved` | server | Criação/snapshot concluídos no backend; no contexto da calculadora, usa `path=/calculator`. |
| `offer_intelligence_generated` | Go API | Resultado efetivamente gerado. |
| `offer_intelligence_saved` | Go API | Snapshot operacional salvo. |
| `offer_intelligence_paywall_viewed` | Go API | Preview limitado ou bloqueio authoritative. |
| `offer_intelligence_upgrade_cta_clicked` | browser | Clique explícito de upgrade. |

## Fórmulas oficiais no admin

Todas as etapas abaixo usam **distinct jornada por evento na janela**.

Jornada: `COALESCE(session_id, 'user:'||user_id, 'request:'||request_id, 'event:'||id)`.

Taxas:

1. `home_to_signup_start_pct = signup_started / home_view`
2. `calculator_view_to_completed_pct = calculator_completed / calculator_viewed`
3. `calculator_completed_to_lead_pct = calculator_lead_capture_submitted / calculator_completed`
4. `calculator_completed_to_signup_pct = signup_started(path=/calculator) / calculator_completed`
5. `calculator_completed_to_save_pct = property_saved(path=/calculator) / calculator_completed`
6. `signup_start_to_complete_pct = signup_completed / signup_started`
7. `signup_complete_to_login_pct = login_completed / signup_completed`
8. `login_to_first_snapshot_pct = first_snapshot_saved / login_completed`
9. `home_to_first_snapshot_pct = first_snapshot_saved / home_view`
10. `offer_generated_to_saved_pct = offer_intelligence_saved / offer_intelligence_generated`
11. `offer_generated_to_paywall_pct = offer_intelligence_paywall_viewed / offer_intelligence_generated`
12. `offer_paywall_to_upgrade_pct = offer_intelligence_upgrade_cta_clicked / offer_intelligence_paywall_viewed`

## Diagnóstico bruto

O endpoint `/api/v1/admin/funnel/daily` também retorna:

- `rawTotals`: volume bruto de eventos sem dedupe.
- `duplicateDeltas`: diferença `rawTotals - totals`.
- `warnings`: avisos sobre duplicidade ou legado inconsistente.

Uso recomendado:

1. Ler cards e percentuais usando `totals` e `rates`.
2. Usar `rawTotals` e `duplicateDeltas` para depuração operacional.
3. Se houver `warnings`, tratar comparações históricas com cautela.

## Regras de legado

1. Não há backfill histórico.
2. Janelas antigas podem continuar contaminadas por eventos server-side salvos com `session_id` sintético.
3. `calculator_full_report_requested` e `calculator_full_report_unlocked` permanecem legados/diagnóstico e não entram mais nos cards principais após a WID-40.
4. Quando uma taxa ficar acima de 100%, o admin deve exibir aviso textual em vez de exibir o percentual impossível.
