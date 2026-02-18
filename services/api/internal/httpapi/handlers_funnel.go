package httpapi

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

type funnelEventRequest struct {
	Event      string         `json:"event"`
	SessionID  string         `json:"session_id"`
	Variant    string         `json:"variant"`
	Source     string         `json:"source"`
	Device     string         `json:"device"`
	Path       string         `json:"path"`
	RequestID  string         `json:"request_id"`
	Workspace  string         `json:"workspace_id"`
	OccurredAt string         `json:"occurred_at"`
	Properties map[string]any `json:"properties"`
}

type funnelEventResponse struct {
	Status string `json:"status"`
}

type funnelEventInsert struct {
	EventName       string
	SessionID       string
	UserID          *string
	WorkspaceID     *string
	Variant         string
	Source          string
	DeviceType      string
	Path            string
	RequestID       *string
	IsAuthenticated bool
	Metadata        map[string]any
	EventAt         time.Time
}

type adminFunnelDailyItem struct {
	Date                          string `json:"date"`
	HomeViews                     int    `json:"homeViews"`
	SignupStarted                 int    `json:"signupStarted"`
	SignupCompleted               int    `json:"signupCompleted"`
	LoginCompleted                int    `json:"loginCompleted"`
	FirstSnapshotSaved            int    `json:"firstSnapshotSaved"`
	CalculatorFullReportRequested int    `json:"calculatorFullReportRequested"`
	CalculatorSaveClicked         int    `json:"calculatorSaveClicked"`
}

type adminFunnelDailyTotals struct {
	HomeViews                     int `json:"homeViews"`
	SignupStarted                 int `json:"signupStarted"`
	SignupCompleted               int `json:"signupCompleted"`
	LoginCompleted                int `json:"loginCompleted"`
	FirstSnapshotSaved            int `json:"firstSnapshotSaved"`
	CalculatorFullReportRequested int `json:"calculatorFullReportRequested"`
	CalculatorSaveClicked         int `json:"calculatorSaveClicked"`
}

type adminFunnelDailyRates struct {
	HomeToSignupStartPct     float64 `json:"homeToSignupStartPct"`
	SignupStartToCompletePct float64 `json:"signupStartToCompletePct"`
	SignupCompleteToLoginPct float64 `json:"signupCompleteToLoginPct"`
	LoginToFirstSnapshotPct  float64 `json:"loginToFirstSnapshotPct"`
	HomeToFirstSnapshotPct   float64 `json:"homeToFirstSnapshotPct"`
	CalculatorToSaveClickPct float64 `json:"calculatorToSaveClickPct"`
	CalculatorToReportReqPct float64 `json:"calculatorToReportRequestPct"`
}

type adminFunnelDailyResponse struct {
	Days   int                    `json:"days"`
	Items  []adminFunnelDailyItem `json:"items"`
	Totals adminFunnelDailyTotals `json:"totals"`
	Rates  adminFunnelDailyRates  `json:"rates"`
}

func (a *api) handlePublicFunnelEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	a.ingestFunnelEvent(w, r, nil, false)
}

func (a *api) handleFunnelEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	a.ingestFunnelEvent(w, r, &userID, true)
}

func (a *api) ingestFunnelEvent(w http.ResponseWriter, r *http.Request, userID *string, isAuthenticated bool) {
	var req funnelEventRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "invalid json body",
			Details: []string{err.Error()},
		})
		return
	}

	req.Event = strings.TrimSpace(req.Event)
	if req.Event == "" || len(req.Event) > 100 {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "event is required and must have at most 100 chars",
		})
		return
	}

	reqID := strings.TrimSpace(req.RequestID)
	if reqID == "" {
		reqID = strings.TrimSpace(r.Header.Get("X-Request-ID"))
	}

	sessionID := normalizeSessionID(req.SessionID, reqID)
	variant := normalizeVariant(req.Variant)
	source := normalizeSource(req.Source)
	device := normalizeDevice(req.Device, r.Header.Get("User-Agent"))
	path := normalizePath(req.Path)
	eventAt := parseEventAt(req.OccurredAt)

	var workspaceID *string
	if userID != nil {
		candidate := strings.TrimSpace(req.Workspace)
		if candidate != "" {
			allowed, err := a.userHasWorkspaceAccess(r.Context(), *userID, candidate)
			if err != nil {
				writeError(w, http.StatusInternalServerError, apiError{
					Code:    "DB_ERROR",
					Message: "failed to validate workspace",
				})
				return
			}
			if allowed {
				workspaceID = &candidate
			}
		}
	}

	metadata := req.Properties
	if metadata == nil {
		metadata = map[string]any{}
	}

	var requestID *string
	if reqID != "" {
		requestID = &reqID
	}

	err := a.insertFunnelEvent(r.Context(), funnelEventInsert{
		EventName:       req.Event,
		SessionID:       sessionID,
		UserID:          userID,
		WorkspaceID:     workspaceID,
		Variant:         variant,
		Source:          source,
		DeviceType:      device,
		Path:            path,
		RequestID:       requestID,
		IsAuthenticated: isAuthenticated,
		Metadata:        metadata,
		EventAt:         eventAt,
	})
	if err != nil {
		log.Printf("funnel event: insert error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to store funnel event",
		})
		return
	}

	writeJSON(w, http.StatusAccepted, funnelEventResponse{Status: "accepted"})
}

