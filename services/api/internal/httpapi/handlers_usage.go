package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// M11 - Usage Tracking (v1) + Soft Limits
// Usage is measured PER WORKSPACE PER BILLING PERIOD
// Billing is PER USER; workspaces inherit limits from owner's tier

type usageMetric struct {
	Metric      string `json:"metric"`
	Usage       int    `json:"usage"`
	Limit       int    `json:"limit"`
	At80Percent bool   `json:"at_80_percent"`
	AtOrOver100 bool   `json:"at_or_over_100"`
}

type workspaceUsageResponse struct {
	WorkspaceID string     `json:"workspace_id"`
	PeriodStart string     `json:"period_start"`
	PeriodEnd   string     `json:"period_end"`
	PeriodType  string     `json:"period_type"` // "stripe_cycle" or "calendar_month"
	Tier        string     `json:"tier"`
	Metrics     usageMetrics `json:"metrics"`
}

type usageMetrics struct {
	Prospects usageMetric `json:"prospects"`
	Snapshots usageMetric `json:"snapshots"`
	Documents usageMetric `json:"documents"`
}

// billingPeriod derives period_start and period_end from user_billing
// Rules:
// 1. If user has active subscription with current_period_start/end, use those (Stripe cycle)
// 2. Otherwise, fallback to calendar month (1st of current month to 1st of next month)
// Edge cases: past_due/unpaid/canceled still use last known Stripe period if available
func (a *api) getBillingPeriod(ctx context.Context, userID string) (start, end time.Time, periodType string) {
	var currentPeriodStart, currentPeriodEnd *time.Time
	var status string

	err := a.db.QueryRowContext(
		ctx,
		`SELECT current_period_start, current_period_end, status
		 FROM user_billing
		 WHERE user_id = $1`,
		userID,
	).Scan(&currentPeriodStart, &currentPeriodEnd, &status)

	// If we have valid Stripe period dates, use them
	// This works for: active, trialing, past_due, unpaid, canceled (as long as dates exist)
	if err == nil && currentPeriodStart != nil && currentPeriodEnd != nil {
		return *currentPeriodStart, *currentPeriodEnd, "stripe_cycle"
	}

	// Fallback: calendar month
	now := time.Now().UTC()
	start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	end = start.AddDate(0, 1, 0)
	return start, end, "calendar_month"
}

// countProspectsInPeriod counts prospects created within the period for a workspace
func (a *api) countProspectsInPeriod(ctx context.Context, workspaceID string, periodStart, periodEnd time.Time) (int, error) {
	var count int
	err := a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*)
		 FROM prospecting_properties
		 WHERE workspace_id = $1
		   AND created_at >= $2
		   AND created_at < $3`,
		workspaceID, periodStart, periodEnd,
	).Scan(&count)
	return count, err
}

// countSnapshotsInPeriod counts cash + financing snapshots created within the period for a workspace
func (a *api) countSnapshotsInPeriod(ctx context.Context, workspaceID string, periodStart, periodEnd time.Time) (int, error) {
	var cashCount, financingCount int

	err := a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*)
		 FROM analysis_cash_snapshots
		 WHERE workspace_id = $1
		   AND created_at >= $2
		   AND created_at < $3`,
		workspaceID, periodStart, periodEnd,
	).Scan(&cashCount)
	if err != nil {
		return 0, err
	}

	err = a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*)
		 FROM analysis_financing_snapshots
		 WHERE workspace_id = $1
		   AND created_at >= $2
		   AND created_at < $3`,
		workspaceID, periodStart, periodEnd,
	).Scan(&financingCount)
	if err != nil {
		return 0, err
	}

	return cashCount + financingCount, nil
}

// countDocumentsInPeriod counts documents created within the period for a workspace
func (a *api) countDocumentsInPeriod(ctx context.Context, workspaceID string, periodStart, periodEnd time.Time) (int, error) {
	var count int
	err := a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*)
		 FROM documents
		 WHERE workspace_id = $1
		   AND created_at >= $2
		   AND created_at < $3`,
		workspaceID, periodStart, periodEnd,
	).Scan(&count)
	return count, err
}

// buildUsageMetric creates a usageMetric with threshold flags
func buildUsageMetric(metric string, usage, limit int) usageMetric {
	threshold80 := int(float64(limit) * 0.8)
	return usageMetric{
		Metric:      metric,
		Usage:       usage,
		Limit:       limit,
		At80Percent: usage >= threshold80 && usage < limit,
		AtOrOver100: usage >= limit,
	}
}

