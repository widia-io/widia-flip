# Blog Editorial Playbook — M15

## Objetivo

Padronizar a produção e publicação de artigos do blog público para gerar tráfego orgânico qualificado e conversão para calculadora/signup.

## Cadência recomendada

1. Publicação mínima: 2 artigos por semana.
2. Revisão de performance: semanal (KPIs leading) e quinzenal (conversão).
3. Atualização de conteúdo: mensal para posts com queda de posição/CTR.

## Fluxo de produção

1. Definir pauta e keyword principal.
2. Definir intenção de busca (informacional, comparação, decisão).
3. Criar draft em `/app/admin/blog/new`.
4. Escrever em Markdown no editor (`contentMd`) e validar preview.
5. Revisar checklist de qualidade e campos de SEO.
6. Publicar pelo botão no admin (sem deploy manual).
7. Confirmar refletiu em `/blog`, `/sitemap.xml` e `/rss.xml`.
8. Acompanhar indexação e performance no GSC/Looker.

## Checklist de publicação

1. Campos obrigatórios preenchidos (`slug`, `title`, `description`, `authorName`, `tags`, `contentMd`).
2. `slug` único e em kebab-case.
3. Título com proposta clara e keyword principal.
4. Meta description objetiva (até ~160 caracteres).
5. Introdução com contexto e promessa do artigo.
6. Estrutura em blocos curtos (`h2`/`h3`) com linguagem direta.
7. Pelo menos 1 link interno para outro artigo do blog.
8. CTA de conversão (calculadora/signup) garantido pela página de artigo.
9. Revisão ortográfica e factual.
10. `canonicalPath` consistente (`/blog/<slug>`).
11. Imagens em Markdown com URL absoluta (`![alt](https://...)`) ou `coverImageUrl`.

## Convenções de mídia (M15)

1. M15 não tem upload de imagem no CMS.
2. Use imagens por URL externa estável (CDN/S3 público).
3. Sempre definir texto alternativo (`alt`) nas imagens Markdown.
4. Evite URLs temporárias (assinadas/expiráveis).

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
4. `view_blog_post` por slug.
5. `blog_cta_click` por slug/posição.
6. `blog_to_calculator` por slug.
7. `signup_started` com `source=blog`.

## Critérios de atualização de conteúdo

1. Reescrever título/intro se impressões altas e CTR baixa por 3 semanas.
2. Atualizar bloco principal se posição cair por 2 semanas consecutivas.
3. Consolidar artigos concorrentes quando houver canibalização.
4. Revisar dados e exemplos trimestralmente.
