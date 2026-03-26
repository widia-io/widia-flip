package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
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

type adminFunnelCounts struct {
	HomeViews                          int `json:"homeViews"`
	SignupStarted                      int `json:"signupStarted"`
	SignupCompleted                    int `json:"signupCompleted"`
	LoginCompleted                     int `json:"loginCompleted"`
	FirstSnapshotSaved                 int `json:"firstSnapshotSaved"`
	CalculatorFullReportRequested      int `json:"calculatorFullReportRequested"`
	CalculatorSaveClicked              int `json:"calculatorSaveClicked"`
	OfferIntelligenceGenerated         int `json:"offerIntelligenceGenerated"`
	OfferIntelligenceSaved             int `json:"offerIntelligenceSaved"`
	OfferIntelligencePaywallViewed     int `json:"offerIntelligencePaywallViewed"`
	OfferIntelligenceUpgradeCtaClicked int `json:"offerIntelligenceUpgradeCtaClicked"`
}

type adminFunnelDailyItem struct {
	Date string `json:"date"`
	adminFunnelCounts
}

type adminFunnelDailyRates struct {
	HomeToSignupStartPct       float64 `json:"homeToSignupStartPct"`
	SignupStartToCompletePct   float64 `json:"signupStartToCompletePct"`
	SignupCompleteToLoginPct   float64 `json:"signupCompleteToLoginPct"`
	LoginToFirstSnapshotPct    float64 `json:"loginToFirstSnapshotPct"`
	HomeToFirstSnapshotPct     float64 `json:"homeToFirstSnapshotPct"`
	CalculatorToSaveClickPct   float64 `json:"calculatorToSaveClickPct"`
	CalculatorToReportReqPct   float64 `json:"calculatorToReportRequestPct"`
	OfferGeneratedToSavedPct   float64 `json:"offerGeneratedToSavedPct"`
	OfferGeneratedToPaywallPct float64 `json:"offerGeneratedToPaywallPct"`
	OfferPaywallToUpgradePct   float64 `json:"offerPaywallToUpgradePct"`
}

type adminFunnelDailyResponse struct {
	Days            int                    `json:"days"`
	Items           []adminFunnelDailyItem `json:"items"`
	Totals          adminFunnelCounts      `json:"totals"`
	RawTotals       adminFunnelCounts      `json:"rawTotals"`
	DuplicateDeltas adminFunnelCounts      `json:"duplicateDeltas"`
	Rates           adminFunnelDailyRates  `json:"rates"`
	Warnings        []string               `json:"warnings"`
}

type adminFunnelEventRow struct {
	ID        string
	EventName string
	Day       time.Time
	SessionID string
	UserID    sql.NullString
	RequestID sql.NullString
}

