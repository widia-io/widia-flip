package httpapi

import (
	"context"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
)

func TestFreeTierWorkspaceLimit(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	a := &api{db: db}
	billing := userBilling{Tier: "free", Status: "active"}

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM workspaces WHERE created_by_user_id = \$1`).
		WithArgs("owner-1").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	allowed, used, limit, tier := a.checkWorkspaceCreationLimit(context.Background(), "owner-1", billing)
	if allowed {
		t.Fatalf("allowed=true want=false")
	}
	if used != 1 || limit != 1 || tier != "free" {
		t.Fatalf("used=%d limit=%d tier=%s", used, limit, tier)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}

func TestFreeTierCreationLimits(t *testing.T) {
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	tests := []struct {
		name          string
		expectQueries func(sqlmock.Sqlmock)
		run           func(*api) (bool, int, int, string)
	}{
		{
			name: "prospects",
			expectQueries: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT current_period_start, current_period_end, status
		 FROM user_billing
		 WHERE user_id = $1`)).
					WithArgs("owner-1").
					WillReturnRows(sqlmock.NewRows([]string{"current_period_start", "current_period_end", "status"}).AddRow(start, end, "active"))
				mock.ExpectQuery(`FROM prospecting_properties`).
					WithArgs("workspace-1").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
			},
			run: func(a *api) (bool, int, int, string) {
				returnValuesAllowed, usage, limit, tier, _, _ := a.checkProspectCreationLimit(context.Background(), "owner-1", "workspace-1", userBilling{Tier: "free", Status: "active"})
				return returnValuesAllowed, usage, limit, tier
			},
		},
		{
			name: "snapshots",
			expectQueries: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT current_period_start, current_period_end, status
		 FROM user_billing
		 WHERE user_id = $1`)).
					WithArgs("owner-1").
					WillReturnRows(sqlmock.NewRows([]string{"current_period_start", "current_period_end", "status"}).AddRow(start, end, "active"))
				mock.ExpectQuery(`FROM analysis_cash_snapshots`).
					WithArgs("workspace-1").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
				mock.ExpectQuery(`FROM analysis_financing_snapshots`).
					WithArgs("workspace-1").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
			},
			run: func(a *api) (bool, int, int, string) {
				returnValuesAllowed, usage, limit, tier, _, _ := a.checkSnapshotCreationLimit(context.Background(), "owner-1", "workspace-1", userBilling{Tier: "free", Status: "active"})
				return returnValuesAllowed, usage, limit, tier
			},
		},
		{
			name: "documents",
			expectQueries: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT current_period_start, current_period_end, status
		 FROM user_billing
		 WHERE user_id = $1`)).
					WithArgs("owner-1").
					WillReturnRows(sqlmock.NewRows([]string{"current_period_start", "current_period_end", "status"}).AddRow(start, end, "active"))
				mock.ExpectQuery(`FROM documents`).
					WithArgs("workspace-1").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
			},
			run: func(a *api) (bool, int, int, string) {
				returnValuesAllowed, usage, limit, tier, _, _ := a.checkDocumentCreationLimit(context.Background(), "owner-1", "workspace-1", userBilling{Tier: "free", Status: "active"})
				return returnValuesAllowed, usage, limit, tier
			},
		},
		{
			name: "url imports",
			expectQueries: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery(regexp.QuoteMeta(`SELECT current_period_start, current_period_end, status
		 FROM user_billing
		 WHERE user_id = $1`)).
					WithArgs("owner-1").
					WillReturnRows(sqlmock.NewRows([]string{"current_period_start", "current_period_end", "status"}).AddRow(start, end, "active"))
				mock.ExpectQuery(`FROM prospecting_properties`).
					WithArgs("workspace-1", start, end).
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
			},
			run: func(a *api) (bool, int, int, string) {
				returnValuesAllowed, usage, limit, tier, _, _ := a.checkURLImportLimit(context.Background(), "owner-1", "workspace-1", userBilling{Tier: "free", Status: "active"})
				return returnValuesAllowed, usage, limit, tier
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			if err != nil {
				t.Fatalf("sqlmock.New: %v", err)
			}
			defer db.Close()

			tt.expectQueries(mock)

			a := &api{db: db}
			allowed, usage, limit, tier := tt.run(a)
			if allowed {
				t.Fatalf("allowed=true want=false")
			}
			if usage != limit {
				t.Fatalf("usage=%d limit=%d want equal at limit", usage, limit)
			}
			if tier != "free" {
				t.Fatalf("tier=%s want=free", tier)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("unmet expectations: %v", err)
			}
		})
	}
}
