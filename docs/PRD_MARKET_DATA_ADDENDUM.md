# Widia Flip — PRD Addendum (Pós-MVP): Market Data Module

> Documento de planejamento. Sem mudanças de código neste estágio.
> Este addendum complementa o `docs/PRD.md` para uma trilha pós-MVP.

---

## 1) Objetivo do módulo

Criar um módulo de dados de mercado com foco em **preço por m² de transações reais** para apoiar decisão de compra/reforma/venda no fluxo de flip.

Valor para o usuário:

* comparar rapidamente bairros por mediana de R$/m²;
* entender qualidade da amostra (`tx_count`);
* usar histórico mensal para validar timing de entrada/saída.

---

## 2) Enquadramento de escopo

Este módulo é **Pós-MVP** e não altera os locks do MVP em `docs/PRD.md`:

* lock do MVP de "sem import CSV/XLSX" permanece válido para o MVP;
* este trabalho entra em trilha nova de pós-MVP (proposta `M14`).

---

## 3) Escopo funcional (M14 — SP MVP)

### 3.1 Entrega visível para usuário

Feature: **Mapa de Preço do m² (SP)** com filtros:

* cidade: `São Paulo` (fase inicial);
* período: `1, 3, 6, 12 meses`;
* tipo: `apartamento`, `casa`, `geral` (quando classificável).

Cada região (bairro/distrito) exibe:

* `median_m2`;
* `p25_m2` e `p75_m2`;
* `tx_count`;
* `updated_at`;
* `source`.

### 3.2 Superfícies de produto

* módulo no app autenticado (prioritário);
* página pública SEO (`/market/sp/preco-m2`) opcional para fase seguinte.

---

## 4) Fonte de dados para MVP SP (já disponível no repo)

Arquivo de referência:

* `docs/reference/GUIAS DE ITBI PAGAS (28012026) XLS.xlsx`

Estrutura observada:

* abas mensais `JAN-2025` até `DEZ-2025`;
* abas auxiliares: `LEGENDA`, `EXPLICAÇÕES`, `Tabela de USOS`, `Tabela de PADRÕES`.

Campos principais já presentes nas abas mensais:

* `N° do Cadastro (SQL)`
* `Bairro`
* `Valor de Transação (declarado pelo contribuinte)`
* `Data de Transação`
* `Área Construída (m2)`
* `Uso (IPTU)`
* `Descrição do uso (IPTU)`
* `Natureza de Transação`
* `Proporção Transmitida (%)`

Decisão para o MVP SP:

* usar esta planilha como **fonte inicial oficial do módulo**;
* tratar como dado de transação declarada, não dado de anúncio.

---

## 5) Arquitetura alvo (alinhada ao repositório)

Contrato mantido:

* Browser -> Next.js (BFF: Route Handlers/Server Actions)
* Next.js -> Go API com `Authorization: Bearer <token>`
* Browser não chama Go API direto

### 5.1 Camadas

* `Ingestão/ETL`: job server-side (Go ou script operacional) para normalizar e agregar.
* `Persistência`: Postgres (com PostGIS para regiões/polígonos quando necessário).
* `API`: endpoints Go de leitura de agregados.
* `BFF`: rotas Next para validação, auth e cache.
* `UI`: mapa/tabela consumindo apenas BFF.

---

## 6) Modelo de dados proposto

### 6.1 `market_regions`

* `id` (uuid)
* `city` (`sp`, `bh`, `ctba`)
* `region_type` (`bairro`, `distrito`)
* `name`
* `geom` (geometry, opcional no M14a se mapa usar shape pronto)
* `source`
* `created_at`, `updated_at`

### 6.2 `market_price_m2_monthly`

Chave sugerida: `(city, region_id, month, property_class, source)`

Campos:

* `median_m2`, `p25_m2`, `p75_m2`
* `tx_count`
* `min_m2`, `max_m2` (opcional)
* `updated_at`

### 6.3 `market_ingestion_runs`

Auditoria operacional:

* `id`
* `source`
* `period_start`, `period_end`
* `status` (`running`, `success`, `failed`)
* `input_rows`, `valid_rows`, `output_groups`
* `error_message`
* `started_at`, `finished_at`