var adminFunnelTrackedEvents = []string{
	"home_view",
	"signup_started",
	"signup_completed",
	"login_completed",
	"first_snapshot_saved",
	"calculator_full_report_requested",
	"calculator_save_clicked",
	"offer_intelligence_generated",
	"offer_intelligence_saved",
	"offer_intelligence_paywall_viewed",
	"offer_intelligence_upgrade_cta_clicked",
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

	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to load reporting timezone",
		})
		return
	}

	windowStartUTC, windowEndUTC, dayKeys := buildAdminFunnelWindow(days, location)
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT
			id::text,
			event_name,
			(event_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
			session_id,
			user_id::text,
			request_id
		FROM flip.funnel_events
		WHERE event_at >= $1
		  AND event_at < $2
		  AND event_name = ANY($3)
		ORDER BY event_at ASC
	`, windowStartUTC, windowEndUTC, pq.Array(adminFunnelTrackedEvents))
	if err != nil {
		log.Printf("admin funnel daily: query error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to fetch funnel metrics",
		})
		return
	}
	defer rows.Close()

	itemsByDate := make(map[string]*adminFunnelDailyItem, len(dayKeys))
	items := make([]adminFunnelDailyItem, len(dayKeys))
	for index, dayKey := range dayKeys {
		items[index] = adminFunnelDailyItem{Date: dayKey}
		itemsByDate[dayKey] = &items[index]
	}

	rawTotals := adminFunnelCounts{}
	totals := adminFunnelCounts{}
	dailySeen := make(map[string]map[string]map[string]struct{}, len(dayKeys))
	totalSeen := make(map[string]map[string]struct{}, len(adminFunnelTrackedEvents))
	legacySyntheticRows := 0

	for rows.Next() {
		var row adminFunnelEventRow
		if err := rows.Scan(
			&row.ID,
			&row.EventName,
			&row.Day,
			&row.SessionID,
			&row.UserID,
			&row.RequestID,
		); err != nil {
			log.Printf("admin funnel daily: scan error: %v", err)
			writeError(w, http.StatusInternalServerError, apiError{
				Code:    "DB_ERROR",
				Message: "failed to parse funnel metrics",
			})
			return
		}

		rawTotals.increment(row.EventName)
		dateKey := row.Day.Format("2006-01-02")
		journeyKey := buildAdminFunnelJourneyKey(row)

		if strings.HasPrefix(strings.TrimSpace(row.SessionID), "srv_") && !row.RequestID.Valid && row.UserID.Valid {
			legacySyntheticRows++
		}

		if _, ok := dailySeen[dateKey]; !ok {
			dailySeen[dateKey] = make(map[string]map[string]struct{})
		}
		if _, ok := dailySeen[dateKey][row.EventName]; !ok {
			dailySeen[dateKey][row.EventName] = make(map[string]struct{})
		}
		if _, ok := dailySeen[dateKey][row.EventName][journeyKey]; !ok {
			dailySeen[dateKey][row.EventName][journeyKey] = struct{}{}
			if item := itemsByDate[dateKey]; item != nil {
				item.increment(row.EventName)
			}
		}

		if _, ok := totalSeen[row.EventName]; !ok {
			totalSeen[row.EventName] = make(map[string]struct{})
		}
		if _, ok := totalSeen[row.EventName][journeyKey]; !ok {
			totalSeen[row.EventName][journeyKey] = struct{}{}
			totals.increment(row.EventName)
		}
	}
	if err := rows.Err(); err != nil {
		log.Printf("admin funnel daily: rows error: %v", err)
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "DB_ERROR",
			Message: "failed to read funnel metrics",
		})
		return
	}

	duplicateDeltas := rawTotals.subtract(totals)
	rates := buildAdminFunnelRates(totals)
	warnings := buildAdminFunnelWarnings(rawTotals, duplicateDeltas, rates, legacySyntheticRows)

	writeJSON(w, http.StatusOK, adminFunnelDailyResponse{
		Days:            days,
		Items:           items,
		Totals:          totals,
		RawTotals:       rawTotals,
		DuplicateDeltas: duplicateDeltas,
		Rates:           rates,
		Warnings:        warnings,
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

func (c *adminFunnelCounts) increment(eventName string) {
	switch eventName {
	case "home_view":
		c.HomeViews++
	case "signup_started":
		c.SignupStarted++
	case "signup_completed":
		c.SignupCompleted++
	case "login_completed":
		c.LoginCompleted++
	case "first_snapshot_saved":
		c.FirstSnapshotSaved++
	case "calculator_full_report_requested":
		c.CalculatorFullReportRequested++
	case "calculator_save_clicked":
		c.CalculatorSaveClicked++
	case "offer_intelligence_generated":
		c.OfferIntelligenceGenerated++
	case "offer_intelligence_saved":
		c.OfferIntelligenceSaved++
	case "offer_intelligence_paywall_viewed":
		c.OfferIntelligencePaywallViewed++
	case "offer_intelligence_upgrade_cta_clicked":
		c.OfferIntelligenceUpgradeCtaClicked++
	}
}

func (c adminFunnelCounts) subtract(other adminFunnelCounts) adminFunnelCounts {
	return adminFunnelCounts{
		HomeViews:                          c.HomeViews - other.HomeViews,
		SignupStarted:                      c.SignupStarted - other.SignupStarted,
		SignupCompleted:                    c.SignupCompleted - other.SignupCompleted,
		LoginCompleted:                     c.LoginCompleted - other.LoginCompleted,
		FirstSnapshotSaved:                 c.FirstSnapshotSaved - other.FirstSnapshotSaved,
		CalculatorFullReportRequested:      c.CalculatorFullReportRequested - other.CalculatorFullReportRequested,
		CalculatorSaveClicked:              c.CalculatorSaveClicked - other.CalculatorSaveClicked,
		OfferIntelligenceGenerated:         c.OfferIntelligenceGenerated - other.OfferIntelligenceGenerated,
		OfferIntelligenceSaved:             c.OfferIntelligenceSaved - other.OfferIntelligenceSaved,
		OfferIntelligencePaywallViewed:     c.OfferIntelligencePaywallViewed - other.OfferIntelligencePaywallViewed,
		OfferIntelligenceUpgradeCtaClicked: c.OfferIntelligenceUpgradeCtaClicked - other.OfferIntelligenceUpgradeCtaClicked,
	}
}

func (i *adminFunnelDailyItem) increment(eventName string) {
	i.adminFunnelCounts.increment(eventName)
}

func buildAdminFunnelWindow(days int, location *time.Location) (time.Time, time.Time, []string) {
	nowLocal := time.Now().In(location)
	endLocal := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, location)
	startLocal := endLocal.AddDate(0, 0, -(days - 1))

	labels := make([]string, 0, days)
	for current := startLocal; !current.After(endLocal); current = current.AddDate(0, 0, 1) {
		labels = append(labels, current.Format("2006-01-02"))
	}

	return startLocal.UTC(), endLocal.AddDate(0, 0, 1).UTC(), labels
}

func buildAdminFunnelJourneyKey(row adminFunnelEventRow) string {
	sessionID := strings.TrimSpace(row.SessionID)
	if sessionID != "" {
		return sessionID
	}
	if row.UserID.Valid && strings.TrimSpace(row.UserID.String) != "" {
		return "user:" + strings.TrimSpace(row.UserID.String)
	}
	if row.RequestID.Valid && strings.TrimSpace(row.RequestID.String) != "" {
		return "request:" + strings.TrimSpace(row.RequestID.String)
	}
	return "event:" + row.ID
}

func buildAdminFunnelRates(totals adminFunnelCounts) adminFunnelDailyRates {
	return adminFunnelDailyRates{
		HomeToSignupStartPct:       percent(totals.SignupStarted, totals.HomeViews),
		SignupStartToCompletePct:   percent(totals.SignupCompleted, totals.SignupStarted),
		SignupCompleteToLoginPct:   percent(totals.LoginCompleted, totals.SignupCompleted),
		LoginToFirstSnapshotPct:    percent(totals.FirstSnapshotSaved, totals.LoginCompleted),
		HomeToFirstSnapshotPct:     percent(totals.FirstSnapshotSaved, totals.HomeViews),
		CalculatorToSaveClickPct:   percent(totals.CalculatorSaveClicked, totals.CalculatorFullReportRequested),
		CalculatorToReportReqPct:   percent(totals.CalculatorFullReportRequested, totals.HomeViews),
		OfferGeneratedToSavedPct:   percent(totals.OfferIntelligenceSaved, totals.OfferIntelligenceGenerated),
		OfferGeneratedToPaywallPct: percent(totals.OfferIntelligencePaywallViewed, totals.OfferIntelligenceGenerated),
		OfferPaywallToUpgradePct:   percent(totals.OfferIntelligenceUpgradeCtaClicked, totals.OfferIntelligencePaywallViewed),
	}
}

func buildAdminFunnelWarnings(
	rawTotals adminFunnelCounts,
	duplicateDeltas adminFunnelCounts,
	rates adminFunnelDailyRates,
	legacySyntheticRows int,
) []string {
	warnings := make([]string, 0, 3)

	if rawTotals != duplicateDeltas && (duplicateDeltas.HomeViews > 0 ||
		duplicateDeltas.SignupStarted > 0 ||
		duplicateDeltas.SignupCompleted > 0 ||
		duplicateDeltas.LoginCompleted > 0 ||
		duplicateDeltas.FirstSnapshotSaved > 0 ||
		duplicateDeltas.CalculatorFullReportRequested > 0 ||
		duplicateDeltas.CalculatorSaveClicked > 0 ||
		duplicateDeltas.OfferIntelligenceGenerated > 0 ||
		duplicateDeltas.OfferIntelligenceSaved > 0 ||
		duplicateDeltas.OfferIntelligencePaywallViewed > 0 ||
		duplicateDeltas.OfferIntelligenceUpgradeCtaClicked > 0) {
		warnings = append(warnings, "Eventos duplicados foram detectados na janela selecionada; os cards usam jornadas únicas e o diagnóstico mostra o volume bruto.")
	}

	if rates.HomeToSignupStartPct > 100 ||
		rates.SignupStartToCompletePct > 100 ||
		rates.SignupCompleteToLoginPct > 100 ||
		rates.LoginToFirstSnapshotPct > 100 ||
		rates.HomeToFirstSnapshotPct > 100 ||
		rates.CalculatorToSaveClickPct > 100 ||
		rates.CalculatorToReportReqPct > 100 ||
		rates.OfferGeneratedToSavedPct > 100 ||
		rates.OfferGeneratedToPaywallPct > 100 ||
		rates.OfferPaywallToUpgradePct > 100 {
		warnings = append(warnings, "A janela selecionada contém legado inconsistente; percentuais acima de 100% devem ser tratados como histórico contaminado e são ocultados no painel.")
	}

	if legacySyntheticRows > 0 {
		warnings = append(warnings, "Parte do histórico foi registrada com session_id sintético server-side antes do saneamento do BFF; comparações antigas de Oferta Inteligente podem permanecer infladas.")
	}

	return warnings
}
