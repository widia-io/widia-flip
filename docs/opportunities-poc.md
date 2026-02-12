# POC ZapOpportunityWorker

## Contexto

Criar uma POC integrada ao meuflip.com: coleta de anúncios da ZAP (zapimoveis.com.br) para identificar oportunidades de house flipping em bairros/cidades pré-definidos.

### Objetivo
1) Buscar anúncios do ZAP para um bairro-alvo (começar com 1 bairro) e filtros básicos.
2) Normalizar dados para o modelo interno do MeuFlip.
3) Calcular score **0–100** de "flipabilidade".
4) Persistir anúncios e execuções no banco do MeuFlip.
5) Expor resultados via API interna (para UI/Backoffice).
6) **Disponibilizar os resultados em uma nova aba "Oportunidades" dentro da área segura do app**, visível para **todos os usuários**.

---

## Decisões técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Scraping** | CLI Go local + Playwright | Zero custo, controle total |
| **Execução** | Local → API ingestão | Scraping local, dados enviados para produção |
| **Scoring** | Local (no CLI) | Dados já chegam processados no servidor |
| **Modelo** | Tabelas separadas | `source_listings` + `opportunities` para flexibilidade futura |
| **Escopo** | Global (sem workspace_id) | Oportunidades compartilhadas por todos usuários |
| **Scheduler** | Manual ou cron local | Você controla quando roda |

---

## Fases de implementação

### Fase 1 — Validação scraping (2-4h) ✅ CONCLUÍDA
- [x] Testar Firecrawl no ZAP
- [x] Testar Playwright no ZAP
- [x] Mapear estrutura HTML retornada
- [x] Documentar campos disponíveis
- [x] Decisão: CLI local com Chromedp

**Entrega**: validação completa, ver `docs/zap-scraping-validation.md`

### Fase 2 — CLI Scraper local (8-12h) ✅ CONCLUÍDA
- [x] Setup projeto: `cmd/scraper/`
- [x] Chromedp: coleta página de listagem
- [x] Chromedp: coleta página de detalhe
- [x] Parser: HTML → structs
- [x] Normalizer: dados brutos → SourceListing
- [x] Scorer: calcula score 0-100
- [x] Client HTTP: envio para API produção
- [x] Config: flags e env vars

**Entrega**: CLI funcionando em `services/api/cmd/scraper/`

### Fase 3 — Backend API (6-8h) ✅ CONCLUÍDA
- [x] Migration: `source_listings`, `opportunities`, `opportunity_job_runs`
- [x] Handler: `POST /internal/opportunities/ingest` (recebe dados do CLI)
- [x] Handler: `GET /internal/opportunities` (com filtros)
- [x] Handler: `GET /internal/job-runs`
- [x] Repository: upsert com deduplicação

**Entrega**: API funcionando, testada end-to-end

### Fase 4 — Frontend (6-10h) ✅ CONCLUÍDA
- [x] Aba Oportunidades: listagem com cards
- [x] Filtros: score mínimo, ordenação
- [x] Ordenação: score, preço, data
- [x] Modal de detalhes + link ZAP
- [x] Admin: listagem job_runs
- [x] Loading/empty/error states

**Entrega**: POC completa em `/app/opportunities` e `/app/admin/job-runs`

---

## Escopo inicial (POC)

- **Fonte única**: ZAP (via Firecrawl)
- **Localização**: `cidade = "<CIDADE>"`, `bairro = "<BAIRRO>"`
- **Filtros**:
  - tipo = apartamento
  - area_min = 50, area_max = 90
  - quartos ∈ {2,3}
  - vagas >= 0
- **Limites**: até 200 anúncios por execução
- **Periodicidade**: 1x/dia (cron externo) + manual via Admin
- **Timeout**: 5 minutos (endpoint síncrono)

---

## Arquitetura

### Visão geral

