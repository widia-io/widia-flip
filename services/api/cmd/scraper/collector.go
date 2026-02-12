package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/chromedp"
)

type Collector struct {
	verbose bool
}

func NewCollector(verbose bool) *Collector {
	return &Collector{verbose: verbose}
}

// CollectListings coleta a lista de anúncios da página de busca
func (c *Collector) CollectListings(ctx context.Context, params CollectParams) ([]ListingSummary, error) {
	candidates := buildSearchURLCandidates(params)
	state := strings.TrimSpace(strings.ToLower(params.State))
	city := normalizeLocationSlug(params.City)
	neighborhood := normalizeLocationSlug(params.Neighborhood)
	if state == "" {
		state = defaultState
	}
	if c.verbose {
		log.Printf("[collector] URLs candidatas: %d", len(candidates))
	}

	// Criar contexto do Chrome
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, opts...)
	defer allocCancel()

	var lastErr error
	successfulAttempts := 0

	for idx, url := range candidates {
		var html string
		var title string

		attemptCtx, attemptCancel := chromedp.NewContext(allocCtx)
		navCtx, navCancel := context.WithTimeout(attemptCtx, 60*time.Second)
		err := chromedp.Run(navCtx,
			chromedp.Navigate(url),
			chromedp.Sleep(5*time.Second), // Aguardar JS carregar
			chromedp.Title(&title),
			chromedp.OuterHTML("html", &html),
		)
		navCancel()
		attemptCancel()
		if err != nil {
			lastErr = err
			if c.verbose {
				log.Printf("[collector] tentativa %d/%d falhou: %s (%v)", idx+1, len(candidates), url, err)
			}
			continue
		}

		successfulAttempts++
		summaries := parseListingsHTML(html)
		matchedSummaries := filterSummariesByLocation(
			summaries,
			city,
			buildNeighborhoodSlugVariants(neighborhood),
			state,
		)

		if c.verbose {
			log.Printf("[collector] tentativa %d/%d: %s | title=%q | html=%d bytes | listings=%d | location_match=%d",
				idx+1, len(candidates), url, title, len(html), len(summaries), len(matchedSummaries))
		}

		if len(matchedSummaries) == 0 {
			continue
		}

		// Limitar quantidade
		if params.MaxListings > 0 && len(matchedSummaries) > params.MaxListings {
			matchedSummaries = matchedSummaries[:params.MaxListings]
		}

		return matchedSummaries, nil
	}

	if successfulAttempts == 0 && lastErr != nil {
		return nil, fmt.Errorf("falha ao carregar páginas de busca: %w", lastErr)
	}

	return []ListingSummary{}, nil
}

// EnrichListings coleta detalhes de cada anúncio
func (c *Collector) EnrichListings(ctx context.Context, summaries []ListingSummary) ([]ListingDetails, error) {
	// Criar contexto do Chrome reutilizável
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, opts...)
	defer allocCancel()

	// Processar em paralelo com limite de concorrência
	const maxConcurrent = 3
	sem := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex
	var details []ListingDetails
	var errors []error

	for i, summary := range summaries {
		wg.Add(1)
		go func(idx int, s ListingSummary) {
			defer wg.Done()
			sem <- struct{}{}        // Adquirir slot
			defer func() { <-sem }() // Liberar slot

			// Sleep aleatório para evitar rate limit
			sleepMs := 1000 + rand.Intn(2000)
			time.Sleep(time.Duration(sleepMs) * time.Millisecond)

			detail, err := c.enrichOne(allocCtx, s)
			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				if c.verbose {
					log.Printf("[collector] ⚠️ Erro no anúncio %d: %v", idx+1, err)
				}
				errors = append(errors, err)
				// Usar dados do summary como fallback
				details = append(details, ListingDetails{
					SourceListingID: s.SourceListingID,
					URL:             s.URL,
					Title:           s.Title,
					PriceCents:      s.PriceCents,
					AreaM2:          s.AreaM2,
					Bedrooms:        s.Bedrooms,
					Bathrooms:       s.Bathrooms,
					ParkingSpots:    s.ParkingSpots,
					CondoFeeCents:   s.CondoFeeCents,
					IPTUCents:       s.IPTUCents,
					Address:         s.Address,
					Neighborhood:    s.Neighborhood,
					Images:          []string{s.ImageURL},
				})
			} else {
				details = append(details, *detail)
				if c.verbose {
					log.Printf("[collector] ✓ Anúncio %d/%d coletado", idx+1, len(summaries))
				}
			}
		}(i, summary)
	}

	wg.Wait()

	if len(errors) > 0 {
		return details, fmt.Errorf("%d erros durante enriquecimento", len(errors))
	}

	return details, nil
}