func (a *api) handleAdminFunnelDaily(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "VALIDATION_ERROR",
				Message: "days must be an integer",
			})
			return
		}
		days = parsed
	}
	if days < 7 || days > 90 {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "days must be between 7 and 90",
		})
		return
	}

	rows, err := a.db.QueryContext(r.Context(), `
		WITH days AS (
			SELECT generate_series(
				((now() AT TIME ZONE 'America/Sao_Paulo')::date - ($1::int - 1)),
				(now() AT TIME ZONE 'America/Sao_Paulo')::date,
				'1 day'::interval
			)::date AS day
		),
		agg AS (
			SELECT
				(event_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
				COUNT(*) FILTER (WHERE event_name = 'home_view') AS home_views,
				COUNT(*) FILTER (WHERE event_name = 'signup_started') AS signup_started,
				COUNT(*) FILTER (WHERE event_name = 'signup_completed') AS signup_completed,
				COUNT(*) FILTER (WHERE event_name = 'login_completed') AS login_completed,
				COUNT(*) FILTER (WHERE event_name = 'first_snapshot_saved') AS first_snapshot_saved,
				COUNT(*) FILTER (WHERE event_name = 'calculator_full_report_requested') AS calculator_full_report_requested,
				COUNT(*) FILTER (WHERE event_name = 'calculator_save_clicked') AS calculator_save_clicked
			FROM flip.funnel_events
			WHERE event_at >= (now() - ($1::int * INTERVAL '1 day'))
			GROUP BY 1
		)
		SELECT
			d.day,
			COALESCE(a.home_views, 0),
			COALESCE(a.signup_started, 0),
			COALESCE(a.signup_completed, 0),
			COALESCE(a.login_completed, 0),
			COALESCE(a.first_snapshot_saved, 0),
			COALESCE(a.calculator_full_report_requested, 0),
			COALESCE(a.calculator_save_clicked, 0)
		FROM days d
		LEFT JOIN agg a ON a.day = d.day
		ORDER BY d.day ASC
	`, days)
	if err != nil {
		log.Printf("admin funnel daily: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch funnel metrics",
		})
		return
	}
	defer rows.Close()

	items := make([]adminFunnelDailyItem, 0, days)
	totals := adminFunnelDailyTotals{}
	for rows.Next() {
		var day time.Time
		var item adminFunnelDailyItem
		if err := rows.Scan(
			&day,
			&item.HomeViews,
			&item.SignupStarted,
			&item.SignupCompleted,
			&item.LoginCompleted,
			&item.FirstSnapshotSaved,
			&item.CalculatorFullReportRequested,
			&item.CalculatorSaveClicked,
		); err != nil {
			log.Printf("admin funnel daily: scan error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{
				Code:    "DB_ERROR",
				Message: "failed to parse funnel metrics",
			})
			return
		}

		item.Date = day.Format("2006-01-02")
		items = append(items, item)

		totals.HomeViews += item.HomeViews
		totals.SignupStarted += item.SignupStarted
		totals.SignupCompleted += item.SignupCompleted
		totals.LoginCompleted += item.LoginCompleted
		totals.FirstSnapshotSaved += item.FirstSnapshotSaved
		totals.CalculatorFullReportRequested += item.CalculatorFullReportRequested
		totals.CalculatorSaveClicked += item.CalculatorSaveClicked
	}

	rates := adminFunnelDailyRates{
		HomeToSignupStartPct:     percent(totals.SignupStarted, totals.HomeViews),
		SignupStartToCompletePct: percent(totals.SignupCompleted, totals.SignupStarted),
		SignupCompleteToLoginPct: percent(totals.LoginCompleted, totals.SignupCompleted),
		LoginToFirstSnapshotPct:  percent(totals.FirstSnapshotSaved, totals.LoginCompleted),
		HomeToFirstSnapshotPct:   percent(totals.FirstSnapshotSaved, totals.HomeViews),
		CalculatorToSaveClickPct: percent(totals.CalculatorSaveClicked, totals.CalculatorFullReportRequested),
		CalculatorToReportReqPct: percent(totals.CalculatorFullReportRequested, totals.HomeViews),
	}

	writeJSON(w, http.StatusOK, adminFunnelDailyResponse{
		Days:   days,
		Items:  items,
		Totals: totals,
		Rates:  rates,
	})
}

