package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestHandleAdminFunnelDailyDedupesWindowAndWarnsOnLegacyData(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Fatalf("LoadLocation: %v", err)
	}
	_, _, dayKeys := buildAdminFunnelWindow(7, location)
	latestDay, err := time.ParseInLocation("2006-01-02", dayKeys[len(dayKeys)-1], location)
	if err != nil {
		t.Fatalf("ParseInLocation: %v", err)
	}

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id::text,")).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"event_name",
			"day",
			"session_id",
			"user_id",
			"request_id",
		}).
			AddRow("evt-1", "home_view", latestDay, "sess-home", nil, nil).
			AddRow("evt-2", "home_view", latestDay, "sess-home", nil, nil).
			AddRow("evt-3", "signup_started", latestDay, "sess-home", nil, nil).
			AddRow("evt-4", "offer_intelligence_generated", latestDay, "sess-offer-1", "user-1", "req-1").
			AddRow("evt-5", "offer_intelligence_paywall_viewed", latestDay, "srv_legacy_a", "user-1", nil).
			AddRow("evt-6", "offer_intelligence_paywall_viewed", latestDay, "srv_legacy_b", "user-1", nil).
			AddRow("evt-7", "offer_intelligence_upgrade_cta_clicked", latestDay, "sess-offer-1", "user-1", "req-1"))

	a := &api{db: db}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/funnel/daily?days=7", nil)

	a.handleAdminFunnelDaily(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	resp := decodeAdminFunnelDailyResponse(t, rr)
	if resp.Totals.HomeViews != 1 {
		t.Fatalf("totals.homeViews=%d want=1", resp.Totals.HomeViews)
	}
	if resp.RawTotals.HomeViews != 2 {
		t.Fatalf("rawTotals.homeViews=%d want=2", resp.RawTotals.HomeViews)
	}
	if resp.DuplicateDeltas.HomeViews != 1 {
		t.Fatalf("duplicateDeltas.homeViews=%d want=1", resp.DuplicateDeltas.HomeViews)
	}
	if resp.Totals.OfferIntelligenceGenerated != 1 {
		t.Fatalf("totals.offerIntelligenceGenerated=%d want=1", resp.Totals.OfferIntelligenceGenerated)
	}
	if resp.Totals.OfferIntelligencePaywallViewed != 2 {
		t.Fatalf("totals.offerIntelligencePaywallViewed=%d want=2", resp.Totals.OfferIntelligencePaywallViewed)
	}
	if resp.Rates.OfferGeneratedToPaywallPct != 200 {
		t.Fatalf("rates.offerGeneratedToPaywallPct=%v want=200", resp.Rates.OfferGeneratedToPaywallPct)
	}
	if len(resp.Warnings) != 3 {
		t.Fatalf("warnings=%d want=3 body=%s", len(resp.Warnings), rr.Body.String())
	}
	if !strings.Contains(strings.Join(resp.Warnings, " "), "jornadas únicas") {
		t.Fatalf("expected duplicate warning in %v", resp.Warnings)
	}
	if !strings.Contains(strings.Join(resp.Warnings, " "), "ocultados no painel") {
		t.Fatalf("expected impossible-rate warning in %v", resp.Warnings)
	}
	if !strings.Contains(strings.Join(resp.Warnings, " "), "session_id sintético") {
		t.Fatalf("expected legacy session warning in %v", resp.Warnings)
	}
	if len(resp.Items) != 7 {
		t.Fatalf("items=%d want=7", len(resp.Items))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet: %v", err)
	}
}

func TestBuildAdminFunnelRatesHandlesZeroDenominator(t *testing.T) {
	rates := buildAdminFunnelRates(adminFunnelCounts{})

	if rates.HomeToSignupStartPct != 0 ||
		rates.SignupStartToCompletePct != 0 ||
		rates.SignupCompleteToLoginPct != 0 ||
		rates.LoginToFirstSnapshotPct != 0 ||
		rates.HomeToFirstSnapshotPct != 0 ||
		rates.CalculatorToSaveClickPct != 0 ||
		rates.CalculatorToReportReqPct != 0 ||
		rates.OfferGeneratedToSavedPct != 0 ||
		rates.OfferGeneratedToPaywallPct != 0 ||
		rates.OfferPaywallToUpgradePct != 0 {
		t.Fatalf("expected zero rates when denominator is zero: %+v", rates)
	}
}

func decodeAdminFunnelDailyResponse(t *testing.T, rr *httptest.ResponseRecorder) adminFunnelDailyResponse {
	t.Helper()

	var payload adminFunnelDailyResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode admin funnel payload: %v body=%s", err, rr.Body.String())
	}
	return payload
}