func (c *Collector) enrichOne(allocCtx context.Context, summary ListingSummary) (*ListingDetails, error) {
	chromeCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// Timeout para cada página
	ctx, cancelTimeout := context.WithTimeout(chromeCtx, 45*time.Second)
	defer cancelTimeout()

	var html string
	err := chromedp.Run(ctx,
		chromedp.Navigate(summary.URL),
		chromedp.Sleep(4*time.Second), // Aguardar carregamento
		chromedp.OuterHTML("html", &html),
	)
	if err != nil {
		return nil, fmt.Errorf("falha ao carregar detalhe: %w", err)
	}

	// Parse HTML do detalhe
	detail := parseDetailHTML(html, summary)
	return detail, nil
}

const defaultState = "pr"

func buildSearchURLCandidates(params CollectParams) []string {
	state := strings.TrimSpace(strings.ToLower(params.State))
	city := normalizeLocationSlug(params.City)
	neighborhood := normalizeLocationSlug(params.Neighborhood)

	if state == "" {
		state = defaultState
	}

	baseLocation := state + "+" + city
	neighborhoodVariants := buildNeighborhoodSlugVariants(neighborhood)
	candidates := make([]string, 0, 16)

	// Mantém o formato legado como primeira tentativa.
	for _, neighborhoodVariant := range neighborhoodVariants {
		candidates = append(candidates,
			buildSearchURL(baseLocation, neighborhoodVariant, true),
			buildSearchURL(baseLocation, neighborhoodVariant, false),
		)
	}

	// Fallback para cidades com segmentação por zona no path.
	for _, zone := range cityZoneCandidates(state, city) {
		locationWithZone := baseLocation + "+" + zone
		for _, neighborhoodVariant := range neighborhoodVariants {
			candidates = append(candidates, buildSearchURL(locationWithZone, neighborhoodVariant, false))
		}
	}

	return dedupeURLCandidates(candidates)
}

func buildSearchURL(locationPrefix, neighborhood string, useDoublePlus bool) string {
	separator := "+"
	if useDoublePlus {
		separator = "++"
	}
	return fmt.Sprintf("https://www.zapimoveis.com.br/venda/apartamentos/%s%s%s/",
		locationPrefix, separator, neighborhood)
}

func buildNeighborhoodSlugVariants(slug string) []string {
	variants := []string{slug}

	switch {
	case strings.HasPrefix(slug, "vila-"):
		variants = append(variants, "vl-"+strings.TrimPrefix(slug, "vila-"))
	case strings.HasPrefix(slug, "vl-"):
		variants = append(variants, "vila-"+strings.TrimPrefix(slug, "vl-"))
	}

	switch {
	case strings.HasPrefix(slug, "jardim-"):
		variants = append(variants, "jd-"+strings.TrimPrefix(slug, "jardim-"))
	case strings.HasPrefix(slug, "jd-"):
		variants = append(variants, "jardim-"+strings.TrimPrefix(slug, "jd-"))
	}

	return dedupeURLCandidates(variants)
}

func cityZoneCandidates(state, city string) []string {
	switch state + "|" + city {
	case "sp|sao-paulo":
		return []string{"zona-leste", "zona-oeste", "zona-sul", "zona-norte", "centro"}
	case "rj|rio-de-janeiro":
		return []string{"zona-sul", "zona-oeste", "zona-norte", "centro"}
	default:
		return nil
	}
}

func dedupeURLCandidates(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func filterSummariesByLocation(
	summaries []ListingSummary,
	citySlug string,
	neighborhoodSlugs []string,
	state string,
) []ListingSummary {
	const minNeighborhoodStrictMatches = 5
	baseMatches := make([]ListingSummary, 0, len(summaries))
	stateMatches := make([]ListingSummary, 0, len(summaries))
	neighborhoodMatches := make([]ListingSummary, 0, len(summaries))

	for _, summary := range summaries {
		url := strings.ToLower(summary.URL)
		if url == "" {
			continue
		}

		if citySlug != "" {
			if !strings.Contains(url, citySlug) {
				continue
			}
		} else if state != "" && !hasStateToken(url, state) {
			continue
		}

		if state != "" && citySlug != "" && !hasStateToken(url, state) && hasAnyKnownStateToken(url) {
			// Se a URL declara uma UF diferente da solicitada, descarta.
			continue
		}

		baseMatches = append(baseMatches, summary)
		if state != "" && hasStateToken(url, state) {
			stateMatches = append(stateMatches, summary)
		}
		if matchesAnyNeighborhoodSlug(url, neighborhoodSlugs) {
			neighborhoodMatches = append(neighborhoodMatches, summary)
		}
	}

	if len(neighborhoodSlugs) == 0 {
		if citySlug == "" && state != "" && len(stateMatches) > 0 {
			return stateMatches
		}
		return baseMatches
	}
	if len(neighborhoodMatches) >= minNeighborhoodStrictMatches {
		return neighborhoodMatches
	}

	// Em cenários onde o portal expande para micro-regiões, manter cidade
	// evita amostras muito pequenas sem vazar para outra praça.
	return baseMatches
}

func matchesAnyNeighborhoodSlug(url string, slugs []string) bool {
	if len(slugs) == 0 {
		return true
	}
	for _, slug := range slugs {
		if slug == "" {
			continue
		}
		if strings.Contains(url, strings.ToLower(slug)) {
			return true
		}
	}
	return false
}

func hasStateToken(url string, state string) bool {
	state = strings.TrimSpace(strings.ToLower(state))
	if state == "" {
		return true
	}

	candidates := stateSlugCandidates(state)
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if strings.Contains(url, "-"+candidate+"-") || strings.Contains(url, "-"+candidate+"/") {
			return true
		}
	}
	return false
}

