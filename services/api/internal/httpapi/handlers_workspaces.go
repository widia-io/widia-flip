package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

type workspaceMembership struct {
	Role string `json:"role"`
}

type workspace struct {
	ID         string              `json:"id"`
	Name       string              `json:"name"`
	CreatedAt  time.Time           `json:"created_at"`
	Membership *workspaceMembership `json:"membership,omitempty"`
}

type listWorkspacesResponse struct {
	Items []workspace `json:"items"`
}

type createWorkspaceRequest struct {
	Name string `json:"name"`
}

func (a *api) handleWorkspacesCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListWorkspaces(w, r)
		return
	case http.MethodPost:
		a.handleCreateWorkspace(w, r)
		return
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

func (a *api) handleWorkspacesSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/workspaces/")
	parts := strings.Split(rest, "/")

	workspaceID := strings.TrimSpace(parts[0])
	if workspaceID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			a.handleGetWorkspace(w, r, workspaceID)
			return
		case http.MethodPut:
			a.handleUpdateWorkspace(w, r, workspaceID)
			return
		case http.MethodDelete:
			a.handleDeleteWorkspace(w, r, workspaceID)
			return
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	}

	if len(parts) == 2 && parts[1] == "settings" {
		switch r.Method {
		case http.MethodGet:
			a.handleGetWorkspaceSettings(w, r, workspaceID)
			return
		case http.MethodPut:
			a.handleUpdateWorkspaceSettings(w, r, workspaceID)
			return
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	}

	// M11 - Usage tracking
	if len(parts) == 2 && parts[1] == "usage" {
		a.handleGetWorkspaceUsage(w, r, workspaceID)
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`
		SELECT w.id, w.name, w.created_at, m.role
		FROM workspaces w
		JOIN workspace_memberships m ON m.workspace_id = w.id
		WHERE m.user_id = $1
		ORDER BY w.created_at DESC
		`,
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query workspaces"})
		return
	}
	defer rows.Close()

	items := make([]workspace, 0)
	for rows.Next() {
		var ws workspace
		var role string
		if err := rows.Scan(&ws.ID, &ws.Name, &ws.CreatedAt, &role); err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan workspace"})
			return
		}
		ws.Membership = &workspaceMembership{Role: role}
		items = append(items, ws)
	}

	writeJSON(w, http.StatusOK, listWorkspacesResponse{Items: items})
}

func (a *api) handleCreateWorkspace(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// M12 - Enforce workspace creation limit
	requestID := r.Header.Get("X-Request-ID")
	if !a.enforceWorkspaceCreation(w, r, userID, requestID) {
		return
	}

	var req createWorkspaceRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "name is required"})
		return
	}

	ws, err := a.createWorkspaceTx(r.Context(), req.Name, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create workspace"})
		return
	}

	writeJSON(w, http.StatusCreated, ws)
}

func (a *api) createWorkspaceTx(ctx context.Context, name string, userID string) (workspace, error) {
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return workspace{}, err
	}
	defer tx.Rollback()

	var ws workspace
	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO workspaces (name, created_by_user_id) VALUES ($1, $2) RETURNING id, name, created_at`,
		name,
		userID,
	).Scan(&ws.ID, &ws.Name, &ws.CreatedAt)
	if err != nil {
		return workspace{}, err
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
		ws.ID,
		userID,
		"owner",
	)
	if err != nil {
		return workspace{}, err
	}

	_, err = tx.ExecContext(
		ctx,
		`INSERT INTO workspace_settings (workspace_id) VALUES ($1)`,
		ws.ID,
	)
	if err != nil {
		return workspace{}, err
	}

	if err := tx.Commit(); err != nil {
		return workspace{}, err
	}

	return ws, nil
}

func (a *api) handleGetWorkspace(w http.ResponseWriter, r *http.Request, workspaceID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var ws workspace
	var role string
	err := a.db.QueryRowContext(
		r.Context(),
		`
		SELECT w.id, w.name, w.created_at, m.role
		FROM workspaces w
		JOIN workspace_memberships m ON m.workspace_id = w.id
		WHERE w.id = $1 AND m.user_id = $2
		`,
		workspaceID,
		userID,
	).Scan(&ws.ID, &ws.Name, &ws.CreatedAt, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace"})
		return
	}
	ws.Membership = &workspaceMembership{Role: role}

	writeJSON(w, http.StatusOK, ws)
}

type updateWorkspaceRequest struct {
	Name string `json:"name"`
}

func (a *api) handleUpdateWorkspace(w http.ResponseWriter, r *http.Request, workspaceID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check if user is owner
	isOwner, err := a.isWorkspaceOwner(r.Context(), workspaceID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check ownership"})
		return
	}
	if !isOwner {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "only the owner can update the workspace"})
		return
	}

	var req updateWorkspaceRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "name is required"})
		return
	}

	var ws workspace
	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING id, name, created_at`,
		req.Name,
		workspaceID,
	).Scan(&ws.ID, &ws.Name, &ws.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update workspace"})
		return
	}

	writeJSON(w, http.StatusOK, ws)
}

func (a *api) handleDeleteWorkspace(w http.ResponseWriter, r *http.Request, workspaceID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check if user is owner
	isOwner, err := a.isWorkspaceOwner(r.Context(), workspaceID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check ownership"})
		return
	}
	if !isOwner {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "only the owner can delete the workspace"})
		return
	}

	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM workspaces WHERE id = $1`,
		workspaceID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete workspace"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *api) isWorkspaceOwner(ctx context.Context, workspaceID string, userID string) (bool, error) {
	var role string
	err := a.db.QueryRowContext(
		ctx,
		`SELECT role FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID,
		userID,
	).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return role == "owner", nil
}

type workspaceSettings struct {
	WorkspaceID string    `json:"workspace_id"`
	PJTaxRate   float64   `json:"pj_tax_rate"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a *api) handleGetWorkspaceSettings(w http.ResponseWriter, r *http.Request, workspaceID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	var s workspaceSettings
	s.WorkspaceID = workspaceID
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT pj_tax_rate, updated_at FROM workspace_settings WHERE workspace_id = $1`,
		workspaceID,
	).Scan(&s.PJTaxRate, &s.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "settings not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch settings"})
		return
	}

	writeJSON(w, http.StatusOK, s)
}

type updateWorkspaceSettingsRequest struct {
	PJTaxRate float64 `json:"pj_tax_rate"`
}

func (a *api) handleUpdateWorkspaceSettings(w http.ResponseWriter, r *http.Request, workspaceID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	var req updateWorkspaceSettingsRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}
	if req.PJTaxRate < 0 || req.PJTaxRate > 1 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "pj_tax_rate must be between 0 and 1"})
		return
	}

	var s workspaceSettings
	s.WorkspaceID = workspaceID
	err := a.db.QueryRowContext(
		r.Context(),
		`UPDATE workspace_settings SET pj_tax_rate = $1, updated_at = now() WHERE workspace_id = $2 RETURNING pj_tax_rate, updated_at`,
		req.PJTaxRate,
		workspaceID,
	).Scan(&s.PJTaxRate, &s.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update settings"})
		return
	}

	writeJSON(w, http.StatusOK, s)
}

func (a *api) hasWorkspaceMembership(ctx context.Context, workspaceID string, userID string) (bool, error) {
	var exists bool
	err := a.db.QueryRowContext(
		ctx,
		`SELECT EXISTS (SELECT 1 FROM workspace_memberships WHERE workspace_id = $1 AND user_id = $2)`,
		workspaceID,
		userID,
	).Scan(&exists)
	return exists, err
}