---

## 7) Regras de normalização (SP MVP)

### 7.1 Fórmula base

* `price_m2 = valor_transacao / area_construida_m2`

### 7.2 Filtros mínimos de qualidade

* descartar registros com `area_construida_m2 <= 10`;
* descartar registros com `valor_transacao <= 0`;
* descartar `price_m2` fora de faixa plausível (`<= 5` ou `>= 200000`);
* considerar `tx_count` mínimo por região para destacar confiabilidade visual.

### 7.3 Classificação de tipo

Mapear `Descrição do uso (IPTU)` para:

* `apartamento`
* `casa`
* `outros` (fallback)

### 7.4 Agrupamento

Granularidade primária no M14:

* `month` + `bairro` + `property_class`

---

## 8) API/BFF (contratos planejados)

Go API (leitura):

* `GET /api/v1/market/regions?city=sp&level=bairro`
* `GET /api/v1/market/price-m2?city=sp&level=bairro&period=6m&type=geral`
* `GET /api/v1/market/series?city=sp&region_id=<id>&months=24&type=geral`

Next BFF:

* `apps/web/app/api/market/regions/route.ts`
* `apps/web/app/api/market/price-m2/route.ts`
* `apps/web/app/api/market/series/route.ts`

Requisitos:

* validação de query params no BFF;
* cache público com `s-maxage` e `stale-while-revalidate`;
* resposta inclui sempre `source`, `tx_count`, `updated_at`.

---

## 9) Requisitos de UX e transparência

Obrigatório exibir na UI:

* "Fonte: ITBI (valor declarado)"
* "Atualizado em: <data>"
* "Amostra (transações): <tx_count>"

Tooltips por região:

* mediana R$/m²
* P25/P75
* tamanho da amostra

Guardrail de interpretação:

* destacar que valor declarado de ITBI != preço de anúncio.

---

## 10) Segurança, privacidade e compliance

* não expor endereço completo ou linha transacional em telas públicas do módulo;
* expor apenas dados agregados por região/período;
* manter atribuição explícita de fonte pública em interface e documentação;
* registrar limitações de atualização/completude da base.

---

## 11) Critérios de aceite (M14 SP MVP)

### Funcional

* usuário seleciona período e tipo e visualiza mapa/tabela por bairro;
* backend retorna `median_m2`, `p25_m2`, `p75_m2`, `tx_count`, `updated_at`, `source`;
* série temporal por região disponível para pelo menos 12 meses.

### Técnico

* ETL consegue processar a planilha mensal sem intervenção manual de código;
* chamadas do browser passam apenas pelo BFF (sem chamada direta à Go API);
* resposta p95 do endpoint agregado <= 400ms em ambiente de produção.

### Qualidade de dado

* cada registro agregado informa `tx_count`;
* regiões com amostra baixa são marcadas como baixa confiança na UI.

---

## 12) Roadmap pós-MVP sugerido

### M14a — Fundação Market Data

* modelagem de tabelas;
* pipeline ETL operacional;
* ingestão SP usando planilha XLS de referência.

### M14b — Produto SP

* API + BFF + UI mapa/tabela;
* observabilidade de runs e qualidade.

### M15 — Belo Horizonte

* ingestão com base ITBI BH;
* padronização de regiões e comparabilidade com SP.

### M16 — Curitiba

* decidir estratégia por disponibilidade/licença de dados de transação;
* se necessário, operar com cobertura parcial e disclaimers explícitos.

---

## 13) Não-escopo inicial (para evitar expansão)

* recalcular mediana/percentis on-the-fly por request;
* expor linha transacional completa ao usuário final;
* cobertura nacional;
* predição automática de preço futuro;
* integração com fontes pagas no M14 sem validação de licença/custo.

---

## 14) Dependências e decisões pendentes

* limiar oficial de baixa amostra (ex.: `< 10` transações/mês/região);
* nível geográfico final do MVP SP (`bairro` vs `distrito`);
* regra final para registros com `Proporção Transmitida (%)` parcial;
* política de atualização (mensal) e responsável operacional pelo run.