func hasAnyKnownStateToken(url string) bool {
	for _, candidate := range allStateSlugTokens() {
		if strings.Contains(url, "-"+candidate+"-") || strings.Contains(url, "-"+candidate+"/") {
			return true
		}
	}
	return false
}

func allStateSlugTokens() []string {
	return []string{
		"ac", "acre",
		"al", "alagoas",
		"ap", "amapa",
		"am", "amazonas",
		"ba", "bahia",
		"ce", "ceara",
		"df", "distrito-federal",
		"es", "espirito-santo",
		"go", "goias",
		"ma", "maranhao",
		"mt", "mato-grosso",
		"ms", "mato-grosso-do-sul",
		"mg", "minas-gerais",
		"pa", "para",
		"pb", "paraiba",
		"pr", "parana",
		"pe", "pernambuco",
		"pi", "piaui",
		"rj", "rio-de-janeiro",
		"rn", "rio-grande-do-norte",
		"rs", "rio-grande-do-sul",
		"ro", "rondonia",
		"rr", "roraima",
		"sc", "santa-catarina",
		"sp", "sao-paulo",
		"se", "sergipe",
		"to", "tocantins",
	}
}

func stateSlugCandidates(state string) []string {
	switch state {
	case "ac":
		return []string{"ac", "acre"}
	case "al":
		return []string{"al", "alagoas"}
	case "ap":
		return []string{"ap", "amapa"}
	case "am":
		return []string{"am", "amazonas"}
	case "ba":
		return []string{"ba", "bahia"}
	case "ce":
		return []string{"ce", "ceara"}
	case "df":
		return []string{"df", "distrito-federal"}
	case "es":
		return []string{"es", "espirito-santo"}
	case "go":
		return []string{"go", "goias"}
	case "ma":
		return []string{"ma", "maranhao"}
	case "mt":
		return []string{"mt", "mato-grosso"}
	case "ms":
		return []string{"ms", "mato-grosso-do-sul"}
	case "mg":
		return []string{"mg", "minas-gerais"}
	case "pa":
		return []string{"pa", "para"}
	case "pb":
		return []string{"pb", "paraiba"}
	case "pr":
		return []string{"pr", "parana"}
	case "pe":
		return []string{"pe", "pernambuco"}
	case "pi":
		return []string{"pi", "piaui"}
	case "rj":
		return []string{"rj", "rio-de-janeiro"}
	case "rn":
		return []string{"rn", "rio-grande-do-norte"}
	case "rs":
		return []string{"rs", "rio-grande-do-sul"}
	case "ro":
		return []string{"ro", "rondonia"}
	case "rr":
		return []string{"rr", "roraima"}
	case "sc":
		return []string{"sc", "santa-catarina"}
	case "sp":
		return []string{"sp", "sao-paulo"}
	case "se":
		return []string{"se", "sergipe"}
	case "to":
		return []string{"to", "tocantins"}
	default:
		return []string{state}
	}
}

func normalizeLocationSlug(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
		"é", "e", "ê", "e", "è", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i",
		"ó", "o", "ô", "o", "õ", "o", "ò", "o", "ö", "o",
		"ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c",
	)
	value = replacer.Replace(value)

	var b strings.Builder
	lastDash := false
	for _, r := range value {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			lastDash = false
		case r == ' ' || r == '-' || r == '_' || r == '/' || r == '.':
			if !lastDash && b.Len() > 0 {
				b.WriteRune('-')
				lastDash = true
			}
		}
	}

	normalized := strings.Trim(b.String(), "-")
	if normalized == "" {
		return value
	}

	return normalized
}
