package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/offerintelligence"
)

func TestHandleOfferIntelligenceGenerateTenantIsolation(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID     = "user-1"
		prospectID = "prospect-1"
	)

	mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
		WithArgs(prospectID, userID).
		WillReturnError(sql.ErrNoRows)

	rr := httptest.NewRecorder()
	req := authedJSONRequest(http.MethodPost, "/api/v1/prospects/"+prospectID+"/offer-intelligence/generate", `{}`, userID)

	a.handleOfferIntelligenceGenerate(rr, req, prospectID)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}

	if got := decodeAPIErrorCode(t, rr); got != "NOT_FOUND" {
		t.Fatalf("error.code=%s want=NOT_FOUND", got)
	}
}

func TestHandleOfferIntelligenceGenerateMissingCriticalInputs(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID      = "user-1"
		prospectID  = "prospect-1"
		workspaceID = "workspace-1"
	)

	mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
		WithArgs(prospectID, userID).
		WillReturnRows(prospectRows(prospectID, workspaceID, nil))

	mock.ExpectQuery(regexp.QuoteMeta("FROM workspace_settings")).
		WithArgs(workspaceID).
		WillReturnRows(workspaceSettingsRows(10, nil))

	expectFunnelEventInsert(mock)

	rr := httptest.NewRecorder()
	req := authedJSONRequest(http.MethodPost, "/api/v1/prospects/"+prospectID+"/offer-intelligence/generate", `{}`, userID)

	a.handleOfferIntelligenceGenerate(rr, req, prospectID)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if got := decodeAPIErrorCode(t, rr); got != "VALIDATION_ERROR" {
		t.Fatalf("error.code=%s want=VALIDATION_ERROR", got)
	}
	if !strings.Contains(rr.Body.String(), "expected_sale_price") {
		t.Fatalf("expected missing field expected_sale_price in body=%s", rr.Body.String())
	}
}

func TestHandleOfferIntelligenceGenerateRateLimited(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID      = "user-1"
		prospectID  = "prospect-1"
		workspaceID = "workspace-1"
	)

	// Consume one slot so next call with limit=1 returns 429.
	allowed, _ := a.offerLimiter.Allow(workspaceID, 1)
	if !allowed {
		t.Fatalf("expected pre-warm limiter call to be allowed")
	}

	mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
		WithArgs(prospectID, userID).
		WillReturnRows(prospectRows(prospectID, workspaceID, float64Ptr(460000)))

	mock.ExpectQuery(regexp.QuoteMeta("FROM workspace_settings")).
		WithArgs(workspaceID).
		WillReturnRows(workspaceSettingsRows(1, nil))

	expectFunnelEventInsert(mock)

	rr := httptest.NewRecorder()
	req := authedJSONRequest(http.MethodPost, "/api/v1/prospects/"+prospectID+"/offer-intelligence/generate", `{}`, userID)

	a.handleOfferIntelligenceGenerate(rr, req, prospectID)

	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusTooManyRequests, rr.Body.String())
	}
	if got := decodeAPIErrorCode(t, rr); got != "RATE_LIMITED" {
		t.Fatalf("error.code=%s want=RATE_LIMITED", got)
	}
	if retryAfter := rr.Header().Get("Retry-After"); retryAfter == "" {
		t.Fatalf("expected Retry-After header")
	}
}

func TestHandleOfferIntelligenceSaveAppendOnly(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID       = "user-1"
		ownerUserID  = "owner-1"
		prospectID   = "prospect-1"
		workspaceID  = "workspace-1"
		requestPath  = "/api/v1/prospects/prospect-1/offer-intelligence/save"
		insertResult = "INSERT INTO offer_recommendations"
	)

	now := time.Now().UTC()
	firstID := ""
	secondID := ""

	for i, generatedID := range []string{"offer-rec-1", "offer-rec-2"} {
		mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
			WithArgs(prospectID, userID).
			WillReturnRows(prospectRows(prospectID, workspaceID, float64Ptr(460000)))

		mock.ExpectQuery(regexp.QuoteMeta("FROM workspace_settings")).
			WithArgs(workspaceID).
			WillReturnRows(workspaceSettingsRows(10, nil))

		mock.ExpectQuery(regexp.QuoteMeta(insertResult)).
			WithArgs(
				sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
				sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
				sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(),
			).
			WillReturnRows(sqlmock.NewRows([]string{"id", "created_at"}).AddRow(generatedID, now.Add(time.Duration(i)*time.Minute)))

		mock.ExpectQuery(regexp.QuoteMeta("SELECT created_by_user_id FROM workspaces WHERE id = $1")).
			WithArgs(workspaceID).
			WillReturnRows(sqlmock.NewRows([]string{"created_by_user_id"}).AddRow(ownerUserID))

		mock.ExpectQuery(regexp.QuoteMeta("FROM user_billing")).
			WithArgs(ownerUserID).
			WillReturnRows(userBillingRows(ownerUserID, "pro", "active"))

		expectFunnelEventInsert(mock)

		rr := httptest.NewRecorder()
		req := authedJSONRequest(http.MethodPost, requestPath, `{}`, userID)
		a.handleOfferIntelligenceSave(rr, req, prospectID)

		if rr.Code != http.StatusOK {
			t.Fatalf("save #%d status=%d want=%d body=%s", i+1, rr.Code, http.StatusOK, rr.Body.String())
		}

		resp := decodeSaveResponse(t, rr)
		if i == 0 {
			firstID = resp.OfferRecommendationID
		} else {
			secondID = resp.OfferRecommendationID
		}
	}

	if firstID == "" || secondID == "" {
		t.Fatalf("expected both recommendation ids to be populated")
	}
	if firstID == secondID {
		t.Fatalf("expected append-only saves to create unique ids; got duplicated id=%s", firstID)
	}
}

