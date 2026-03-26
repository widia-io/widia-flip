package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

func TestHandleGetBillingMeCreatesFreeBillingByDefault(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	now := time.Now().UTC()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
		        current_period_start, current_period_end, trial_end, cancel_at_period_end,
		        created_at, updated_at
		 FROM user_billing
		 WHERE user_id = $1`)).
		WithArgs("user-free").
		WillReturnError(sql.ErrNoRows)

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO user_billing (user_id, tier, status, trial_end)
		 VALUES ($1, 'free', 'active', NULL)
		 ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		 RETURNING user_id, tier, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
		           current_period_start, current_period_end, trial_end, cancel_at_period_end,
		           created_at, updated_at`)).
		WithArgs("user-free").
		WillReturnRows(sqlmock.NewRows([]string{
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
		}).AddRow("user-free", "free", "active", nil, nil, nil, nil, nil, nil, false, now, now))

	a := &api{db: db}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/billing/me", nil)
	req = req.WithContext(auth.ContextWithUserID(req.Context(), "user-free"))
	rr := httptest.NewRecorder()

	a.handleGetBillingMe(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var payload userEntitlements
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json.Unmarshal: %v body=%s", err, rr.Body.String())
	}

	if payload.Billing.Tier != "free" {
		t.Fatalf("tier=%s want=free", payload.Billing.Tier)
	}
	if payload.Billing.Status != "active" {
		t.Fatalf("status=%s want=active", payload.Billing.Status)
	}
	if payload.Billing.TrialEnd != nil {
		t.Fatalf("trial_end=%v want=nil", payload.Billing.TrialEnd)
	}
	if payload.IsSubscribed {
		t.Fatalf("is_subscribed=true want=false")
	}
	if payload.Limits.MaxWorkspaces != 1 || payload.Limits.MaxProspectsPerMonth != 5 {
		t.Fatalf("unexpected free limits: %+v", payload.Limits)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
