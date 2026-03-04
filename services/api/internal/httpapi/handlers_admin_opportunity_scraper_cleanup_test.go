package httpapi

import "testing"

func TestEvaluateOpportunityListingAvailabilityStatusNotFound(t *testing.T) {
	unavailable, reason := evaluateOpportunityListingAvailability(404, "https://www.zapimoveis.com.br/imovel/abc", "")
	if !unavailable {
		t.Fatal("expected listing to be unavailable when status is 404")
	}
	if reason != "status_not_found" {
		t.Fatalf("unexpected reason: %s", reason)
	}
}

func TestEvaluateOpportunityListingAvailabilityRedirectWithoutListing(t *testing.T) {
	unavailable, reason := evaluateOpportunityListingAvailability(
		200,
		"https://www.zapimoveis.com.br/venda/apartamentos/pr+curitiba/",
		"",
	)
	if !unavailable {
		t.Fatal("expected listing to be unavailable when redirect leaves /imovel/ path")
	}
	if reason != "redirect_without_listing" {
		t.Fatalf("unexpected reason: %s", reason)
	}
}

func TestEvaluateOpportunityListingAvailabilityMarkerDetection(t *testing.T) {
	body := "<html><body>Ops! Este anúncio não está mais disponível.</body></html>"
	unavailable, reason := evaluateOpportunityListingAvailability(
		200,
		"https://www.zapimoveis.com.br/imovel/venda-apartamento-id-123/",
		body,
	)
	if !unavailable {
		t.Fatal("expected listing to be unavailable when body marker exists")
	}
	if reason != "unavailable_marker" {
		t.Fatalf("unexpected reason: %s", reason)
	}
}

func TestEvaluateOpportunityListingAvailabilityKeepsValidListing(t *testing.T) {
	body := "<html><body>Apartamento com 2 quartos no bairro Batel.</body></html>"
	unavailable, reason := evaluateOpportunityListingAvailability(
		200,
		"https://www.zapimoveis.com.br/imovel/venda-apartamento-id-123/",
		body,
	)
	if unavailable {
		t.Fatalf("expected listing to be available, got reason=%s", reason)
	}
	if reason != "" {
		t.Fatalf("expected empty reason for available listing, got %s", reason)
	}
}

func TestNormalizeOpportunityCheckText(t *testing.T) {
	normalized := normalizeOpportunityCheckText("  anúncio   NÃO   encontrado ")
	if normalized != "anuncio nao encontrado" {
		t.Fatalf("unexpected normalized text: %q", normalized)
	}
}
