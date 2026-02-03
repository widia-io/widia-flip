package main

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

// parseListingsHTML extrai os anúncios do HTML da página de listagem
func parseListingsHTML(html string) []ListingSummary {
	var summaries []ListingSummary

	// Regex para encontrar links de anúncios
	// Formato: /imovel/venda-apartamento-...-id-NNNNNNNNNN/
	linkRe := regexp.MustCompile(`href="(https://www\.zapimoveis\.com\.br/imovel/[^"]+id-(\d+)[^"]*)"`)
	matches := linkRe.FindAllStringSubmatch(html, -1)

	seen := make(map[string]bool)
	for _, match := range matches {
		if len(match) < 3 {
			continue
		}
		url := match[1]
		id := match[2]

		// Evitar duplicatas
		if seen[id] {
			continue
		}
		seen[id] = true

		// Extrair dados do contexto próximo ao link
		summary := extractSummaryFromContext(html, url, id)
		if summary != nil {
			summaries = append(summaries, *summary)
		}
	}

	return summaries
}

func extractSummaryFromContext(html, url, id string) *ListingSummary {
	// Encontrar o bloco que contém este anúncio
	idx := strings.Index(html, url)
	if idx == -1 {
		return nil
	}

	// Pegar contexto ao redor (5KB antes e depois)
	start := max(0, idx-5000)
	end := min(len(html), idx+5000)
	context := html[start:end]

	summary := &ListingSummary{
		SourceListingID: id,
		URL:             url,
	}

	// Título - procurar por padrões comuns
	titlePatterns := []string{
		`Apartamento[^<]*à venda[^<]*`,
		`Apartamento para comprar[^<]*`,
		`Apartamento com \d+ [Qq]uartos[^<]*`,
	}
	for _, pattern := range titlePatterns {
		re := regexp.MustCompile(pattern)
		if m := re.FindString(context); m != "" {
			summary.Title = cleanText(m)
			break
		}
	}

	// Preço - R$ NNN.NNN ou R$ N.NNN.NNN
	priceRe := regexp.MustCompile(`R\$\s*([\d.,]+)`)
	if matches := priceRe.FindAllStringSubmatch(context, -1); len(matches) > 0 {
		// Primeiro preço geralmente é o principal
		summary.PriceCents = parsePriceToCents(matches[0][1])

		// Procurar condomínio
		condoRe := regexp.MustCompile(`[Cc]ond[^R]*R\$\s*([\d.,]+)`)
		if m := condoRe.FindStringSubmatch(context); len(m) > 1 {
			summary.CondoFeeCents = parsePriceToCents(m[1])
		}

		// Procurar IPTU
		iptuRe := regexp.MustCompile(`IPTU[^R]*R\$\s*([\d.,]+)`)
		if m := iptuRe.FindStringSubmatch(context); len(m) > 1 {
			summary.IPTUCents = parsePriceToCents(m[1])
		}
	}

	// Área - NNN m² ou NNNm²
	areaRe := regexp.MustCompile(`(\d+)\s*m²`)
	if m := areaRe.FindStringSubmatch(context); len(m) > 1 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			summary.AreaM2 = v
		}
	}

	// Quartos - com validação (1-10)
	quartoRe := regexp.MustCompile(`(\d+)\s*[Qq]uartos?`)
	if m := quartoRe.FindStringSubmatch(context); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil && v >= 1 && v <= 10 {
			summary.Bedrooms = v
		}
	}

	// Banheiros - com validação (1-10)
	banheiroRe := regexp.MustCompile(`(\d+)\s*[Bb]anheiros?`)
	if m := banheiroRe.FindStringSubmatch(context); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil && v >= 1 && v <= 10 {
			summary.Bathrooms = v
		}
	}

	// Vagas - com validação (0-10)
	vagasRe := regexp.MustCompile(`(\d+)\s*[Vv]agas?`)
	if m := vagasRe.FindStringSubmatch(context); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil && v >= 0 && v <= 10 {
			summary.ParkingSpots = v
		}
	}

	// Bairro - já sabemos pelo contexto
	neighborhoodRe := regexp.MustCompile(`Vila Izabel|Vl[- ]Izabel`)
	if m := neighborhoodRe.FindString(context); m != "" {
		summary.Neighborhood = "Vila Izabel"
	}

	// Endereço
	addressRe := regexp.MustCompile(`(Rua|Avenida|Av\.|R\.)[^,<]+`)
	if m := addressRe.FindString(context); m != "" {
		summary.Address = cleanText(m)
	}

	// Imagem
	imgRe := regexp.MustCompile(`src="(https://resizedimgs\.zapimoveis\.com\.br[^"]+)"`)
	if m := imgRe.FindStringSubmatch(context); len(m) > 1 {
		summary.ImageURL = m[1]
	}

	return summary
}

