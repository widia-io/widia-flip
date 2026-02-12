# Guia de Testes — POC Oportunidades

Manual para testar o sistema de oportunidades de imóveis.

## Pré-requisitos

```bash
# 1. Verificar serviços rodando
lsof -i :8080  # Go API
lsof -i :3000  # Next.js
lsof -i :54322 # PostgreSQL (Supabase)

# 2. Se não estiverem rodando:
npm run db:up        # Supabase
npm run dev:api      # Terminal 1
npm run dev:web      # Terminal 2

# 3. Verificar env vars
grep INTERNAL_API .env
# Deve mostrar:
# INTERNAL_API_URL=http://localhost:8080
# INTERNAL_API_SECRET=...
```

---

## 1. Testar CLI Scraper

### Modo dry-run (não envia para API)

```bash
cd services/api
go run ./cmd/scraper \
  --city=Curitiba \
  --neighborhood=vl-izabel \
  --limit=5 \
  --dry-run \
  --verbose
```

**Saída esperada:**
```
🏠 MeuFlip Scraper - ZAP Imóveis
   Cidade: Curitiba
   Bairro: vl-izabel
   Limite: 5 anúncios
   ⚠️  Modo dry-run (não envia para API)

📋 Coletando listagem...
✅ Coletados 5 anúncios da listagem

🔍 Coletando detalhes...
✅ Detalhes coletados: 5/5

📦 Normalizando dados...
✅ Normalizados: 5 anúncios

📊 Calculando scores...
   Mediana preço/m²: R$ XXXX.XX

🏆 Top 5 oportunidades:
   1. Score XX | R$ XXXK | XXm² | Apartamento...
   ...

⚠️  Dry-run: dados não enviados para API
```

### Modo completo (envia para API)

```bash
cd services/api
go run ./cmd/scraper \
  --city=Curitiba \
  --neighborhood=vl-izabel \
  --limit=10 \
  --secret=$(grep INTERNAL_API_SECRET ../../.env | cut -d'=' -f2)
```

**Saída esperada:**
```
...
📤 Enviando para API...
✅ Ingestão completa!
   Job Run ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Novos: X | Atualizados: Y
```

---

## 2. Testar API Endpoints

### Listar oportunidades

```bash
# Definir secret
export SECRET=$(grep INTERNAL_API_SECRET .env | cut -d'=' -f2)

# Listar todas (limite 10)
curl -s "http://localhost:8080/api/v1/internal/opportunities?limit=10" \
  -H "X-Internal-Secret: $SECRET" | jq .

# Filtrar por score mínimo
curl -s "http://localhost:8080/api/v1/internal/opportunities?min_score=50&limit=5" \
  -H "X-Internal-Secret: $SECRET" | jq '.data[] | {title, score, price_cents}'

# Ordenar por preço
curl -s "http://localhost:8080/api/v1/internal/opportunities?sort=price_asc&limit=5" \
  -H "X-Internal-Secret: $SECRET" | jq '.data[] | {title, price_cents}'
```

### Listar job runs

```bash
curl -s "http://localhost:8080/api/v1/internal/job-runs?limit=5" \
  -H "X-Internal-Secret: $SECRET" | jq '.[] | {id: .id[0:8], status, new: .stats.new_listings}'
```

### Testar ingestão manual

```bash
curl -s -X POST "http://localhost:8080/api/v1/internal/opportunities/ingest" \
  -H "X-Internal-Secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "ZAP",
    "city": "Curitiba",
    "neighborhood": "vl-izabel",
    "scraped_at": "2026-02-02T12:00:00Z",
    "median_price_m2": 10000.00,
    "listings": [{
      "source_listing_id": "manual-test-001",
      "canonical_url": "https://zapimoveis.com.br/test",
      "title": "Apartamento Teste Manual",
      "price_cents": 35000000,
      "area_m2": 60,
      "bedrooms": 2,
      "city": "Curitiba",
      "neighborhood": "Vila Izabel",
      "state": "PR",
      "score": 80,
      "score_breakdown": {"discount": 40, "area": 15, "bedrooms": 10, "parking": 5, "keywords": 10, "penalties": 0, "decay": 0},
      "price_per_m2": 5833.33,
      "discount_pct": 0.42
    }]
  }' | jq .
```

