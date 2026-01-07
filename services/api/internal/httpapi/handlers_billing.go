package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Tier limits matching packages/shared TIER_LIMITS
type tierLimits struct {
	MaxWorkspaces           int   `json:"max_workspaces"`
	MaxProspectsPerMonth    int   `json:"max_prospects_per_month"`
	MaxSnapshotsPerMonth    int   `json:"max_snapshots_per_month"`
	MaxDocsPerMonth         int   `json:"max_docs_per_month"`
	MaxURLImportsPerMonth   int   `json:"max_url_imports_per_month"`
	MaxStorageBytes         int64 `json:"max_storage_bytes"`
	MaxSuppliers            int   `json:"max_suppliers"` // Total per workspace (not monthly)
}

var tierLimitsMap = map[string]tierLimits{
	"starter": {
		MaxWorkspaces:         1,
		MaxProspectsPerMonth:  50,
		MaxSnapshotsPerMonth:  30,
		MaxDocsPerMonth:       5,
		MaxURLImportsPerMonth: 5,
		MaxStorageBytes:       100 * 1024 * 1024, // 100MB
		MaxSuppliers:          10,
	},
	"pro": {
		MaxWorkspaces:         3,
		MaxProspectsPerMonth:  300,
		MaxSnapshotsPerMonth:  200,
		MaxDocsPerMonth:       50,
		MaxURLImportsPerMonth: 50,
		MaxStorageBytes:       2 * 1024 * 1024 * 1024, // 2GB
		MaxSuppliers:          50,
	},
	"growth": {
		MaxWorkspaces:         10,
		MaxProspectsPerMonth:  999999, // Unlimited
		MaxSnapshotsPerMonth:  999999, // Unlimited
		MaxDocsPerMonth:       200,
		MaxURLImportsPerMonth: 999999, // Unlimited
		MaxStorageBytes:       20 * 1024 * 1024 * 1024, // 20GB
		MaxSuppliers:          999999,                   // Unlimited
	},
}

// Feature access by tier
func canAccessFinancing(tier string) bool {
	return tier == "pro" || tier == "growth"
}

func canAccessFlipScoreV1(tier string) bool {
	return tier == "pro" || tier == "growth"
}

