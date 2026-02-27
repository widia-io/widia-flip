# M15 — SEO Baseline + KPI Tracking

## Objetivo

Definir baseline de SEO e conversão do blog no cutover `file -> db` para acompanhar metas de 90 dias.

## Datas oficiais

Preencha no dia do rollout:

- `T0 (ativação BLOG_SOURCE=db)`: `YYYY-MM-DD`
- `Baseline (T0-28 a T0-1)`: `YYYY-MM-DD` até `YYYY-MM-DD`
- `Janela de meta (T0 a T0+90)`: `YYYY-MM-DD` até `YYYY-MM-DD`

Exemplo:

- Se `T0 = 2026-03-15`
- Baseline = `2026-02-15` até `2026-03-14`
- Meta = `2026-03-15` até `2026-06-13`

## Fontes de dados

1. SEO: Google Search Console (filtro de página: URLs iniciando com `/blog/`).
2. Conversão blog: eventos em `flip.funnel_events` (`view_blog_post`, `blog_cta_click`, `blog_to_calculator`, `signup_started` com `source=blog`).
3. Visualização consolidada: Looker Studio.

## KPIs e fórmulas

1. `blog_organic_impressions`
   - Fonte: GSC
   - Definição: impressões orgânicas em `/blog/*`
   - Meta 90d: `+40% vs baseline (28 dias)`

2. `blog_organic_clicks`
   - Fonte: GSC
   - Definição: cliques orgânicos em `/blog/*`
   - Meta 90d: `+25% vs baseline (28 dias)`

3. `blog_to_calculator_rate`
   - Fonte: funnel events
   - Fórmula: `distinct session_id com blog_to_calculator / distinct session_id com view_blog_post`
   - Meta: `>= 3%`

4. `blog_to_signup_start_rate`
   - Fonte: funnel events
   - Fórmula: `distinct session_id com signup_started (source=blog) / distinct session_id com view_blog_post`
   - Meta: `>= 1.2%`

## Blocos obrigatórios no Looker

1. SEO (`/blog/*`): impressões, cliques, CTR, posição média (séries semanais).
2. Funil blog: `view_blog_post`, `blog_cta_click`, `blog_to_calculator`, `signup_started source=blog`.
3. Conversão: `blog_to_calculator_rate` e `blog_to_signup_start_rate` por semana.

## Operação de acompanhamento

1. Semanal: revisar SEO + funil.
2. Quinzenal: revisar taxas de conversão e top posts.
3. Mensal: atualizar posts com alta impressão e CTR baixa.