func TestHandleOfferIntelligenceHistoryCursorAndStaleness(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID      = "user-1"
		ownerUserID = "owner-1"
		prospectID  = "prospect-1"
		workspaceID = "workspace-1"
	)

	mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
		WithArgs(prospectID, userID).
		WillReturnRows(prospectRows(prospectID, workspaceID, float64Ptr(460000)))

	mock.ExpectQuery(regexp.QuoteMeta("FROM workspace_settings")).
		WithArgs(workspaceID).
		WillReturnRows(workspaceSettingsRows(10, nil))

	mock.ExpectQuery(regexp.QuoteMeta("SELECT created_by_user_id FROM workspaces WHERE id = $1")).
		WithArgs(workspaceID).
		WillReturnRows(sqlmock.NewRows([]string{"created_by_user_id"}).AddRow(ownerUserID))

	mock.ExpectQuery(regexp.QuoteMeta("FROM user_billing")).
		WithArgs(ownerUserID).
		WillReturnRows(userBillingRows(ownerUserID, "pro", "active"))

	historyPayload := []byte(`{
		"reason_labels":["Margem abaixo do mínimo configurado"],
		"scenarios":[{"key":"recommended","offer_price":250000,"net_profit":50000,"roi":20,"margin":10,"break_even_sale_price":300000}],
		"message_templates":{"short":"msg short","full":"msg full"},
		"assumptions":["Prazo da operação assumido em 6 meses (padrão)"],
		"defaults_used":["Prazo da operação (meses)"]
	}`)

	tNewest := time.Date(2026, 3, 4, 12, 0, 0, 0, time.UTC)
	tOlder := tNewest.Add(-time.Hour)
	mock.ExpectQuery(regexp.QuoteMeta("FROM offer_recommendations")).
		WithArgs(workspaceID, prospectID, 2).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"formula_version",
			"decision",
			"confidence",
			"confidence_bucket",
			"reason_codes",
			"recommended_offer_price",
			"recommended_margin",
			"recommended_net_profit",
			"input_hash",
			"settings_hash",
			"outputs_json",
			"created_at",
		}).
			AddRow("offer-rec-2", "offer-intelligence-v0", "REVIEW", 0.62, "medium", "{LOW_MARGIN}", 250000.00, 10.00, 50000.00, "input-old-1", "settings-old-1", historyPayload, tNewest).
			AddRow("offer-rec-1", "offer-intelligence-v0", "REVIEW", 0.61, "medium", "{LOW_MARGIN}", 248000.00, 9.80, 48000.00, "input-old-2", "settings-old-2", historyPayload, tOlder))

	rr := httptest.NewRecorder()
	req := authedJSONRequest(http.MethodGet, "/api/v1/prospects/"+prospectID+"/offer-intelligence/history?limit=1", "", userID)
	a.handleOfferIntelligenceHistory(rr, req, prospectID)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	resp := decodeHistoryResponse(t, rr)
	if len(resp.Items) != 1 {
		t.Fatalf("items=%d want=1", len(resp.Items))
	}
	if resp.NextCursor == nil || *resp.NextCursor == "" {
		t.Fatalf("expected next_cursor for paginated response")
	}
	if !resp.Items[0].IsStale {
		t.Fatalf("expected stale item=true")
	}
	if resp.Items[0].StaleReason == nil || *resp.Items[0].StaleReason != string(offerintelligence.StaleReasonFormulaChanged) {
		t.Fatalf("stale_reason=%v want=%s", resp.Items[0].StaleReason, offerintelligence.StaleReasonFormulaChanged)
	}
}

