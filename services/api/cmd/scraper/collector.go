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
	url := buildSearchURL(params)
	if c.verbose {
		log.Printf("[collector] URL: %s", url)
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

	chromeCtx, chromeCancel := chromedp.NewContext(allocCtx)
	defer chromeCancel()

	var html string

	// Timeout para navegação
	navCtx, navCancel := context.WithTimeout(chromeCtx, 60*time.Second)
	defer navCancel()

	if c.verbose {
		log.Printf("[collector] Navegando para URL...")
	}

	err := chromedp.Run(navCtx,
		chromedp.Navigate(url),
		chromedp.Sleep(5*time.Second), // Aguardar JS carregar
		chromedp.OuterHTML("html", &html),
	)
	if err != nil {
		return nil, fmt.Errorf("falha ao carregar página: %w", err)
	}

	if c.verbose {
		log.Printf("[collector] Página carregada")
	}

	if c.verbose {
		log.Printf("[collector] HTML coletado: %d bytes", len(html))
	}

	// Parse HTML
	summaries := parseListingsHTML(html)

	// Limitar quantidade
	if params.MaxListings > 0 && len(summaries) > params.MaxListings {
		summaries = summaries[:params.MaxListings]
	}

	return summaries, nil
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

func buildSearchURL(params CollectParams) string {
	// Formato: /venda/apartamentos/pr+curitiba++vl-izabel/
	state := strings.ToLower(params.State)
	city := strings.ToLower(strings.ReplaceAll(params.City, " ", "-"))
	neighborhood := strings.ToLower(params.Neighborhood)

	return fmt.Sprintf("https://www.zapimoveis.com.br/venda/apartamentos/%s+%s++%s/",
		state, city, neighborhood)
}
