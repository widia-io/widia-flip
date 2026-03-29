package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestHandleAdminMetricsUsersTrialExpiredReturnsEngagementFields(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	now := time.Now().UTC()
	trialEnd := now.Add(-48 * time.Hour)
	createdAt := now.Add(-30 * 24 * time.Hour)
	updatedAt := now.Add(-2 * time.Hour)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT
			u.id,
			u.email,
			u.name,`)).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"email",
			"name",
			"tier",
			"status",
			"trial_end",
			"phone",
			"marketing_opt_in",
			"marketing_opt_out",
			"workspace_count",
			"prospects_count",
			"snapshots_count",
			"engagement_bucket",
			"created_at",
			"updated_at",
		}).AddRow(
			"user-1",
			"lead@example.com",
			"Lead Teste",
			"starter",
			"canceled",
			trialEnd,
			"41999998888",
			true,
			false,
			1,
			3,
			1,
			"engaged",
			createdAt,
			updatedAt,
		))

	a := &api{db: db}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/metrics/users?category=trial_expired", nil)
	rr := httptest.NewRecorder()

	a.handleAdminMetricsUsers(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var payload listMetricsUsersResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json.Unmarshal: %v body=%s", err, rr.Body.String())
	}

	if payload.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("unexpected payload totals: %+v", payload)
	}

	user := payload.Items[0]
	if user.Phone == nil || *user.Phone != "41999998888" {
		t.Fatalf("phone=%v want=41999998888", user.Phone)
	}
	if !user.MarketingOptIn || user.MarketingOptOut {
		t.Fatalf("unexpected marketing flags: %+v", user)
	}
	if user.WorkspaceCount != 1 || user.ProspectsCount != 3 || user.SnapshotsCount != 1 {
		t.Fatalf("unexpected usage counts: %+v", user)
	}
	if user.EngagementBucket == nil || *user.EngagementBucket != "engaged" {
		t.Fatalf("engagementBucket=%v want=engaged", user.EngagementBucket)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet: %v", err)
	}
}

func TestResolveAudienceRecipientsCalculatorLeadsHotPrioritizesUsersAndDedupes(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, COALESCE(NULLIF(name, ''), email) AS name, marketing_opt_in_at, "createdAt"`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "marketing_opt_in_at", "createdAt",
		}).
			AddRow("user-1", "same@example.com", "User Same", now, now).
			AddRow("user-2", "other@example.com", "User Other", now, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT
			u.id,
			u.email,
			COALESCE(NULLIF(u.name, ''), u.email) AS name,`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "marketing_opt_in_at", "createdAt",
		}))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, name, updated_at, created_at`)).
		WithArgs(hotCalculatorLeadMinROI).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "updated_at", "created_at",
		}).
			AddRow("calc-1", "same@example.com", "Lead Same", now, now).
			AddRow("calc-2", "hot@example.com", "Lead Hot", now, now).
			AddRow("calc-3", "hot@example.com", "Lead Hot Dup", now, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, email AS name, created_at, created_at`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "created_at", "created_at",
		}).AddRow("ebook-1", "ebook@example.com", "ebook@example.com", now, now))

	a := &api{db: db}
	recipients, _, _, _, err := a.resolveAudienceRecipients(t.Context(), emailAudienceCalculatorLeadsHot)
	if err != nil {
		t.Fatalf("resolveAudienceRecipients: %v", err)
	}

	if len(recipients) != 2 {
		t.Fatalf("len(recipients)=%d want=2 recipients=%+v", len(recipients), recipients)
	}
	if recipients[0].Source != emailRecipientSourceUser || recipients[0].UserID == nil || *recipients[0].UserID != "user-1" {
		t.Fatalf("first recipient=%+v want user-1 source=user", recipients[0])
	}
	if recipients[1].Source != emailRecipientSourceCalculatorLead || recipients[1].CalculatorLeadID == nil || *recipients[1].CalculatorLeadID != "calc-2" {
		t.Fatalf("second recipient=%+v want calc-2 source=calculator_lead", recipients[1])
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet: %v", err)
	}
}

func TestHandleQueueCampaignTrialExpiredEngagedQueuesResolvedRecipients(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT status, audience_key FROM email_campaigns WHERE id = $1`)).
		WithArgs("camp-1").
		WillReturnRows(sqlmock.NewRows([]string{"status", "audience_key"}).
			AddRow("draft", emailAudienceTrialExpiredEngaged))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, COALESCE(NULLIF(name, ''), email) AS name, marketing_opt_in_at, "createdAt"`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "marketing_opt_in_at", "createdAt",
		}))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT
			u.id,
			u.email,
			COALESCE(NULLIF(u.name, ''), u.email) AS name,`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "marketing_opt_in_at", "createdAt",
		}).AddRow("user-expired-1", "expired@example.com", "Expired User", now, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, name, updated_at, created_at`)).
		WithArgs(hotCalculatorLeadMinROI).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "updated_at", "created_at",
		}))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, email, email AS name, created_at, created_at`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "name", "created_at", "created_at",
		}))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "user"
			SET unsubscribe_token = COALESCE(unsubscribe_token, $2)
			WHERE id = $1`)).
		WithArgs("user-expired-1", sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO email_sends (campaign_id, user_id, ebook_lead_id, calculator_lead_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING`)).
		WithArgs("camp-1", "user-expired-1", nil, nil).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE email_campaigns
		SET status = 'queued', queued_at = now(), recipient_count = $2
		WHERE id = $1`)).
		WithArgs("camp-1", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	a := &api{db: db}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/email/campaigns/camp-1/queue", nil)
	rr := httptest.NewRecorder()

	a.handleQueueCampaign(rr, req, "camp-1")

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d want=%d body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}

	var payload queueCampaignResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json.Unmarshal: %v body=%s", err, rr.Body.String())
	}
	if payload.RecipientCount != 1 {
		t.Fatalf("RecipientCount=%d want=1", payload.RecipientCount)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet: %v", err)
	}
}