```
┌─────────────────────────────────────────────────────────┐
│                    LOCAL (seu Mac)                       │
│                                                          │
│  ┌─────────────┐    ┌──────────────────────────────┐    │
│  │  Chromedp   │───▶│  meuflip-scraper CLI         │    │
│  │ (Playwright)│    │  - Coleta ZAP                │    │
│  └─────────────┘    │  - Normaliza                 │    │
│                     │  - Calcula Score             │    │
│                     └──────────────┬───────────────┘    │
│                                    │                     │
└────────────────────────────────────┼─────────────────────┘
                                     │ POST /ingest
                                     ▼
┌────────────────────────────────────────────────────────┐
│                    PRODUÇÃO                             │
│                                                         │
│  ┌──────────────────┐    ┌─────────────────────┐       │
│  │ POST /ingest     │───▶│ Upsert source_listings      │
│  │ (recebe JSON)    │    │ Upsert opportunities │       │
│  └──────────────────┘    │ Cria job_run         │       │
│                          └─────────────────────┘       │
│                                                         │
│  ┌──────────────────┐    ┌─────────────────────┐       │
│  │GET /opportunities│◀───│ UI Next.js          │       │
│  └──────────────────┘    └─────────────────────┘       │
└────────────────────────────────────────────────────────┘
```

### Fluxo de execução

```
[Você roda CLI local]
       ↓
  ./meuflip-scraper --city="Curitiba" --neighborhood="vl-izabel"
       ↓
  Chromedp: abre browser headless
       ↓
  Scrape: página de listagem ZAP
       ↓
  Scrape: detalhes de cada anúncio (paralelo, max 5)
       ↓
  Normalize → SourceListing[]
       ↓
  Calcula mediana m² do batch
       ↓
  Score cada listing → Opportunity[]
       ↓
  POST /api/v1/internal/opportunities/ingest
       ↓
  Servidor: upsert DB + cria job_run
       ↓
  CLI: exibe stats
```

### CLI Go com Chromedp

```go
// cmd/scraper/main.go
package main

import (
    "context"
    "flag"
    "log"

    "github.com/chromedp/chromedp"
)

func main() {
    city := flag.String("city", "Curitiba", "Cidade")
    neighborhood := flag.String("neighborhood", "vl-izabel", "Bairro (formato ZAP)")
    apiURL := flag.String("api", "https://api.meuflip.com", "URL da API")
    flag.Parse()

    // Chromedp context
    ctx, cancel := chromedp.NewContext(context.Background())
    defer cancel()

    // 1. Coletar listagem
    listings, err := collectListings(ctx, *city, *neighborhood)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Coletados %d anúncios", len(listings))

    // 2. Enriquecer cada anúncio (detalhes)
    enriched := enrichListings(ctx, listings)

    // 3. Normalizar
    normalized := normalize(enriched)

    // 4. Calcular mediana e scores
    median := calculateMedianPricePerM2(normalized)
    opportunities := score(normalized, median)

    // 5. Enviar para produção
    stats, err := ingest(*apiURL, opportunities)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Ingestão completa: %+v", stats)
}

func collectListings(ctx context.Context, city, neighborhood string) ([]ListingSummary, error) {
    url := fmt.Sprintf("https://www.zapimoveis.com.br/venda/apartamentos/pr+%s++%s/",
        strings.ToLower(city), neighborhood)

    var html string
    err := chromedp.Run(ctx,
        chromedp.Navigate(url),
        chromedp.WaitVisible(`[class*="listing"]`, chromedp.ByQuery),
        chromedp.OuterHTML("html", &html),
    )
    if err != nil {
        return nil, err
    }

    return parseListingsHTML(html)
}
```

---

## Modelo de dados

### Tabelas