// User billing record
type userBilling struct {
	UserID               string     `json:"user_id"`
	Tier                 string     `json:"tier"`
	Status               string     `json:"status"`
	StripeCustomerID     *string    `json:"stripe_customer_id"`
	StripeSubscriptionID *string    `json:"stripe_subscription_id"`
	StripePriceID        *string    `json:"stripe_price_id"`
	CurrentPeriodStart   *time.Time `json:"current_period_start"`
	CurrentPeriodEnd     *time.Time `json:"current_period_end"`
	TrialEnd             *time.Time `json:"trial_end"`
	CancelAtPeriodEnd    bool       `json:"cancel_at_period_end"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type userEntitlements struct {
	Billing              userBilling `json:"billing"`
	Limits               tierLimits  `json:"limits"`
	IsSubscribed         bool        `json:"is_subscribed"`
	CanAccessFinancing   bool        `json:"can_access_financing"`
	CanAccessFlipScoreV1 bool        `json:"can_access_flip_score_v1"`
}

// GET /api/v1/billing/me
func (a *api) handleGetBillingMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Try to get existing billing record
	billing, err := a.getUserBilling(r.Context(), userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Auto-create billing record with 7-day trial
			billing, err = a.createDefaultBilling(r.Context(), userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create billing record"})
				return
			}
		} else {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch billing"})
			return
		}
	}

	limits := tierLimitsMap[billing.Tier]
	if limits.MaxWorkspaces == 0 {
		limits = tierLimitsMap["starter"]
	}

	isSubscribed := billing.Status == "active" || billing.Status == "trialing"

	entitlements := userEntitlements{
		Billing:              billing,
		Limits:               limits,
		IsSubscribed:         isSubscribed,
		CanAccessFinancing:   canAccessFinancing(billing.Tier),
		CanAccessFlipScoreV1: canAccessFlipScoreV1(billing.Tier),
	}

	writeJSON(w, http.StatusOK, entitlements)
}

func (a *api) getUserBilling(ctx context.Context, userID string) (userBilling, error) {
	var b userBilling
	var stripeCustomerID, stripeSubscriptionID, stripePriceID sql.NullString
	var currentPeriodStart, currentPeriodEnd, trialEnd sql.NullTime

	err := a.db.QueryRowContext(
		ctx,
		`SELECT user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
		        current_period_start, current_period_end, trial_end, cancel_at_period_end,
		        created_at, updated_at
		 FROM user_billing
		 WHERE user_id = $1`,
		userID,
	).Scan(
		&b.UserID, &b.Tier, &b.Status,
		&stripeCustomerID, &stripeSubscriptionID, &stripePriceID,
		&currentPeriodStart, &currentPeriodEnd, &trialEnd,
		&b.CancelAtPeriodEnd, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return userBilling{}, err
	}

	if stripeCustomerID.Valid {
		b.StripeCustomerID = &stripeCustomerID.String
	}
	if stripeSubscriptionID.Valid {
		b.StripeSubscriptionID = &stripeSubscriptionID.String
	}
	if stripePriceID.Valid {
		b.StripePriceID = &stripePriceID.String
	}
	if currentPeriodStart.Valid {
		b.CurrentPeriodStart = &currentPeriodStart.Time
	}
	if currentPeriodEnd.Valid {
		b.CurrentPeriodEnd = &currentPeriodEnd.Time
	}
	if trialEnd.Valid {
		b.TrialEnd = &trialEnd.Time
	}

	return b, nil
}

func (a *api) createDefaultBilling(ctx context.Context, userID string) (userBilling, error) {
	var b userBilling
	var trialEnd sql.NullTime

	err := a.db.QueryRowContext(
		ctx,
		`INSERT INTO user_billing (user_id, tier, status, trial_end)
		 VALUES ($1, 'pro', 'trialing', NOW() + INTERVAL '7 days')
		 ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		 RETURNING user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
		           current_period_start, current_period_end, trial_end, cancel_at_period_end,
		           created_at, updated_at`,
		userID,
	).Scan(
		&b.UserID, &b.Tier, &b.Status,
		new(sql.NullString), new(sql.NullString), new(sql.NullString),
		new(sql.NullTime), new(sql.NullTime), &trialEnd,
		&b.CancelAtPeriodEnd, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return userBilling{}, err
	}

	if trialEnd.Valid {
		b.TrialEnd = &trialEnd.Time
	}

	return b, nil
}

// Internal endpoints (protected by X-Internal-Secret header)

type syncBillingRequest struct {
	UserID               string  `json:"user_id"`
	Tier                 string  `json:"tier"`
	Status               string  `json:"status"`
	StripeCustomerID     string  `json:"stripe_customer_id"`
	StripeSubscriptionID string  `json:"stripe_subscription_id"`
	StripePriceID        string  `json:"stripe_price_id"`
	CurrentPeriodStart   *string `json:"current_period_start"`
	CurrentPeriodEnd     *string `json:"current_period_end"`
	TrialEnd             *string `json:"trial_end"`
	CancelAtPeriodEnd    bool    `json:"cancel_at_period_end"`
}

// POST /api/v1/internal/billing/sync
func (a *api) handleInternalBillingSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req syncBillingRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate required fields
	if req.UserID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "user_id is required"})
		return
	}

	validTiers := map[string]bool{"starter": true, "pro": true, "growth": true}
	if !validTiers[req.Tier] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid tier"})
		return
	}

	validStatuses := map[string]bool{
		"active": true, "trialing": true, "canceled": true,
		"past_due": true, "unpaid": true, "incomplete": true, "incomplete_expired": true,
	}
	if !validStatuses[req.Status] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid status"})
		return
	}

	// Parse timestamps
	var currentPeriodStart, currentPeriodEnd, trialEnd *time.Time
	if req.CurrentPeriodStart != nil && *req.CurrentPeriodStart != "" {
		t, err := time.Parse(time.RFC3339, *req.CurrentPeriodStart)
		if err == nil {
			currentPeriodStart = &t
		}
	}
	if req.CurrentPeriodEnd != nil && *req.CurrentPeriodEnd != "" {
		t, err := time.Parse(time.RFC3339, *req.CurrentPeriodEnd)
		if err == nil {
			currentPeriodEnd = &t
		}
	}
	if req.TrialEnd != nil && *req.TrialEnd != "" {
		t, err := time.Parse(time.RFC3339, *req.TrialEnd)
		if err == nil {
			trialEnd = &t
		}
	}

	// Upsert billing record
	var b userBilling
	var dbTrialEnd sql.NullTime
	err := a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO user_billing (
			user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
			current_period_start, current_period_end, trial_end, cancel_at_period_end, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			tier = EXCLUDED.tier,
			status = EXCLUDED.status,
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			stripe_subscription_id = EXCLUDED.stripe_subscription_id,
			stripe_price_id = EXCLUDED.stripe_price_id,
			current_period_start = EXCLUDED.current_period_start,
			current_period_end = EXCLUDED.current_period_end,
			trial_end = EXCLUDED.trial_end,
			cancel_at_period_end = EXCLUDED.cancel_at_period_end,
			updated_at = NOW()
		RETURNING user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
		          current_period_start, current_period_end, trial_end, cancel_at_period_end,
		          created_at, updated_at`,
		req.UserID, req.Tier, req.Status, req.StripeCustomerID, req.StripeSubscriptionID, req.StripePriceID,
		currentPeriodStart, currentPeriodEnd, trialEnd, req.CancelAtPeriodEnd,
	).Scan(
		&b.UserID, &b.Tier, &b.Status,
		new(sql.NullString), new(sql.NullString), new(sql.NullString),
		new(sql.NullTime), new(sql.NullTime), &dbTrialEnd,
		&b.CancelAtPeriodEnd, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to upsert billing"})
		return
	}

	// Re-fetch the full record to return
	billing, err := a.getUserBilling(r.Context(), req.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch billing after upsert"})
		return
	}

	writeJSON(w, http.StatusOK, billing)
}

