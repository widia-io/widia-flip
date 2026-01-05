package httpapi

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"time"
)

// M12 - Paywall + Enforcement (Hard Limits)
// Enforcement is server-side; blocks CREATION actions when limits exceeded or billing issues
// Read/edit operations always allowed (view-only mode)

// Error codes for enforcement
const (
	ErrCodePaywallRequired = "PAYWALL_REQUIRED"
	ErrCodeLimitExceeded   = "LIMIT_EXCEEDED"
)

// HTTP status for paywall/limit errors (using 402 Payment Required)
const (
	StatusPaymentRequired = 402
)

// Billing statuses that block creation (require payment)
var billingStatusesBlocked = map[string]bool{
	"past_due":           true,
	"unpaid":             true,
	"incomplete":         true,
	"incomplete_expired": true,
}

// enforcementDetails contains detailed info about why an action was blocked
type enforcementDetails struct {
	Tier           string `json:"tier"`
	Metric         string `json:"metric,omitempty"`
	Usage          int    `json:"usage,omitempty"`
	Limit          int    `json:"limit,omitempty"`
	PeriodStart    string `json:"period_start,omitempty"`
	PeriodEnd      string `json:"period_end,omitempty"`
	WorkspaceLimit int    `json:"workspace_limit,omitempty"`
	WorkspacesUsed int    `json:"workspaces_used,omitempty"`
	BillingStatus  string `json:"billing_status,omitempty"`
}

// enforcementError represents a paywall/limit error response
type enforcementError struct {
	Code    string             `json:"code"`
	Message string             `json:"message"`
	Details enforcementDetails `json:"details"`
}

type enforcementErrorEnvelope struct {
	Error enforcementError `json:"error"`
}

