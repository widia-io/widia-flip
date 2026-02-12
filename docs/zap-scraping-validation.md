# Validação Scraping ZAP Imóveis

Data: 2026-02-01

## Resumo

| Método | Listagem | Detalhe | Custo | Produção |
|--------|----------|---------|-------|----------|
| WebFetch direto | ❌ 403 | ❌ 403 | Grátis | N/A |
| Firecrawl API | ✅ | ✅ | ~1 crédito/página | ✅ |
| Playwright | ✅ | ✅ | Grátis | ⚠️ requer infra |

**Decisão: Firecrawl para POC** (simplicidade). Playwright como fallback se custo escalar.

---

## Firecrawl

### Configuração
```bash
FIRECRAWL_API_KEY=fc-xxx  # já configurado no .env
```

### URLs testadas

**Listagem:**
```
https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba++vl-izabel/
```
- Formato do bairro: abreviado (`vl-izabel` não `vila-izabel`)
- Dois `+` antes do bairro: `pr+curitiba++vl-izabel`

**Detalhe:**
```
https://www.zapimoveis.com.br/imovel/venda-apartamento-2-quartos-com-churrasqueira-vila-izabel-curitiba-pr-94m2-id-2837700022/
```
- ID do anúncio no final da URL: `id-2837700022`

### Campos extraídos (listagem)

```markdown
# 507 Apartamentos à venda em Vila Izabel, Curitiba - PR

**Apartamento para comprar com 104 m², 3 quartos, 3 banheiros, 2 vagas em Vila Izabel, Curitiba**
Avenida República Argentina
- Tamanho do imóvel 104 m²
- Quantidade de quartos 3
- Quantidade de banheiros 3
- Quantidade de vagas de garagem 2
R$ 985.000
Cond. R$ 1.700 • IPTU R$ 382
```

### Campos extraídos (detalhe)

| Campo | Exemplo | Regex/Pattern |
|-------|---------|---------------|
| source_listing_id | 2837700022 | `id-(\d+)` na URL |
| title | Apartamento com 2 Quartos à venda, 94m² - Vila Izabel | `## (.+)` |
| price_cents | 119000000 | `R\$ ([\d.,]+)` → parse |
| area_m2 | 94 | `(\d+)\s*m²` |
| bedrooms | 2 | `(\d+)\s*quartos?` |
| bathrooms | 2 | `(\d+)\s*banheiros?` |
| parking_spots | 2 | `(\d+)\s*vagas?` |
| neighborhood | Vila Izabel | após `Localização` |
| city | Curitiba | após neighborhood |
| state | PR | após city |
| condo_fee_cents | 84800 | `Condomínio\s*R\$ ([\d.,]+)` |
| iptu_cents | 201900 | `IPTU\s*R\$ ([\d.,]+)` |
| description | texto completo | após código do anúncio |
| published_at | 2025-09-19 | `criado em (\d+ de \w+ de \d+)` |
| images | URLs | `resizedimgs.zapimoveis.com.br/...` |

### Paginação

```
https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba++vl-izabel/?pagina=2
```

### Filtros via URL

```
/venda/apartamentos/pr+curitiba++vl-izabel/2-quartos/        # quartos
/venda/apartamentos/pr+curitiba++vl-izabel/?precoMinimo=100000&precoMaximo=500000
/venda/apartamentos/pr+curitiba++vl-izabel/?areaMinima=50&areaMaxima=90
```

### Custo estimado

- 1 crédito por scrape
- Listagem: ~10 páginas (20 imóveis/página) = 10 créditos
- Detalhes: 200 imóveis = 200 créditos
- **Total por execução: ~210 créditos**

---

## Playwright (testado ✅)

### Resultados
- **Listagem**: ✅ funcionou
- **Detalhe**: ✅ funcionou

### Dados extraídos (página de detalhe)
```yaml
ID: 2818405614
Preço: R$ 985.000
Condomínio: R$ 1.700/mês
IPTU: R$ 382
Área: 104 m²
Quartos: 3
Banheiros: 3
Vagas: 2
Andar: 6
Suítes: 1
Endereço: Avenida República Argentina, 1812 - Vila Izabel, Curitiba - PR
Publicado: 2 de julho de 2025
Imobiliária: Ponto Mil Imoveis (CRECI: 02724-J-PR)
```

### Vantagens
- Sem custo por requisição
- Controle total do browser
- Dados estruturados (refs para cada elemento)
- Pode executar JS (útil se ZAP usar lazy loading)

### Desvantagens
- Requer infra (container com browser)
- Mais lento que Firecrawl
- Output maior (precisa parsing do YAML)

### Produção
- **Container Docker**: rodar Chromium headless no servidor
- **Browserless.io**: SaaS (~$0.01/minuto)
- **GitHub Actions**: para scheduled jobs (grátis, mas limitado)

---

## Decisão

| Cenário | Recomendação |
|---------|--------------|
| POC (< 500 anúncios/dia) | Firecrawl (simplicidade) |
| Escala (> 1000 anúncios/dia) | Playwright (custo) |
| Híbrido | Firecrawl para listagem, Playwright para detalhes |

---

## Próximos passos

- [x] Testar Firecrawl no ZAP ✅
- [x] Testar Playwright no ZAP ✅
- [x] Comparar qualidade dos dados ✅
- [x] Decidir approach final → **Firecrawl para POC**
- [ ] Implementar parser de markdown → struct (Fase 2)
- [ ] Migrations (Fase 2)
- [ ] API endpoints (Fase 2)
- [ ] UI (Fase 3)
