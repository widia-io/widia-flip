package main

import (
	"regexp"
	"sort"
	"strings"
	"time"
)

// Keywords para scoring
var (
	reformKeywords = []string{
		"precisa de reforma", "reforma", "reformar", "original",
		"oportunidade", "abaixo do mercado", "urgente", "urgência",
		"inventário", "venda rápida", "aceita proposta", "aceita oferta",
		"precisa de reparos", "para reformar", "bom estado de conservação",
	}

	penaltyKeywords = []string{
		"infiltração", "infiltrações", "mofo", "umidade",
		"estrutura", "fundação", "problema estrutural",
		"elétrica toda", "parte elétrica", "instalação elétrica",
		"hidráulica toda", "encanamento", "vazamento",
	}
)

// calculateMedianPricePerM2 calcula a mediana do preço/m² dos anúncios
func calculateMedianPricePerM2(listings []SourceListing) float64 {
	var pricesM2 []float64

	for _, l := range listings {
		if l.AreaM2 > 0 && l.PriceCents > 0 {
			priceM2 := float64(l.PriceCents) / 100 / l.AreaM2
			pricesM2 = append(pricesM2, priceM2)
		}
	}

	if len(pricesM2) == 0 {
		return 0
	}

	sort.Float64s(pricesM2)

	mid := len(pricesM2) / 2
	if len(pricesM2)%2 == 0 {
		return (pricesM2[mid-1] + pricesM2[mid]) / 2
	}
	return pricesM2[mid]
}

// scoreAll calcula o score de todos os anúncios
func scoreAll(listings []SourceListing, medianM2 float64) []Opportunity {
	var opportunities []Opportunity

	for _, l := range listings {
		opp := score(l, medianM2)
		opportunities = append(opportunities, opp)
	}

	// Ordenar por score decrescente
	sort.Slice(opportunities, func(i, j int) bool {
		return opportunities[i].Score > opportunities[j].Score
	})

	return opportunities
}

// score calcula o score de um anúncio individual
func score(listing SourceListing, medianM2 float64) Opportunity {
	opp := Opportunity{
		SourceListing: listing,
		ScoreBreakdown: ScoreBreakdown{},
	}

	// Calcular preço/m²
	if listing.AreaM2 > 0 {
		opp.PricePerM2 = float64(listing.PriceCents) / 100 / listing.AreaM2
	}
	opp.MedianPriceM2 = medianM2

	// A) Desconto vs mercado (max +40)
	if medianM2 > 0 && opp.PricePerM2 > 0 {
		opp.DiscountPct = (medianM2 - opp.PricePerM2) / medianM2

		switch {
		case opp.DiscountPct >= 0.20 && opp.DiscountPct <= 0.40:
			opp.ScoreBreakdown.Discount = 40 // Sweet spot
		case opp.DiscountPct > 0.40:
			opp.ScoreBreakdown.Discount = 20 // Red flag - desconto excessivo
		case opp.DiscountPct >= 0.15:
			opp.ScoreBreakdown.Discount = 30
		case opp.DiscountPct >= 0.10:
			opp.ScoreBreakdown.Discount = 20
		case opp.DiscountPct >= 0.05:
			opp.ScoreBreakdown.Discount = 10
		default:
			opp.ScoreBreakdown.Discount = 0
		}
	}

	// B) Ticket revendável - Área (max +15)
	if listing.AreaM2 >= 50 && listing.AreaM2 <= 90 {
		opp.ScoreBreakdown.Area = 15
	} else if listing.AreaM2 >= 40 && listing.AreaM2 <= 100 {
		opp.ScoreBreakdown.Area = 10
	}

	// B) Ticket revendável - Quartos (max +10)
	if listing.Bedrooms == 2 || listing.Bedrooms == 3 {
		opp.ScoreBreakdown.Bedrooms = 10
	} else if listing.Bedrooms == 1 || listing.Bedrooms == 4 {
		opp.ScoreBreakdown.Bedrooms = 5
	}

	// B) Ticket revendável - Vagas (max +5)
	if listing.ParkingSpots >= 1 {
		opp.ScoreBreakdown.Parking = 5
	}

	// C) Sinais de reforma cosmética (max +15)
	text := strings.ToLower(listing.Title + " " + listing.Description)
	keywordCount := 0
	for _, kw := range reformKeywords {
		if strings.Contains(text, kw) {
			keywordCount++
		}
	}
	switch {
	case keywordCount >= 5:
		opp.ScoreBreakdown.Keywords = 15
	case keywordCount >= 3:
		opp.ScoreBreakdown.Keywords = 10
	case keywordCount >= 1:
		opp.ScoreBreakdown.Keywords = 5
	}

	// D) Penalidades (max -20)
	for _, kw := range penaltyKeywords {
		if strings.Contains(text, kw) {
			opp.ScoreBreakdown.Penalties = -20
			break
		}
	}

	// E) Decay temporal (max -10)
	if listing.PublishedAt != nil {
		daysSincePublished := int(time.Since(*listing.PublishedAt).Hours() / 24)
		switch {
		case daysSincePublished > 60:
			opp.ScoreBreakdown.Decay = -10
		case daysSincePublished > 30:
			opp.ScoreBreakdown.Decay = -5
		}
	}

	// Calcular score total
	opp.Score = opp.ScoreBreakdown.Discount +
		opp.ScoreBreakdown.Area +
		opp.ScoreBreakdown.Bedrooms +
		opp.ScoreBreakdown.Parking +
		opp.ScoreBreakdown.Keywords +
		opp.ScoreBreakdown.Penalties +
		opp.ScoreBreakdown.Decay

	// Clamp entre 0 e 100
	if opp.Score < 0 {
		opp.Score = 0
	}
	if opp.Score > 100 {
		opp.Score = 100
	}

	return opp
}

// scoreDescription analisa texto para keywords (exportado para testes)
func scoreDescription(text string) (reform int, penalty bool) {
	text = strings.ToLower(text)

	// Remove acentos para matching mais robusto
	text = removeAccents(text)

	for _, kw := range reformKeywords {
		if strings.Contains(text, removeAccents(kw)) {
			reform++
		}
	}

	for _, kw := range penaltyKeywords {
		if strings.Contains(text, removeAccents(kw)) {
			penalty = true
			break
		}
	}

	return
}

func removeAccents(s string) string {
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a",
		"é", "e", "ê", "e",
		"í", "i",
		"ó", "o", "ô", "o", "õ", "o",
		"ú", "u",
		"ç", "c",
	)
	return replacer.Replace(s)
}

// extractListingID extrai o ID do anúncio da URL
func extractListingID(url string) string {
	re := regexp.MustCompile(`id-(\d+)`)
	if m := re.FindStringSubmatch(url); len(m) > 1 {
		return m[1]
	}
	return ""
}