// parseDetailHTML extrai detalhes completos da página do anúncio
func parseDetailHTML(html string, summary ListingSummary) *ListingDetails {
	detail := &ListingDetails{
		SourceListingID: summary.SourceListingID,
		URL:             summary.URL,
		Title:           summary.Title,
		PriceCents:      summary.PriceCents,
		AreaM2:          summary.AreaM2,
		Bedrooms:        summary.Bedrooms,
		Bathrooms:       summary.Bathrooms,
		ParkingSpots:    summary.ParkingSpots,
		CondoFeeCents:   summary.CondoFeeCents,
		IPTUCents:       summary.IPTUCents,
		Neighborhood:    summary.Neighborhood,
		Address:         summary.Address,
		Images:          []string{summary.ImageURL},
	}

	// Título melhorado
	titleRe := regexp.MustCompile(`<h[12][^>]*>([^<]*[Aa]partamento[^<]*)</h[12]>`)
	if m := titleRe.FindStringSubmatch(html); len(m) > 1 {
		detail.Title = cleanText(m[1])
	}

	// Descrição completa
	descRe := regexp.MustCompile(`(?s)Código do anunciante[^)]+\)\s*</p>\s*</generic>\s*<generic[^>]*>\s*<paragraph[^>]*>(.*?)</paragraph>`)
	if m := descRe.FindStringSubmatch(html); len(m) > 1 {
		detail.Description = cleanText(m[1])
	}
	// Fallback - procurar descrição em outro formato
	if detail.Description == "" {
		descRe2 := regexp.MustCompile(`(?s)<p[^>]*class="[^"]*description[^"]*"[^>]*>(.+?)</p>`)
		if m := descRe2.FindStringSubmatch(html); len(m) > 1 {
			detail.Description = cleanText(m[1])
		}
	}

	// Preço (mais preciso)
	priceRe := regexp.MustCompile(`Venda[^R]*R\$\s*([\d.,]+)`)
	if m := priceRe.FindStringSubmatch(html); len(m) > 1 {
		detail.PriceCents = parsePriceToCents(m[1])
	}

	// Área
	areaRe := regexp.MustCompile(`Metragem[^0-9]*(\d+)\s*m²`)
	if m := areaRe.FindStringSubmatch(html); len(m) > 1 {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil {
			detail.AreaM2 = v
		}
	}

	// Quartos - padrão mais específico
	quartoPatterns := []string{
		`(\d+)\s*[Qq]uartos?\b`,     // "2 quartos"
		`[Qq]uartos?\s*[:\-]?\s*(\d+)`, // "Quartos: 2"
	}
	for _, pattern := range quartoPatterns {
		re := regexp.MustCompile(pattern)
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n >= 1 && n <= 10 {
				detail.Bedrooms = n
				break
			}
		}
	}

	// Banheiros - padrão mais específico
	banheiroPatterns := []string{
		`(\d+)\s*[Bb]anheiros?\b`,     // "2 banheiros"
		`[Bb]anheiros?\s*[:\-]?\s*(\d+)`, // "Banheiros: 2"
	}
	for _, pattern := range banheiroPatterns {
		re := regexp.MustCompile(pattern)
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n >= 1 && n <= 10 {
				detail.Bathrooms = n
				break
			}
		}
	}

	// Vagas - padrão mais específico
	vagasPatterns := []string{
		`(\d+)\s*[Vv]agas?\b`,     // "2 vagas"
		`[Vv]agas?\s*[:\-]?\s*(\d+)`, // "Vagas: 2"
	}
	for _, pattern := range vagasPatterns {
		re := regexp.MustCompile(pattern)
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n >= 0 && n <= 10 {
				detail.ParkingSpots = n
				break
			}
		}
	}

	// Suítes
	suiteRe := regexp.MustCompile(`(\d+)\s*suítes?`)
	if m := suiteRe.FindStringSubmatch(html); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil {
			detail.Suites = v
		}
	}

	// Andar
	andarRe := regexp.MustCompile(`(\d+)\s*andar`)
	if m := andarRe.FindStringSubmatch(html); len(m) > 1 {
		if v, err := strconv.Atoi(m[1]); err == nil {
			detail.Floor = v
		}
	}

	// Condomínio
	condoRe := regexp.MustCompile(`[Cc]ondomínio[^R]*R\$\s*([\d.,]+)`)
	if m := condoRe.FindStringSubmatch(html); len(m) > 1 {
		detail.CondoFeeCents = parsePriceToCents(m[1])
	}

	// IPTU
	iptuRe := regexp.MustCompile(`IPTU[^R]*R\$\s*([\d.,]+)`)
	if m := iptuRe.FindStringSubmatch(html); len(m) > 1 {
		detail.IPTUCents = parsePriceToCents(m[1])
	}

	// Endereço completo
	addrRe := regexp.MustCompile(`((?:Rua|Avenida|Av\.|R\.)[^,<]+,\s*\d+[^-<]*)-\s*([^,<]+),\s*([^-<]+)\s*-\s*([A-Z]{2})`)
	if m := addrRe.FindStringSubmatch(html); len(m) > 4 {
		detail.Address = cleanText(m[1])
		detail.Neighborhood = cleanText(m[2])
		detail.City = cleanText(m[3])
		detail.State = cleanText(m[4])
	}

	// Data de publicação
	dateRe := regexp.MustCompile(`criado em (\d+) de (\w+) de (\d+)`)
	if m := dateRe.FindStringSubmatch(html); len(m) > 3 {
		if t := parseDate(m[1], m[2], m[3]); t != nil {
			detail.PublishedAt = t
		}
	}

	// Imagens
	imgRe := regexp.MustCompile(`src="(https://resizedimgs\.zapimoveis\.com\.br[^"]+)"`)
	matches := imgRe.FindAllStringSubmatch(html, 20)
	seen := make(map[string]bool)
	for _, m := range matches {
		if len(m) > 1 && !seen[m[1]] {
			seen[m[1]] = true
			detail.Images = append(detail.Images, m[1])
		}
	}

	return detail
}

