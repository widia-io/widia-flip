# Blog CMS Runbook (M15)

## Objetivo

Operar o cutover do blog público de `file` para `db` com segurança e rollback rápido.

## Pré-requisitos

1. Migration `0043_blog_posts` aplicada.
2. API Go com endpoints de blog deployada.
3. Web com CMS admin deployado.
4. Variável `BLOG_SOURCE=file` no Deploy A.

## Deploy A (smoke de infraestrutura)

1. Deployar API + Web com `BLOG_SOURCE=file`.
2. Validar `/app/admin/blog` (admin-only).
3. Criar um post draft de teste e confirmar salvar/editar sem publicar.
4. Remover ou arquivar post de teste.

## Import inicial dos 6 posts

1. Exportar variáveis:
   - `DATABASE_URL`
   - `BLOG_IMPORT_USER_ID` (id de usuário admin)
2. Executar:

```bash
npm run blog:import:m14
```

3. Validar contagem:
   - total de posts no DB
   - slugs únicos
   - status esperados

## Deploy B (ativação DB)

1. Ajustar `BLOG_SOURCE=db`.
2. Deployar web.
3. Validar:
   - `/blog` lista posts do DB
   - `/blog/:slug` renderiza conteúdo e metadata
   - `/sitemap.xml` e `/rss.xml` refletem publicados
   - publish/unpublish no admin reflete no público sem deploy

## Smoke checklist (24-48h)

1. SEO:
   - páginas indexáveis
   - canonical/OG/JSON-LD válidos
2. Conversão:
   - `view_blog_post`
   - `blog_cta_click`
   - `blog_to_calculator`
   - `signup_started` com `source=blog`
3. Erros:
   - monitorar logs de API e web para `BLOG_DB_FETCH_ERROR` e `VALIDATION_ERROR`.

## Rollback

1. Alterar `BLOG_SOURCE=file`.
2. Re-deploy web.
3. Confirmar retorno imediato do blog baseado em arquivos (`apps/web/content/blog`).

## Observações

1. O banco permanece como fonte pronta para reativação.
2. Não é necessário rollback de migration para fallback rápido.