func writeEnforcementError(w http.ResponseWriter, code string, message string, details enforcementDetails) {
	writeJSON(w, StatusPaymentRequired, enforcementErrorEnvelope{
		Error: enforcementError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// checkBillingStatus checks if user's billing status allows creation actions
// Returns (allowed, billing, error)
func (a *api) checkBillingStatus(ctx context.Context, userID string) (bool, userBilling, error) {
	billing, err := a.getUserBilling(ctx, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// No billing record: auto-create with 14-day trial
			billing, err = a.createDefaultBilling(ctx, userID)
			if err != nil {
				return false, userBilling{}, err
			}
		} else {
			return false, userBilling{}, err
		}
	}

	// Check if status requires payment
	if billingStatusesBlocked[billing.Status] {
		return false, billing, nil
	}

	// Check if canceled AND period expired
	if billing.Status == "canceled" && billing.CurrentPeriodEnd != nil {
		if time.Now().After(*billing.CurrentPeriodEnd) {
			// Period expired; treat as blocked (or fallback to Starter)
			// Decision: block creation, treat as needing resubscription
			return false, billing, nil
		}
	}

	return true, billing, nil
}

// countUserWorkspaces counts active workspaces owned by user
func (a *api) countUserWorkspaces(ctx context.Context, userID string) (int, error) {
	var count int
	err := a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM workspaces WHERE created_by_user_id = $1`,
		userID,
	).Scan(&count)
	return count, err
}

// checkWorkspaceCreationLimit checks if user can create a new workspace
// Returns (allowed, currentCount, limit, tier)
func (a *api) checkWorkspaceCreationLimit(ctx context.Context, userID string, billing userBilling) (bool, int, int, string) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxWorkspaces == 0 {
		limits = tierLimitsMap["starter"]
	}

	count, err := a.countUserWorkspaces(ctx, userID)
	if err != nil {
		slog.Error("enforcement: failed to count workspaces", slog.String("user_id", userID), slog.Any("error", err))
		// On error, be permissive (don't block)
		return true, 0, limits.MaxWorkspaces, billing.Tier
	}

	return count < limits.MaxWorkspaces, count, limits.MaxWorkspaces, billing.Tier
}

// checkProspectCreationLimit checks if workspace can create a new prospect
func (a *api) checkProspectCreationLimit(ctx context.Context, userID string, workspaceID string, billing userBilling) (bool, int, int, string, time.Time, time.Time) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxProspectsPerMonth == 0 {
		limits = tierLimitsMap["starter"]
	}

	periodStart, periodEnd, _ := a.getBillingPeriod(ctx, userID)
	count, err := a.countProspectsInPeriod(ctx, workspaceID, periodStart, periodEnd)
	if err != nil {
		slog.Error("enforcement: failed to count prospects", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		return true, 0, limits.MaxProspectsPerMonth, billing.Tier, periodStart, periodEnd
	}

	return count < limits.MaxProspectsPerMonth, count, limits.MaxProspectsPerMonth, billing.Tier, periodStart, periodEnd
}

// checkSnapshotCreationLimit checks if workspace can create a new snapshot
func (a *api) checkSnapshotCreationLimit(ctx context.Context, userID string, workspaceID string, billing userBilling) (bool, int, int, string, time.Time, time.Time) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxSnapshotsPerMonth == 0 {
		limits = tierLimitsMap["starter"]
	}

	periodStart, periodEnd, _ := a.getBillingPeriod(ctx, userID)
	count, err := a.countSnapshotsInPeriod(ctx, workspaceID, periodStart, periodEnd)
	if err != nil {
		slog.Error("enforcement: failed to count snapshots", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		return true, 0, limits.MaxSnapshotsPerMonth, billing.Tier, periodStart, periodEnd
	}

	return count < limits.MaxSnapshotsPerMonth, count, limits.MaxSnapshotsPerMonth, billing.Tier, periodStart, periodEnd
}

// checkDocumentCreationLimit checks if workspace can create a new document
func (a *api) checkDocumentCreationLimit(ctx context.Context, userID string, workspaceID string, billing userBilling) (bool, int, int, string, time.Time, time.Time) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxDocsPerMonth == 0 {
		limits = tierLimitsMap["starter"]
	}

	periodStart, periodEnd, _ := a.getBillingPeriod(ctx, userID)
	count, err := a.countDocumentsInPeriod(ctx, workspaceID, periodStart, periodEnd)
	if err != nil {
		slog.Error("enforcement: failed to count documents", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		return true, 0, limits.MaxDocsPerMonth, billing.Tier, periodStart, periodEnd
	}

	return count < limits.MaxDocsPerMonth, count, limits.MaxDocsPerMonth, billing.Tier, periodStart, periodEnd
}

// checkURLImportLimit checks if workspace can create a new URL import
func (a *api) checkURLImportLimit(ctx context.Context, userID string, workspaceID string, billing userBilling) (bool, int, int, string, time.Time, time.Time) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxURLImportsPerMonth == 0 {
		limits = tierLimitsMap["starter"]
	}

	periodStart, periodEnd, _ := a.getBillingPeriod(ctx, userID)
	count, err := a.countURLImportsInPeriod(ctx, workspaceID, periodStart, periodEnd)
	if err != nil {
		slog.Error("enforcement: failed to count url imports", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		return true, 0, limits.MaxURLImportsPerMonth, billing.Tier, periodStart, periodEnd
	}

	return count < limits.MaxURLImportsPerMonth, count, limits.MaxURLImportsPerMonth, billing.Tier, periodStart, periodEnd
}

// checkStorageLimit checks if workspace has storage space for additional bytes
func (a *api) checkStorageLimit(ctx context.Context, workspaceID string, billing userBilling, additionalBytes int64) (bool, int64, int64, string) {
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxStorageBytes == 0 {
		limits = tierLimitsMap["starter"]
	}

	storageUsed, err := a.getWorkspaceStorageUsed(ctx, workspaceID)
	if err != nil {
		slog.Error("enforcement: failed to get storage used", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		return true, 0, limits.MaxStorageBytes, billing.Tier
	}

	return (storageUsed + additionalBytes) <= limits.MaxStorageBytes, storageUsed, limits.MaxStorageBytes, billing.Tier
}

// enforceWorkspaceCreation checks and enforces workspace creation limits
// Returns true if request should continue, false if blocked (error already written)
func (a *api) enforceWorkspaceCreation(w http.ResponseWriter, r *http.Request, userID string, requestID string) bool {
	// Check billing status first
	allowed, billing, err := a.checkBillingStatus(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("action", "create_workspace"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar criando recursos.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check workspace limit
	limitOK, used, limit, tier := a.checkWorkspaceCreationLimit(r.Context(), userID, billing)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("action", "create_workspace"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", tier),
			slog.Int("used", used),
			slog.Int("limit", limit),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de workspaces atingido. Faça upgrade para criar mais.", enforcementDetails{
			Tier:           tier,
			Metric:         "workspaces",
			WorkspacesUsed: used,
			WorkspaceLimit: limit,
		})
		return false
	}

	return true
}

// enforceProspectCreation checks and enforces prospect creation limits
func (a *api) enforceProspectCreation(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, requestID string) bool {
	// Get workspace owner (billing is per user, not per workspace)
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return false
	}

	// Check billing status
	allowed, billing, err := a.checkBillingStatus(r.Context(), ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_prospect"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar criando prospects.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check prospect limit
	limitOK, used, limit, tier, periodStart, periodEnd := a.checkProspectCreationLimit(r.Context(), ownerUserID, workspaceID, billing)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_prospect"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", tier),
			slog.Int("used", used),
			slog.Int("limit", limit),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de prospects atingido neste ciclo. Faça upgrade para criar mais.", enforcementDetails{
			Tier:        tier,
			Metric:      "prospects",
			Usage:       used,
			Limit:       limit,
			PeriodStart: periodStart.Format(time.RFC3339),
			PeriodEnd:   periodEnd.Format(time.RFC3339),
		})
		return false
	}

	return true
}

// enforceSnapshotCreation checks and enforces snapshot creation limits
func (a *api) enforceSnapshotCreation(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, requestID string) bool {
	// Get workspace owner
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return false
	}

	// Check billing status
	allowed, billing, err := a.checkBillingStatus(r.Context(), ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_snapshot"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar salvando análises.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check snapshot limit
	limitOK, used, limit, tier, periodStart, periodEnd := a.checkSnapshotCreationLimit(r.Context(), ownerUserID, workspaceID, billing)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_snapshot"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", tier),
			slog.Int("used", used),
			slog.Int("limit", limit),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de análises salvas atingido neste ciclo. Faça upgrade para salvar mais.", enforcementDetails{
			Tier:        tier,
			Metric:      "snapshots",
			Usage:       used,
			Limit:       limit,
			PeriodStart: periodStart.Format(time.RFC3339),
			PeriodEnd:   periodEnd.Format(time.RFC3339),
		})
		return false
	}

	return true
}

// enforceDocumentCreation checks and enforces document creation limits
func (a *api) enforceDocumentCreation(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, requestID string) bool {
	// Get workspace owner
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return false
	}

	// Check billing status
	allowed, billing, err := a.checkBillingStatus(r.Context(), ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_document"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar enviando documentos.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check document limit
	limitOK, used, limit, tier, periodStart, periodEnd := a.checkDocumentCreationLimit(r.Context(), ownerUserID, workspaceID, billing)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_document"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", tier),
			slog.Int("used", used),
			slog.Int("limit", limit),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de documentos atingido neste ciclo. Faça upgrade para enviar mais.", enforcementDetails{
			Tier:        tier,
			Metric:      "documents",
			Usage:       used,
			Limit:       limit,
			PeriodStart: periodStart.Format(time.RFC3339),
			PeriodEnd:   periodEnd.Format(time.RFC3339),
		})
		return false
	}

	return true
}

// enforceURLImportCreation checks and enforces URL import limits
func (a *api) enforceURLImportCreation(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, requestID string) bool {
	// Get workspace owner
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return false
	}

	// Check billing status
	allowed, billing, err := a.checkBillingStatus(r.Context(), ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "url_import"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar importando via URL.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check URL import limit
	limitOK, used, limit, tier, periodStart, periodEnd := a.checkURLImportLimit(r.Context(), ownerUserID, workspaceID, billing)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "url_import"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", tier),
			slog.Int("used", used),
			slog.Int("limit", limit),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de importações via URL atingido neste ciclo. Faça upgrade para importar mais.", enforcementDetails{
			Tier:        tier,
			Metric:      "url_imports",
			Usage:       used,
			Limit:       limit,
			PeriodStart: periodStart.Format(time.RFC3339),
			PeriodEnd:   periodEnd.Format(time.RFC3339),
		})
		return false
	}

	return true
}

// enforceStorageLimit checks and enforces storage limits
func (a *api) enforceStorageLimit(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, additionalBytes int64, requestID string) bool {
	// Get workspace owner
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM workspaces WHERE id = $1`,
		workspaceID,
	).Scan(&ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get workspace owner"})
		return false
	}

	// Check billing status
	allowed, billing, err := a.checkBillingStatus(r.Context(), ownerUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check billing status"})
		return false
	}

	if !allowed {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "storage_upload"),
			slog.String("reason", "billing_status"),
			slog.String("status", billing.Status),
		)
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar enviando arquivos.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: billing.Status,
		})
		return false
	}

	// Check storage limit
	limitOK, used, limit, tier := a.checkStorageLimit(r.Context(), workspaceID, billing, additionalBytes)
	if !limitOK {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "storage_upload"),
			slog.String("reason", "storage_limit_exceeded"),
			slog.String("tier", tier),
			slog.Int64("used", used),
			slog.Int64("limit", limit),
			slog.Int64("additional_bytes", additionalBytes),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de armazenamento atingido. Faça upgrade para enviar mais arquivos.", enforcementDetails{
			Tier:   tier,
			Metric: "storage_bytes",
			Usage:  int(used),
			Limit:  int(limit),
		})
		return false
	}

	return true
}