func (a *api) insertFunnelEvent(ctx context.Context, input funnelEventInsert) error {
	metadataJSON, err := json.Marshal(input.Metadata)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(ctx, `
		INSERT INTO flip.funnel_events (
			event_name,
			session_id,
			user_id,
			workspace_id,
			variant,
			source,
			device_type,
			path,
			request_id,
			is_authenticated,
			metadata,
			event_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		input.EventName,
		input.SessionID,
		input.UserID,
		input.WorkspaceID,
		input.Variant,
		input.Source,
		input.DeviceType,
		input.Path,
		input.RequestID,
		input.IsAuthenticated,
		metadataJSON,
		input.EventAt.UTC(),
	)
	return err
}

func (a *api) userHasWorkspaceAccess(ctx context.Context, userID, workspaceID string) (bool, error) {
	var exists bool
	err := a.db.QueryRowContext(
		ctx,
		`SELECT EXISTS(
			SELECT 1
			FROM workspace_memberships
			WHERE user_id = $1 AND workspace_id = $2
		)`,
		userID,
		workspaceID,
	).Scan(&exists)
	return exists, err
}

func (a *api) isFirstSnapshotForUser(ctx context.Context, userID string) (bool, error) {
	var total int
	err := a.db.QueryRowContext(ctx, `
		SELECT
			COALESCE((
				SELECT COUNT(*)
				FROM analysis_cash_snapshots s
				JOIN workspace_memberships m ON m.workspace_id = s.workspace_id
				WHERE m.user_id = $1
			), 0)
			+
			COALESCE((
				SELECT COUNT(*)
				FROM analysis_financing_snapshots s
				JOIN workspace_memberships m ON m.workspace_id = s.workspace_id
				WHERE m.user_id = $1
			), 0)
	`, userID).Scan(&total)
	if err != nil {
		return false, err
	}
	return total == 1, nil
}

func (a *api) trackFirstSnapshotIfNeeded(
	ctx context.Context,
	userID string,
	workspaceID string,
	requestID string,
	sessionID string,
	path string,
	deviceType string,
	propertyID string,
	snapshotID string,
	analysisType string,
) {
	isFirst, err := a.isFirstSnapshotForUser(ctx, userID)
	if err != nil {
		log.Printf("funnel event: failed checking first snapshot user_id=%s: %v", userID, err)
		return
	}
	if !isFirst {
		return
	}

	userIDCopy := userID
	workspaceIDCopy := workspaceID
	requestID = strings.TrimSpace(requestID)

	var requestIDPtr *string
	if requestID != "" {
		requestIDPtr = &requestID
	}

	if err := a.insertFunnelEvent(ctx, funnelEventInsert{
		EventName:       "first_snapshot_saved",
		SessionID:       normalizeSessionID(sessionID, requestID),
		UserID:          &userIDCopy,
		WorkspaceID:     &workspaceIDCopy,
		Variant:         "control",
		Source:          "app",
		DeviceType:      normalizeDevice(deviceType, ""),
		Path:            normalizePath(path),
		RequestID:       requestIDPtr,
		IsAuthenticated: true,
		Metadata: map[string]any{
			"property_id":   propertyID,
			"snapshot_id":   snapshotID,
			"analysis_type": analysisType,
		},
		EventAt: time.Now().UTC(),
	}); err != nil {
		log.Printf("funnel event: failed insert first_snapshot_saved user_id=%s: %v", userID, err)
	}
}

func normalizeSessionID(raw string, requestID string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		requestID = strings.TrimSpace(requestID)
		if requestID != "" {
			return truncateString("srv_"+requestID, 120)
		}
		return "srv_" + newRequestID()
	}
	return truncateString(raw, 120)
}

func normalizeVariant(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "" {
		return "control"
	}
	return truncateString(raw, 50)
}

func normalizeSource(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "" {
		return "direct"
	}
	return truncateString(raw, 80)
}

func normalizeDevice(raw string, userAgent string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	switch raw {
	case "mobile", "desktop", "tablet", "unknown":
		return raw
	}

	userAgent = strings.ToLower(strings.TrimSpace(userAgent))
	switch {
	case strings.Contains(userAgent, "ipad") || strings.Contains(userAgent, "tablet"):
		return "tablet"
	case strings.Contains(userAgent, "mobile") || strings.Contains(userAgent, "android") || strings.Contains(userAgent, "iphone"):
		return "mobile"
	case userAgent == "":
		return "unknown"
	default:
		return "desktop"
	}
}

func normalizePath(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "/"
	}
	if !strings.HasPrefix(raw, "/") {
		raw = "/" + raw
	}
	return truncateString(raw, 255)
}

func parseEventAt(raw string) time.Time {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Now().UTC()
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return time.Now().UTC()
	}
	return parsed.UTC()
}

func percent(numerator int, denominator int) float64 {
	if denominator <= 0 {
		return 0
	}
	return float64(numerator) / float64(denominator) * 100
}

func truncateString(raw string, maxLen int) string {
	if len(raw) <= maxLen {
		return raw
	}
	return raw[:maxLen]
}
