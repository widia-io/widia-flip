package httpapi

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/logger"
)

// Admin stats types
type adminStats struct {
	Users      adminUserStats      `json:"users"`
	Workspaces adminWorkspaceStats `json:"workspaces"`
	Properties adminPropertyStats  `json:"properties"`
	Prospects  adminProspectStats  `json:"prospects"`
	Snapshots  adminSnapshotStats  `json:"snapshots"`
	Storage    adminStorageStats   `json:"storage"`
}

type adminUserStats struct {
	Total  int            `json:"total"`
	ByTier map[string]int `json:"byTier"`
}

type adminWorkspaceStats struct {
	Total int `json:"total"`
}

type adminPropertyStats struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"byStatus"`
}

type adminProspectStats struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"byStatus"`
}

type adminSnapshotStats struct {
	Cash      int `json:"cash"`
	Financing int `json:"financing"`
}

type adminStorageStats struct {
	TotalFiles int   `json:"totalFiles"`
	TotalBytes int64 `json:"totalBytes"`
}

// Admin user types
type adminUser struct {
	ID             string  `json:"id"`
	Email          string  `json:"email"`
	Name           string  `json:"name"`
	IsAdmin        bool    `json:"isAdmin"`
	IsActive       bool    `json:"isActive"`
	Tier           *string `json:"tier"`
	BillingStatus  *string `json:"billingStatus"`
	WorkspaceCount int     `json:"workspaceCount"`
	CreatedAt      string  `json:"createdAt"`
}

type adminUserDetail struct {
	adminUser
	Workspaces []adminUserWorkspace `json:"workspaces"`
	Storage    adminStorageStats    `json:"storage"`
}

type adminUserWorkspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type listAdminUsersResponse struct {
	Items []adminUser `json:"items"`
	Total int         `json:"total"`
}

// Request types
type updateUserTierRequest struct {
	Tier string `json:"tier"`
}

type updateUserStatusRequest struct {
	IsActive bool `json:"isActive"`
}

// Handler for /api/v1/admin/stats
func (a *api) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	stats := adminStats{
		Users:      adminUserStats{ByTier: make(map[string]int)},
		Properties: adminPropertyStats{ByStatus: make(map[string]int)},
		Prospects:  adminProspectStats{ByStatus: make(map[string]int)},
	}

	// Users by tier
	rows, err := a.db.QueryContext(ctx, `
		SELECT COALESCE(b.tier, 'none') as tier, COUNT(*)
		FROM "user" u
		LEFT JOIN user_billing b ON b.user_id = u.id
		GROUP BY 1
	`)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_stats_users_query", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch user stats"})
		return
	}
	defer rows.Close()
	for rows.Next() {
		var tier string
		var count int
		if err := rows.Scan(&tier, &count); err != nil {
			logger.WithContext(r.Context()).Error("admin_stats_scan", slog.Any("error", err))
			continue
		}
		stats.Users.ByTier[tier] = count
		stats.Users.Total += count
	}

	// Workspaces total
	err = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM workspaces`).Scan(&stats.Workspaces.Total)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_stats_workspaces_query", slog.Any("error", err))
	}

	// Properties by status
	rows, err = a.db.QueryContext(ctx, `SELECT status_pipeline, COUNT(*) FROM properties GROUP BY 1`)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_stats_properties_query", slog.Any("error", err))
	} else {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err != nil {
				continue
			}
			stats.Properties.ByStatus[status] = count
			stats.Properties.Total += count
		}
	}

	// Prospects by status
	rows, err = a.db.QueryContext(ctx, `SELECT status, COUNT(*) FROM prospecting_properties WHERE deleted_at IS NULL GROUP BY 1`)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_stats_prospects_query", slog.Any("error", err))
	} else {
		defer rows.Close()
		for rows.Next() {
			var status string
			var count int
			if err := rows.Scan(&status, &count); err != nil {
				continue
			}
			stats.Prospects.ByStatus[status] = count
			stats.Prospects.Total += count
		}
	}

	// Snapshots
	a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analysis_cash_snapshots`).Scan(&stats.Snapshots.Cash)
	a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM analysis_financing_snapshots`).Scan(&stats.Snapshots.Financing)

	// Storage
	a.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(size_bytes), 0) FROM documents`).Scan(&stats.Storage.TotalFiles, &stats.Storage.TotalBytes)

	writeJSON(w, http.StatusOK, stats)
}

