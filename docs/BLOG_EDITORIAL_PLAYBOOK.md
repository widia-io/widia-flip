# Blog Editorial Playbook — M14

## Objetivo

Padronizar a produção e publicação de artigos do blog público para gerar tráfego orgânico qualificado e conversão para calculadora/signup.

## Cadência recomendada

1. Publicação mínima: 2 artigos por semana.
2. Revisão de performance: semanal (KPIs leading) e quinzenal (conversão).
3. Atualização de conteúdo: mensal para posts com queda de posição/CTR.

## Fluxo de produção

1. Definir pauta e keyword principal.
2. Definir intenção de busca (informacional, comparação, decisão).
3. Escrever rascunho em `apps/web/content/blog/<slug>.md`.
4. Revisar checklist de qualidade.
5. Publicar com `published: true`.
6. Atualizar sitemap (automático via rota) e acompanhar indexação no GSC.

## Checklist de publicação

1. Frontmatter completo e válido (`slug`, `title`, `description`, `publishedAt`, `author`, `tags`, `published`).
2. `slug` único e em kebab-case.
3. Título com proposta clara e keyword principal.
4. Meta description objetiva (até ~160 caracteres).
5. Introdução com contexto e promessa do artigo.
6. Estrutura em blocos curtos (`h2`/`h3`) com linguagem direta.
7. Pelo menos 1 link interno para outro artigo do blog.
8. CTA de conversão (calculadora/signup) garantido pela página de artigo.
9. Revisão ortográfica e factual.
10. Publicado com `canonicalPath` consistente (`/blog/<slug>`).

## Convenções editoriais

1. Voz: prática, direta e orientada a decisão.
2. Priorizar números e critérios objetivos.
3. Evitar promessas vagas e linguagem promocional excessiva.
4. Parágrafos curtos e listas quando possível.
5. Sempre fechar com próximo passo acionável.

## Métricas a acompanhar

1. Impressões orgânicas por URL (`/blog/*`) no GSC.
2. Cliques orgânicos por URL no GSC.
3. CTR por query e por página.
4. `blog_cta_click` por slug/posição.
5. `blog_to_calculator` por slug.
6. `signup_started` com `source=blog`.

## Critérios de atualização de conteúdo

1. Reescrever título/intro se impressões altas e CTR baixa por 3 semanas.
2. Atualizar bloco principal se posição cair por 2 semanas consecutivas.
3. Consolidar artigos concorrentes quando houver canibalização.
4. Revisar dados e exemplos trimestralmente.