func TestHandleOfferIntelligenceHistoryPaywallAfterFirstPreview(t *testing.T) {
	a, mock, cleanup := newOfferIntelligenceTestAPI(t)
	defer cleanup()

	const (
		userID      = "user-1"
		ownerUserID = "owner-1"
		prospectID  = "prospect-1"
		workspaceID = "workspace-1"
	)

	consumedAt := time.Now().UTC().Add(-2 * time.Hour)

	mock.ExpectQuery(regexp.QuoteMeta("FROM prospecting_properties p")).
		WithArgs(prospectID, userID).
		WillReturnRows(prospectRows(prospectID, workspaceID, float64Ptr(460000)))

	mock.ExpectQuery(regexp.QuoteMeta("FROM workspace_settings")).
		WithArgs(workspaceID).
		WillReturnRows(workspaceSettingsRows(10, &consumedAt))

	mock.ExpectQuery(regexp.QuoteMeta("SELECT created_by_user_id FROM workspaces WHERE id = $1")).
		WithArgs(workspaceID).
		WillReturnRows(sqlmock.NewRows([]string{"created_by_user_id"}).AddRow(ownerUserID))

	mock.ExpectQuery(regexp.QuoteMeta("FROM user_billing")).
		WithArgs(ownerUserID).
		WillReturnRows(userBillingRows(ownerUserID, "starter", "trialing"))

	expectFunnelEventInsert(mock)

	rr := httptest.NewRecorder()
	req := authedJSONRequest(http.MethodGet, "/api/v1/prospects/"+prospectID+"/offer-intelligence/history", "", userID)
	a.handleOfferIntelligenceHistory(rr, req, prospectID)

	if rr.Code != StatusPaymentRequired {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, StatusPaymentRequired, rr.Body.String())
	}
	if got := decodeAPIErrorCode(t, rr); got != ErrCodePaywallRequired {
		t.Fatalf("error.code=%s want=%s", got, ErrCodePaywallRequired)
	}
}

func newOfferIntelligenceTestAPI(t *testing.T) (*api, sqlmock.Sqlmock, func()) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}

	instance := &api{
		db:                       db,
		offerIntelligenceRollout: "all",
		offerLimiter:             newOfferRateLimiter(),
	}

	cleanup := func() {
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Fatalf("unmet sql expectations: %v", err)
		}
		_ = db.Close()
	}
	return instance, mock, cleanup
}

func authedJSONRequest(method, path, body, userID string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req.WithContext(auth.ContextWithUserID(req.Context(), userID))
}

func prospectRows(prospectID, workspaceID string, expectedSale *float64) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id",
		"workspace_id",
		"asking_price",
		"area_usable",
		"expected_sale_price",
		"renovation_cost_estimate",
		"hold_months",
		"other_costs_estimate",
		"condo_fee",
		"iptu",
		"offer_price",
		"neighborhood",
		"flip_score",
	}).AddRow(
		prospectID,
		workspaceID,
		300000.00,
		80.00,
		expectedSale,
		40000.00,
		6,
		0.0,
		400.0,
		1200.0,
		nil,
		"Moema",
		80,
	)
}

func workspaceSettingsRows(rateLimit int, consumedAt *time.Time) *sqlmock.Rows {
	var consumedUserID any
	var consumedAtValue any
	if consumedAt != nil {
		consumedAtValue = *consumedAt
		consumedUserID = "user-1"
	}

	return sqlmock.NewRows([]string{
		"itbi_rate",
		"registry_rate",
		"broker_rate",
		"pj_tax_rate",
		"offer_min_margin_pct",
		"offer_min_net_profit_brl",
		"offer_min_confidence",
		"offer_max_risk_score",
		"offer_confidence_weights_json",
		"offer_max_sale_to_ask_ratio",
		"offer_generate_rate_limit_per_min",
		"offer_first_full_preview_consumed_at",
		"offer_first_full_preview_user_id",
	}).AddRow(
		0.03,
		0.01,
		0.06,
		0.15,
		12.0,
		30000.0,
		0.55,
		65.0,
		[]byte(`{"input_quality":0.30,"default_dependency":0.25,"economic_consistency":0.20,"risk_signals":0.15,"market_coverage":0.10}`),
		1.5,
		rateLimit,
		consumedAtValue,
		consumedUserID,
	)
}

func userBillingRows(userID, tier, status string) *sqlmock.Rows {
	now := time.Now().UTC()
	return sqlmock.NewRows([]string{
		"user_id",
		"tier",
		"status",
		"stripe_customer_id",
		"stripe_subscription_id",
		"stripe_price_id",
		"current_period_start",
		"current_period_end",
		"trial_end",
		"cancel_at_period_end",
		"created_at",
		"updated_at",
	}).AddRow(userID, tier, status, nil, nil, nil, nil, nil, nil, false, now, now)
}

func expectFunnelEventInsert(mock sqlmock.Sqlmock) {
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO flip.funnel_events")).
		WithArgs(
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))
}

func decodeAPIErrorCode(t *testing.T, rr *httptest.ResponseRecorder) string {
	t.Helper()

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode error payload: %v body=%s", err, rr.Body.String())
	}
	return payload.Error.Code
}

func decodeSaveResponse(t *testing.T, rr *httptest.ResponseRecorder) offerIntelligenceSaveResponse {
	t.Helper()

	var payload offerIntelligenceSaveResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode save payload: %v body=%s", err, rr.Body.String())
	}
	return payload
}

func decodeHistoryResponse(t *testing.T, rr *httptest.ResponseRecorder) offerIntelligenceHistoryResponse {
	t.Helper()

	var payload offerIntelligenceHistoryResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode history payload: %v body=%s", err, rr.Body.String())
	}
	return payload
}