// Handler for /api/v1/admin/users
func (a *api) handleAdminUsersCollection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	// Pagination params
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	// Get total count
	var total int
	a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "user"`).Scan(&total)

	// Get users with billing info
	rows, err := a.db.QueryContext(ctx, `
		SELECT u.id, u.email, u.name, u.is_admin, u.is_active, u."createdAt",
		       b.tier, b.status as billing_status,
		       (SELECT COUNT(*) FROM workspace_memberships WHERE user_id = u.id) as workspace_count
		FROM "user" u
		LEFT JOIN user_billing b ON b.user_id = u.id
		ORDER BY u."createdAt" DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_users_query", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch users"})
		return
	}
	defer rows.Close()

	items := make([]adminUser, 0)
	for rows.Next() {
		var u adminUser
		var createdAt time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.IsAdmin, &u.IsActive, &createdAt, &u.Tier, &u.BillingStatus, &u.WorkspaceCount); err != nil {
			logger.WithContext(r.Context()).Error("admin_users_scan", slog.Any("error", err))
			continue
		}
		u.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, u)
	}

	writeJSON(w, http.StatusOK, listAdminUsersResponse{Items: items, Total: total})
}

// Handler for /api/v1/admin/users/{id}/* routes
func (a *api) handleAdminUsersSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/users/")
	parts := strings.Split(rest, "/")

	userID := strings.TrimSpace(parts[0])
	if userID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/admin/users/{id}
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			a.handleAdminGetUser(w, r, userID)
		case http.MethodDelete:
			a.handleAdminDeleteUser(w, r, userID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/admin/users/{id}/tier
	if len(parts) == 2 && parts[1] == "tier" {
		if r.Method == http.MethodPut {
			a.handleAdminUpdateUserTier(w, r, userID)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/admin/users/{id}/status
	if len(parts) == 2 && parts[1] == "status" {
		if r.Method == http.MethodPut {
			a.handleAdminUpdateUserStatus(w, r, userID)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleAdminGetUser(w http.ResponseWriter, r *http.Request, userID string) {
	ctx := r.Context()

	// Get user with billing
	var u adminUserDetail
	var createdAt time.Time
	err := a.db.QueryRowContext(ctx, `
		SELECT u.id, u.email, u.name, u.is_admin, u.is_active, u."createdAt",
		       b.tier, b.status as billing_status,
		       (SELECT COUNT(*) FROM workspace_memberships WHERE user_id = u.id)
		FROM "user" u
		LEFT JOIN user_billing b ON b.user_id = u.id
		WHERE u.id = $1
	`, userID).Scan(&u.ID, &u.Email, &u.Name, &u.IsAdmin, &u.IsActive, &createdAt, &u.Tier, &u.BillingStatus, &u.WorkspaceCount)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "user not found"})
		return
	}
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_get_user_query", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch user"})
		return
	}
	u.CreatedAt = createdAt.Format(time.RFC3339)

	// Get user's workspaces
	rows, err := a.db.QueryContext(ctx, `
		SELECT w.id, w.name, m.role
		FROM workspaces w
		JOIN workspace_memberships m ON m.workspace_id = w.id
		WHERE m.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err == nil {
		defer rows.Close()
		u.Workspaces = make([]adminUserWorkspace, 0)
		for rows.Next() {
			var ws adminUserWorkspace
			if err := rows.Scan(&ws.ID, &ws.Name, &ws.Role); err == nil {
				u.Workspaces = append(u.Workspaces, ws)
			}
		}
	}

	// Get user's storage usage
	a.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(d.size_bytes), 0)
		FROM documents d
		WHERE d.workspace_id IN (
			SELECT workspace_id FROM workspace_memberships WHERE user_id = $1
		)
	`, userID).Scan(&u.Storage.TotalFiles, &u.Storage.TotalBytes)

	writeJSON(w, http.StatusOK, u)
}