```sql
-- source_listings: dados brutos coletados do ZAP
CREATE TABLE source_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,              -- 'ZAP'
  source_listing_id VARCHAR(255) NOT NULL,  -- ID no ZAP
  canonical_url TEXT NOT NULL,

  -- dados do imóvel
  title TEXT,
  description TEXT,
  price_cents BIGINT,
  area_m2 NUMERIC(10,2),
  bedrooms INT,
  bathrooms INT,
  parking_spots INT,
  images JSONB DEFAULT '[]',                -- URLs das fotos

  -- localização
  city VARCHAR(255),
  neighborhood VARCHAR(255),
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- metadados
  price_history JSONB DEFAULT '[]',         -- [{price_cents, seen_at}]
  raw_data JSONB,                           -- resposta Firecrawl

  -- timestamps
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listing_published_at TIMESTAMPTZ,         -- data original no ZAP
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source, source_listing_id)
);

-- opportunities: score calculado
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_listing_id UUID NOT NULL REFERENCES source_listings(id) ON DELETE CASCADE,

  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB NOT NULL,           -- {discount: 30, area: 15, keywords: 10, ...}
  price_per_m2 NUMERIC(10,2),
  market_median_m2 NUMERIC(10,2),
  discount_pct NUMERIC(5,4),

  status VARCHAR(50) DEFAULT 'new',         -- new, viewed, contacted, discarded

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source_listing_id)
);

-- job_runs: log de execuções
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,           -- 'ZapOpportunityWorker'

  status VARCHAR(50) NOT NULL,              -- pending, running, completed, failed
  trigger_type VARCHAR(50) NOT NULL,        -- 'scheduled', 'manual'
  triggered_by VARCHAR(255),                -- user_id se manual

  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  params JSONB,                             -- {city, neighborhood, filters, median_m2}
  stats JSONB,                              -- {total_collected, new_listings, updated, errors}
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- índices
CREATE INDEX idx_opportunities_score ON opportunities(score DESC, created_at DESC);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_source_listings_location ON source_listings(city, neighborhood);
CREATE INDEX idx_source_listings_last_seen ON source_listings(last_seen_at);
CREATE INDEX idx_job_runs_job_name ON job_runs(job_name, created_at DESC);
```

### Deduplicação
- Chave única: `(source, source_listing_id)`
- Atualiza `last_seen_at` a cada execução
- Atualiza `price_history` se preço mudou
- Recalcula score sempre (mediana pode ter mudado)

---

## Scoring (0–100)

### A) Desconto vs mercado (max +40)
```
discount = (mediana_m2 - anuncio_m2) / mediana_m2

0.20–0.40 => +40 (sweet spot)
0.15–0.19 => +30
0.10–0.14 => +20
0.05–0.09 => +10
< 0.05    => +0
> 0.40    => +20 (red flag: desconto excessivo)
```

### B) Ticket revendável (max +30)
- Área 50–90m² => +15
- Quartos 2 ou 3 => +10
- Vagas >= 1 => +5

### C) Sinais de reforma cosmética (max +15)
Keywords: "precisa de reforma", "reforma", "original", "oportunidade", "abaixo do mercado", "urgente", "inventário", "venda rápida", "aceita proposta"
- 1-2 termos => +5
- 3-4 termos => +10
- 5+ termos => +15

### D) Penalidades (max -20)
Keywords: "infiltração", "estrutura", "fundação", "elétrica toda", "hidráulica toda", "mofo"
- Qualquer termo => -20

### E) Decay temporal (max -10)
- Anúncio >30 dias no ZAP => -5
- Anúncio >60 dias no ZAP => -10

---

## API Endpoints

### Ingestão de dados (CLI → Servidor)
```
POST /api/v1/internal/opportunities/ingest
Headers: X-Internal-Secret: <secret>
Body: {
  "source": "ZAP",
  "city": "Curitiba",
  "neighborhood": "Vila Izabel",
  "scraped_at": "2024-02-01T10:00:00Z",
  "median_price_m2": 8500.00,
  "listings": [
    {
      "source_listing_id": "2818405614",
      "canonical_url": "https://www.zapimoveis.com.br/imovel/...",
      "title": "Apartamento com 3 Quartos...",
      "description": "...",
      "price_cents": 98500000,
      "area_m2": 104.00,
      "bedrooms": 3,
      "bathrooms": 3,
      "parking_spots": 2,
      "condo_fee_cents": 170000,
      "iptu_cents": 38200,
      "address": "Avenida República Argentina, 1812",
      "neighborhood": "Vila Izabel",
      "city": "Curitiba",
      "state": "PR",
      "images": ["url1", "url2"],
      "published_at": "2025-07-02T00:00:00Z",
      "score": 75,
      "score_breakdown": {
        "discount": 30,
        "area": 15,
        "bedrooms": 10,
        "parking": 5,
        "keywords": 10,
        "penalties": 0,
        "decay": -5
      },
      "price_per_m2": 9471.15,
      "discount_pct": 0.12
    }
  ]
}
Response: {
  "job_run_id": "uuid",
  "stats": {
    "total_received": 150,
    "new_listings": 45,
    "updated": 105
  }
}
```

