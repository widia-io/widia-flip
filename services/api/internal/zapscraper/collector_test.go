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

func containsCandidate(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