// Helpers

func parsePriceToCents(s string) int64 {
	// Remove pontos de milhar e converte vírgula decimal
	s = strings.ReplaceAll(s, ".", "")
	s = strings.ReplaceAll(s, ",", ".")
	s = strings.TrimSpace(s)

	if v, err := strconv.ParseFloat(s, 64); err == nil {
		return int64(v * 100)
	}
	return 0
}

func cleanText(s string) string {
	// Remove HTML tags
	re := regexp.MustCompile(`<[^>]+>`)
	s = re.ReplaceAllString(s, "")

	// Remove espaços extras
	s = strings.Join(strings.Fields(s), " ")

	return strings.TrimSpace(s)
}

func parseDate(day, month, year string) *time.Time {
	months := map[string]time.Month{
		"janeiro":   time.January,
		"fevereiro": time.February,
		"março":     time.March,
		"abril":     time.April,
		"maio":      time.May,
		"junho":     time.June,
		"julho":     time.July,
		"agosto":    time.August,
		"setembro":  time.September,
		"outubro":   time.October,
		"novembro":  time.November,
		"dezembro":  time.December,
	}

	d, err := strconv.Atoi(day)
	if err != nil {
		return nil
	}
	y, err := strconv.Atoi(year)
	if err != nil {
		return nil
	}
	m, ok := months[strings.ToLower(month)]
	if !ok {
		return nil
	}

	t := time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
	return &t
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