### Listar oportunidades (UI)
```
GET /api/v1/internal/opportunities
  ?city=Curitiba
  &neighborhood=Vila Izabel
  &score_min=50
  &price_min=100000
  &price_max=500000
  &area_min=50
  &area_max=90
  &bedrooms=2,3
  &status=new,viewed
  &sort=score_desc
  &limit=20
  &offset=0

Response: {
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Listar execuções (Admin)
```
GET /api/v1/internal/job-runs?limit=20&offset=0
GET /api/v1/internal/job-runs/:id
```

---

## UI — Aba Oportunidades

### Filtros
- **Score mínimo**: slider 0-100 (default: 50)
- **Preço**: range min/max
- **Área**: range min/max
- **Quartos**: checkboxes 1, 2, 3, 4+
- **Status**: new, viewed, contacted, discarded

### Ordenação
- Score (desc) — default
- Preço (asc/desc)
- Data (desc)

### Card
- Foto principal
- Título
- Preço (formatado)
- Área m² | Quartos | Vagas
- Score badge (cor por faixa: verde >70, amarelo 50-70, vermelho <50)
- Bairro

### Detalhe (modal/drawer)
- Galeria de fotos
- Descrição completa
- Score breakdown
- Link "Ver no ZAP" (abre nova aba)
- Botões: Marcar como visto | Descartar | Contatar

---

## Admin — Job Runs

### Listagem
| Data | Status | Trigger | Duração | Coletados | Novos | Erros |
|------|--------|---------|---------|-----------|-------|-------|
| 01/02 09:00 | completed | scheduled | 2m 15s | 150 | 12 | 0 |
| 31/01 09:00 | failed | manual | 45s | 0 | 0 | 1 |

### Ações
- **Executar agora**: POST /internal/job-runs/trigger
- **Ver detalhes**: modal com params, stats, erro

---

## Configuração

### CLI Scraper (local)
```bash
# Criar arquivo .env.scraper ou passar flags
API_URL=https://api.meuflip.com          # URL da API produção
INTERNAL_SECRET=xxx                       # Secret para autenticação
```

### Uso do CLI
```bash
# Build
cd cmd/scraper && go build -o meuflip-scraper

# Executar
./meuflip-scraper \
  --city="Curitiba" \
  --neighborhood="vl-izabel" \
  --api="https://api.meuflip.com" \
  --secret="$INTERNAL_SECRET"

# Opções
--city          Cidade (default: Curitiba)
--neighborhood  Bairro no formato ZAP (ex: vl-izabel)
--api           URL da API (default: http://localhost:8080)
--secret        Secret para autenticação
--limit         Limite de anúncios (default: 200)
--dry-run       Só coleta, não envia para API
--verbose       Logs detalhados
```

### Env vars (Go API - Produção)
```bash
INTERNAL_SECRET=xxx                 # Secret para rotas internas
```

### Env vars (Next.js)
```bash
INTERNAL_API_URL=http://localhost:8080  # URL da Go API
INTERNAL_SECRET=xxx                      # Mesmo secret
```

---

## Restrições e limitações

- **Execução local**: requer sua máquina ligada para scraping
- **Rate limit**: sleep entre requisições para não bloquear IP
- **Sem proxy**: IP residencial nesta POC
- **1 bairro por vez**: expandir depois que validar
- **Chrome necessário**: Chromedp usa Chrome/Chromium instalado

---

## Observabilidade

### Logs estruturados
```json
{"level":"info","job_run_id":"uuid","msg":"job started","trigger":"manual"}
{"level":"info","job_run_id":"uuid","msg":"collected listings","count":150}
{"level":"warn","job_run_id":"uuid","msg":"enrich failed","url":"...","error":"timeout"}
{"level":"info","job_run_id":"uuid","msg":"job completed","duration_s":120,"new":45}
```

### Métricas (futuro)
- `opportunity_job_duration_seconds`
- `opportunity_listings_total{status="new|updated"}`
- `opportunity_errors_total`

---

## Checklist final

- [x] Fase 1 completa (scraping validado)
- [x] Fase 2 completa (CLI scraper)
- [x] Fase 3 completa (API ingestão)
- [x] Fase 4 completa (UI funcionando)
- [ ] Env vars em produção
- [x] Primeiro scrape + ingestão com sucesso (11 oportunidades ingeridas)
