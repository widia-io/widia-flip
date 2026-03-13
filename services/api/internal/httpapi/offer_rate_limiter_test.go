package httpapi

import "testing"

func TestOfferRateLimiterAllowsUntilLimit(t *testing.T) {
	limiter := newOfferRateLimiter()
	workspaceID := "w1"

	for i := 0; i < 3; i++ {
		allowed, retryAfter := limiter.Allow(workspaceID, 3)
		if !allowed {
			t.Fatalf("request %d should be allowed, retry_after=%d", i+1, retryAfter)
		}
	}

	allowed, retryAfter := limiter.Allow(workspaceID, 3)
	if allowed {
		t.Fatalf("expected request above limit to be blocked")
	}
	if retryAfter <= 0 {
		t.Fatalf("expected positive retry_after, got %d", retryAfter)
	}
}

func TestOfferRateLimiterUsesDefaultLimitWhenNonPositive(t *testing.T) {
	limiter := newOfferRateLimiter()
	workspaceID := "w2"

	for i := 0; i < 10; i++ {
		allowed, _ := limiter.Allow(workspaceID, 0)
		if !allowed {
			t.Fatalf("request %d should be allowed with default limit", i+1)
		}
	}

	allowed, _ := limiter.Allow(workspaceID, 0)
	if allowed {
		t.Fatalf("request above default limit should be blocked")
	}
}