func (a *api) handleAdminUpdateUserTier(w http.ResponseWriter, r *http.Request, userID string) {
	var req updateUserTierRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate tier
	validTiers := map[string]bool{"starter": true, "pro": true, "growth": true}
	if !validTiers[req.Tier] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid tier, must be starter, pro, or growth"})
		return
	}

	// Check if user exists
	var exists bool
	a.db.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM "user" WHERE id = $1)`, userID).Scan(&exists)
	if !exists {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "user not found"})
		return
	}

	// Upsert billing record
	_, err := a.db.ExecContext(r.Context(), `
		INSERT INTO user_billing (user_id, tier, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (user_id) DO UPDATE SET tier = $2, updated_at = now()
	`, userID, req.Tier)

	if err != nil {
		logger.WithContext(r.Context()).Error("admin_update_tier", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update tier"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "tier": req.Tier})
}

func (a *api) handleAdminUpdateUserStatus(w http.ResponseWriter, r *http.Request, userID string) {
	var req updateUserStatusRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	result, err := a.db.ExecContext(r.Context(), `UPDATE "user" SET is_active = $1 WHERE id = $2`, req.IsActive, userID)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_update_status", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update status"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "user not found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "ok", "isActive": req.IsActive})
}

func (a *api) handleAdminDeleteUser(w http.ResponseWriter, r *http.Request, userID string) {
	ctx := r.Context()

	// Prevent admin from deleting themselves
	currentUserID, _ := auth.UserIDFromContext(ctx)
	if currentUserID == userID {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cannot delete yourself"})
		return
	}

	// Check if user exists
	var exists bool
	a.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM "user" WHERE id = $1)`, userID).Scan(&exists)
	if !exists {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "user not found"})
		return
	}

	// Start transaction for cascade delete
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to start transaction"})
		return
	}
	defer tx.Rollback()

	// Get all workspace IDs created by user
	workspaceIDs := make([]string, 0)
	rows, err := tx.QueryContext(ctx, `SELECT id FROM workspaces WHERE created_by_user_id = $1`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id string
			if rows.Scan(&id) == nil {
				workspaceIDs = append(workspaceIDs, id)
			}
		}
	}

	// Delete workspace data (in dependency order)
	if len(workspaceIDs) > 0 {
		for _, wsID := range workspaceIDs {
			tx.ExecContext(ctx, `DELETE FROM snapshot_annotations WHERE snapshot_id IN (SELECT id FROM analysis_cash_snapshots WHERE workspace_id = $1)`, wsID)
			tx.ExecContext(ctx, `DELETE FROM snapshot_annotations WHERE snapshot_id IN (SELECT id FROM analysis_financing_snapshots WHERE workspace_id = $1)`, wsID)
			tx.ExecContext(ctx, `DELETE FROM documents WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM cost_items WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM timeline_events WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM property_tax_rates WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM analysis_cash_snapshots WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM analysis_financing_snapshots WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM analysis_cash_inputs WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM financing_payments WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM financing_plans WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM properties WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM prospecting_properties WHERE workspace_id = $1`, wsID)
			tx.ExecContext(ctx, `DELETE FROM workspace_settings WHERE workspace_id = $1`, wsID)
		}
	}

	// Delete user's memberships (including other workspaces)
	tx.ExecContext(ctx, `DELETE FROM workspace_memberships WHERE user_id = $1`, userID)

	// Delete user's workspaces
	tx.ExecContext(ctx, `DELETE FROM workspaces WHERE created_by_user_id = $1`, userID)

	// Delete user billing
	tx.ExecContext(ctx, `DELETE FROM user_billing WHERE user_id = $1`, userID)

	// Delete user preferences
	tx.ExecContext(ctx, `DELETE FROM user_preferences WHERE user_id = $1`, userID)

	// Delete Better Auth data
	tx.ExecContext(ctx, `DELETE FROM session WHERE "userId" = $1`, userID)
	tx.ExecContext(ctx, `DELETE FROM account WHERE "userId" = $1`, userID)

	// Finally delete user
	_, err = tx.ExecContext(ctx, `DELETE FROM "user" WHERE id = $1`, userID)
	if err != nil {
		logger.WithContext(r.Context()).Error("admin_delete_user", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete user"})
		return
	}

	if err := tx.Commit(); err != nil {
		logger.WithContext(r.Context()).Error("admin_delete_user_commit", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to commit transaction"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Handler for /api/v1/user/admin-status (regular protected endpoint)
func (a *api) handleUserAdminStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var isAdmin bool
	err := a.db.QueryRowContext(r.Context(), `SELECT is_admin FROM "user" WHERE id = $1`, userID).Scan(&isAdmin)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "user not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check admin status"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"isAdmin": isAdmin})
}