---

## 3. Testar Frontend

### Página de Oportunidades

1. Acessar: http://localhost:3000/app/opportunities
2. Verificar:
   - [ ] Cards de oportunidades aparecem
   - [ ] Score badge com cor correta (verde >70, amarelo 50-70, vermelho <50)
   - [ ] Filtro de score mínimo funciona
   - [ ] Ordenação funciona
   - [ ] Clicar em card abre modal de detalhes
   - [ ] Botão "Ver no ZAP" abre link externo

### Admin Job Runs

1. Acessar: http://localhost:3000/app/admin/job-runs
2. Verificar:
   - [ ] Lista de execuções aparece
   - [ ] Status com badge colorido (verde=sucesso, vermelho=falha)
   - [ ] Estatísticas (novos, atualizados, total)
   - [ ] Duração calculada corretamente

### Sidebar

1. Verificar que "Oportunidades" aparece no menu lateral
2. Ícone deve ser uma estrela/sparkle dourada

---

## 4. Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
docker exec -it supabase-db psql -U postgres -d postgres

# Verificar tabelas existem no schema flip
\dt flip.*

# Contar registros
SELECT COUNT(*) FROM flip.source_listings;
SELECT COUNT(*) FROM flip.opportunities;
SELECT COUNT(*) FROM flip.opportunity_job_runs;

# Ver oportunidades com melhor score
SELECT title, score, price_cents/100 as price, area_m2
FROM flip.opportunities o
JOIN flip.source_listings s ON o.source_listing_id = s.id
ORDER BY score DESC
LIMIT 5;

# Ver últimas execuções
SELECT id, status,
       (stats->>'new_listings')::int as new,
       (stats->>'updated')::int as updated,
       created_at
FROM flip.opportunity_job_runs
ORDER BY created_at DESC
LIMIT 5;

# Sair
\q
```

---

## 5. Troubleshooting

### Erro: "relation does not exist"

Tabelas podem estar no schema errado. Verificar:

```bash
docker exec -i supabase-db psql -U postgres -d postgres -c "
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename IN ('source_listings', 'opportunities', 'opportunity_job_runs');
"
```

Se estiverem em `public`, rodar migration manualmente:

```bash
docker exec -i supabase-db psql -U postgres -d postgres < migrations/0034_opportunities.up.sql
```

### Erro: "INTERNAL_API_SECRET not configured"

Verificar `.env` na raiz do projeto:

```bash
grep INTERNAL_API .env
```

Deve conter:
```
INTERNAL_API_URL=http://localhost:8080
INTERNAL_API_SECRET=seu_secret_aqui
```

### Frontend não mostra oportunidades

1. Verificar API está respondendo:
   ```bash
   curl -s "http://localhost:8080/api/v1/health"
   ```

2. Verificar logs do Next.js no terminal

3. Reiniciar Next.js:
   ```bash
   # Ctrl+C no terminal do Next.js
   npm run dev:web
   ```

### Scraper trava ou timeout

1. Verificar se Chrome/Chromium está instalado
2. Aumentar timeout do contexto
3. Tentar com menos anúncios: `--limit=3`

---

## 6. Fluxo Completo de Teste

```bash
# 1. Garantir ambiente limpo
npm run db:migrate

# 2. Rodar scraper com poucos anúncios
cd services/api
go run ./cmd/scraper --limit=5 --dry-run --verbose

# 3. Se dry-run OK, enviar para API
go run ./cmd/scraper --limit=10 --secret=$(grep INTERNAL_API_SECRET ../../.env | cut -d'=' -f2)

# 4. Verificar via API
curl -s "http://localhost:8080/api/v1/internal/opportunities?limit=3" \
  -H "X-Internal-Secret: $(grep INTERNAL_API_SECRET ../../.env | cut -d'=' -f2)" | jq '.total'

# 5. Abrir browser
open http://localhost:3000/app/opportunities
```

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `go run ./cmd/scraper --help` | Ver todas as flags do CLI |
| `npm run dev:api` | Iniciar Go API |
| `npm run dev:web` | Iniciar Next.js |
| `npm run db:up` | Iniciar Supabase |
| `npm run typecheck:web` | Verificar tipos TypeScript |
