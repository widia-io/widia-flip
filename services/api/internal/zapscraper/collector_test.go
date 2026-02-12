package zapscraper

import "testing"

func TestBuildSearchURLCandidatesIncludesZoneFallbackForSaoPaulo(t *testing.T) {
	candidates := buildSearchURLCandidates(CollectParams{
		State:        "sp",
		City:         "São Paulo",
		Neighborhood: "Mooca",
	})

	if len(candidates) == 0 {
		t.Fatal("expected at least one candidate URL")
	}

	if candidates[0] != "https://www.zapimoveis.com.br/venda/apartamentos/sp+sao-paulo++mooca/" {
		t.Fatalf("unexpected first candidate: %s", candidates[0])
	}

	expectedZoneURL := "https://www.zapimoveis.com.br/venda/apartamentos/sp+sao-paulo+zona-leste+mooca/"
	if !containsCandidate(candidates, expectedZoneURL) {
		t.Fatalf("expected zone fallback URL %q in candidates", expectedZoneURL)
	}
}

func TestBuildSearchURLCandidatesIncludesVilaAlias(t *testing.T) {
	candidates := buildSearchURLCandidates(CollectParams{
		State:        "pr",
		City:         "Curitiba",
		Neighborhood: "Vila Izabel",
	})

	expectedLegacy := "https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba++vila-izabel/"
	expectedAlias := "https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba++vl-izabel/"

	if !containsCandidate(candidates, expectedLegacy) {
		t.Fatalf("expected URL %q in candidates", expectedLegacy)
	}
	if !containsCandidate(candidates, expectedAlias) {
		t.Fatalf("expected URL %q in candidates", expectedAlias)
	}
}

func TestFilterSummariesByLocationFallbackToCityStateWhenNeighborhoodIsSparse(t *testing.T) {
	summaries := []ListingSummary{
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-pr-80m2-id-1/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-mooca-sao-paulo-sp-70m2-id-2/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-centro-curitiba-pr-65m2-id-3/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-sp-75m2-id-4/"},
	}

	filtered := filterSummariesByLocation(summaries, "curitiba", []string{"vl-izabel", "vila-izabel"}, "pr")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 listings after fallback to city/state filter, got %d", len(filtered))
	}
	if filtered[0].URL != summaries[0].URL {
		t.Fatalf("unexpected first listing kept after filter: %s", filtered[0].URL)
	}
	if filtered[1].URL != summaries[2].URL {
		t.Fatalf("unexpected second listing kept after filter: %s", filtered[1].URL)
	}
}

func TestFilterSummariesByLocationKeepsNeighborhoodWhenSufficientResults(t *testing.T) {
	summaries := []ListingSummary{
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-pr-80m2-id-1/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vl-izabel-curitiba-pr-81m2-id-2/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-pr-82m2-id-3/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vl-izabel-curitiba-pr-83m2-id-4/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-pr-84m2-id-5/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-centro-curitiba-pr-65m2-id-6/"},
	}

	filtered := filterSummariesByLocation(summaries, "curitiba", []string{"vl-izabel", "vila-izabel"}, "pr")
	if len(filtered) != 5 {
		t.Fatalf("expected strict neighborhood filter to keep 5 listings, got %d", len(filtered))
	}
}

func TestHasStateTokenAcceptsFullStateNameSlug(t *testing.T) {
	url := "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-parana-90m2-id-1/"
	if !hasStateToken(url, "pr") {
		t.Fatal("expected state token matcher to accept full state name slug for PR")
	}
}

func TestFilterSummariesByLocationAllowsMissingStateTokenWhenCityMatches(t *testing.T) {
	summaries := []ListingSummary{
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-vila-izabel-curitiba-80m2-id-1/"},
		{URL: "https://www.zapimoveis.com.br/imovel/venda-apartamento-mooca-sao-paulo-sp-70m2-id-2/"},
	}

	filtered := filterSummariesByLocation(summaries, "curitiba", []string{"vl-izabel", "vila-izabel"}, "pr")
	if len(filtered) != 1 {
		t.Fatalf("expected 1 listing even without explicit state token, got %d", len(filtered))
	}
	if filtered[0].URL != summaries[0].URL {
		t.Fatalf("unexpected listing kept after filter: %s", filtered[0].URL)
	}
}

func containsCandidate(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