// logUsageExceededSoft logs a soft limit event (for observability)
// Called when usage crosses 80% or 100% thresholds
func logUsageExceededSoft(
	requestID string,
	workspaceID string,
	userID string,
	tier string,
	metric string,
	usage int,
	limit int,
	periodStart time.Time,
	periodEnd time.Time,
	threshold string, // "80" or "100"
) {
	slog.Warn("usage_exceeded_soft",
		slog.String("request_id", requestID),
		slog.String("workspace_id", workspaceID),
		slog.String("user_id", userID),
		slog.String("tier", tier),
		slog.String("metric", metric),
		slog.Int("usage", usage),
		slog.Int("limit", limit),
		slog.String("period_start", periodStart.Format(time.RFC3339)),
		slog.String("period_end", periodEnd.Format(time.RFC3339)),
		slog.String("threshold", threshold),
	)
}

// handleGetWorkspaceUsage handles GET /api/v1/workspaces/:id/usage
func (a *api) handleGetWorkspaceUsage(w http.ResponseWriter, r *http.Request, workspaceID string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	requestID := r.Header.Get("X-Request-ID")

	// Check workspace membership
	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	// Get workspace owner to determine tier
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return
	}

	// Get owner's billing info (tier and period)
	billing, err := a.getUserBilling(r.Context(), ownerUserID)
	if err != nil {
		// If no billing record, create default
		billing, err = a.createDefaultBilling(r.Context(), ownerUserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get billing info"})
			return
		}
	}

	// Get billing period
	periodStart, periodEnd, periodType := a.getBillingPeriod(r.Context(), ownerUserID)

	// Get tier limits
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxWorkspaces == 0 {
		limits = tierLimitsMap["starter"]
	}

	// Count usage for each metric
	prospectsCount, err := a.countProspectsInPeriod(r.Context(), workspaceID, periodStart, periodEnd)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count prospects"})
		return
	}

	snapshotsCount, err := a.countSnapshotsInPeriod(r.Context(), workspaceID, periodStart, periodEnd)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count snapshots"})
		return
	}

	documentsCount, err := a.countDocumentsInPeriod(r.Context(), workspaceID, periodStart, periodEnd)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count documents"})
		return
	}

	// Build metrics with threshold flags
	prospectsMetric := buildUsageMetric("prospects", prospectsCount, limits.MaxProspectsPerMonth)
	snapshotsMetric := buildUsageMetric("snapshots", snapshotsCount, limits.MaxSnapshotsPerMonth)
	documentsMetric := buildUsageMetric("documents", documentsCount, limits.MaxDocsPerMonth)

	// Log soft limit events (observability)
	// Note: In production, consider rate-limiting these logs per workspace+period+metric
	if prospectsMetric.AtOrOver100 {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "prospects", prospectsCount, limits.MaxProspectsPerMonth, periodStart, periodEnd, "100")
	} else if prospectsMetric.At80Percent {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "prospects", prospectsCount, limits.MaxProspectsPerMonth, periodStart, periodEnd, "80")
	}

	if snapshotsMetric.AtOrOver100 {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "snapshots", snapshotsCount, limits.MaxSnapshotsPerMonth, periodStart, periodEnd, "100")
	} else if snapshotsMetric.At80Percent {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "snapshots", snapshotsCount, limits.MaxSnapshotsPerMonth, periodStart, periodEnd, "80")
	}

	if documentsMetric.AtOrOver100 {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "documents", documentsCount, limits.MaxDocsPerMonth, periodStart, periodEnd, "100")
	} else if documentsMetric.At80Percent {
		logUsageExceededSoft(requestID, workspaceID, userID, billing.Tier, "documents", documentsCount, limits.MaxDocsPerMonth, periodStart, periodEnd, "80")
	}

	response := workspaceUsageResponse{
		WorkspaceID: workspaceID,
		PeriodStart: periodStart.Format(time.RFC3339),
		PeriodEnd:   periodEnd.Format(time.RFC3339),
		PeriodType:  periodType,
		Tier:        billing.Tier,
		Metrics: usageMetrics{
			Prospects: prospectsMetric,
			Snapshots: snapshotsMetric,
			Documents: documentsMetric,
		},
	}

	writeJSON(w, http.StatusOK, response)
}
