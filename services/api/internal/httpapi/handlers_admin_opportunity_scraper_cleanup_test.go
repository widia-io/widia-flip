package httpapi

import (
	"net/http"
	"testing"
	"time"
)

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

func TestParseRetryAfterDurationSeconds(t *testing.T) {
	got := parseRetryAfterDuration("12", time.Date(2026, time.March, 4, 12, 0, 0, 0, time.UTC))
	if got != 12*time.Second {
		t.Fatalf("expected 12s, got %s", got)
	}
}

func TestParseRetryAfterDurationHTTPDate(t *testing.T) {
	gmt := time.FixedZone("GMT", 0)
	now := time.Date(2026, time.March, 4, 12, 0, 0, 0, gmt)
	retryAfter := now.Add(35 * time.Second).Format(http.TimeFormat)
	got := parseRetryAfterDuration(retryAfter, now)
	if got < 34*time.Second || got > 36*time.Second {
		t.Fatalf("expected about 35s, got %s", got)
	}
}

func TestComputeOpportunityCleanupBackoffUsesRetryAfter(t *testing.T) {
	got := computeOpportunityCleanupBackoff(1, 20*time.Second)
	if got != 20*time.Second {
		t.Fatalf("expected retry-after to win (20s), got %s", got)
	}
}

func TestComputeOpportunityCleanupBackoffCapsAtMax(t *testing.T) {
	got := computeOpportunityCleanupBackoff(10, 0)
	if got != opportunityCleanupBackoffMax {
		t.Fatalf("expected max backoff %s, got %s", opportunityCleanupBackoffMax, got)
	}
}