type overrideBillingRequest struct {
	UserID string `json:"user_id"`
	Tier   string `json:"tier"`
}

// POST /api/v1/internal/billing/override (dev only)
func (a *api) handleInternalBillingOverride(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req overrideBillingRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	if req.UserID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "user_id is required"})
		return
	}

	validTiers := map[string]bool{"starter": true, "pro": true, "growth": true}
	if !validTiers[req.Tier] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid tier"})
		return
	}

	// Upsert with override
	_, err := a.db.ExecContext(
		r.Context(),
		`INSERT INTO user_billing (user_id, tier, status)
		 VALUES ($1, $2, 'active')
		 ON CONFLICT (user_id) DO UPDATE SET
			tier = EXCLUDED.tier,
			status = 'active',
			updated_at = NOW()`,
		req.UserID, req.Tier,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to override billing"})
		return
	}

	// Fetch and return
	billing, err := a.getUserBilling(r.Context(), req.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch billing after override"})
		return
	}

	writeJSON(w, http.StatusOK, billing)
}

// Internal secret middleware
func internalSecretMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret := r.Header.Get("X-Internal-Secret")
		expected := os.Getenv("INTERNAL_API_SECRET")

		if expected == "" {
			writeError(w, http.StatusForbidden, apiError{
				Code:    "FORBIDDEN",
				Message: "internal API not configured",
			})
			return
		}

		if secret == "" || secret != expected {
			writeError(w, http.StatusForbidden, apiError{
				Code:    "FORBIDDEN",
				Message: "invalid internal secret",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// handleBillingSubroutes handles /api/v1/billing/* routes
func (a *api) handleBillingSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/billing/")

	switch rest {
	case "me":
		a.handleGetBillingMe(w, r)
		return
	case "me/usage":
		a.handleGetUserUsage(w, r)
		return
	default:
		w.WriteHeader(http.StatusNotFound)
		return
	}
}

// handleInternalBillingSubroutes handles /api/v1/internal/billing/* routes
func (a *api) handleInternalBillingSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/internal/billing/")

	switch rest {
	case "sync":
		a.handleInternalBillingSync(w, r)
		return
	case "override":
		a.handleInternalBillingOverride(w, r)
		return
	default:
		w.WriteHeader(http.StatusNotFound)
		return
	}
}
