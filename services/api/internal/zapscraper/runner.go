package zapscraper

import (
	"context"
	"fmt"
	"strings"
)

const (
	defaultState       = "pr"
	defaultMaxListings = 50
	maxListingsLimit   = 200
)

type RunParams struct {
	City         string
	Neighborhood string
	State        string
	MaxListings  int
	Verbose      bool
}

type RunResult struct {
	Listings      []Opportunity
	MedianPriceM2 float64
}

func Run(ctx context.Context, params RunParams) (RunResult, error) {
	city := normalizeLocationSlug(params.City)
	neighborhood := normalizeLocationSlug(params.Neighborhood)
	if city == "" {
		return RunResult{}, fmt.Errorf("city is required")
	}
	if neighborhood == "" {
		return RunResult{}, fmt.Errorf("neighborhood is required")
	}

	state := strings.TrimSpace(strings.ToLower(params.State))
	if state == "" {
		state = defaultState
	}

	maxListings := params.MaxListings
	if maxListings <= 0 || maxListings > maxListingsLimit {
		maxListings = defaultMaxListings
	}

	collector := NewCollector(params.Verbose)
	summaries, err := collector.CollectListings(ctx, CollectParams{
		City:         city,
		Neighborhood: neighborhood,
		State:        state,
		MaxListings:  maxListings,
	})
	if err != nil {
		return RunResult{}, fmt.Errorf("collect listings: %w", err)
	}
	if len(summaries) == 0 {
		return RunResult{Listings: []Opportunity{}, MedianPriceM2: 0}, nil
	}

	details, err := collector.EnrichListings(ctx, summaries)
	if err != nil && len(details) == 0 {
		return RunResult{}, fmt.Errorf("enrich listings: %w", err)
	}

	listings := normalize(details)
	medianM2 := calculateMedianPricePerM2(listings)
	opportunities := scoreAll(listings, medianM2)

	return RunResult{
		Listings:      opportunities,
		MedianPriceM2: medianM2,
	}, nil
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
