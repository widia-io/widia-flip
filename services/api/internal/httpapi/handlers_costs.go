package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Timeline event types for costs
const (
	EventTypeCostAdded   = "cost_added"
	EventTypeCostUpdated = "cost_updated"
)

// Valid cost types and statuses
var (
	validCostTypes    = map[string]bool{"renovation": true, "legal": true, "tax": true, "other": true}
	validCostStatuses = map[string]bool{"planned": true, "paid": true}
)

type costItem struct {
	ID          string    `json:"id"`
	PropertyID  string    `json:"property_id"`
	WorkspaceID string    `json:"workspace_id"`
	CostType    string    `json:"cost_type"`
	Category    *string   `json:"category"`
	Status      string    `json:"status"`
	Amount      float64   `json:"amount"`
	DueDate     *string   `json:"due_date"`
	Vendor      *string   `json:"vendor"`
	Notes       *string   `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type createCostRequest struct {
	CostType string  `json:"cost_type"`
	Category *string `json:"category"`
	Status   *string `json:"status"`
	Amount   float64 `json:"amount"`
	DueDate  *string `json:"due_date"`
	Vendor   *string `json:"vendor"`
	Notes    *string `json:"notes"`
}

type updateCostRequest struct {
	CostType *string  `json:"cost_type"`
	Category *string  `json:"category"`
	Status   *string  `json:"status"`
	Amount   *float64 `json:"amount"`
	DueDate  *string  `json:"due_date"`
	Vendor   *string  `json:"vendor"`
	Notes    *string  `json:"notes"`
}

type listCostsResponse struct {
	Items        []costItem `json:"items"`
	TotalPlanned float64    `json:"total_planned"`
	TotalPaid    float64    `json:"total_paid"`
}

// handlePropertyCosts routes /api/v1/properties/:id/costs
func (a *api) handlePropertyCosts(w http.ResponseWriter, r *http.Request, propertyID string) {
	switch r.Method {
	case http.MethodGet:
		a.handleListCosts(w, r, propertyID)
	case http.MethodPost:
		a.handleCreateCost(w, r, propertyID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// handleCostsSubroutes routes /api/v1/costs/:costId
func (a *api) handleCostsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/costs/")
	costID := strings.TrimSpace(rest)
	if costID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	switch r.Method {
	case http.MethodPut:
		a.handleUpdateCost(w, r, costID)
	case http.MethodDelete:
		a.handleDeleteCost(w, r, costID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleListCosts(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, notes, created_at, updated_at
		 FROM cost_items
		 WHERE property_id = $1
		 ORDER BY created_at DESC`,
		propertyID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query costs"})
		return
	}
	defer rows.Close()

	items := make([]costItem, 0)
	var totalPlanned, totalPaid float64

	for rows.Next() {
		var c costItem
		var dueDate sql.NullString
		err := rows.Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan cost"})
			return
		}
		if dueDate.Valid {
			c.DueDate = &dueDate.String
		}
		items = append(items, c)

		if c.Status == "planned" {
			totalPlanned += c.Amount
		} else if c.Status == "paid" {
			totalPaid += c.Amount
		}
	}

	writeJSON(w, http.StatusOK, listCostsResponse{
		Items:        items,
		TotalPlanned: totalPlanned,
		TotalPaid:    totalPaid,
	})
}

func (a *api) handleCreateCost(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createCostRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if !validCostTypes[req.CostType] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cost_type must be one of: renovation, legal, tax, other"})
		return
	}
	if req.Amount < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "amount must be >= 0"})
		return
	}
	status := "planned"
	if req.Status != nil {
		if !validCostStatuses[*req.Status] {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "status must be one of: planned, paid"})
			return
		}
		status = *req.Status
	}

	// Check access and get workspace_id
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Insert cost
	var c costItem
	var dueDate sql.NullString
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO cost_items (workspace_id, property_id, cost_type, category, status, amount, due_date, vendor, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, notes, created_at, updated_at`,
		workspaceID, propertyID, req.CostType, req.Category, status, req.Amount, req.DueDate, req.Vendor, req.Notes,
	).Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create cost", Details: []string{err.Error()}})
		return
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.String
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeCostAdded, map[string]any{
		"cost_id":   c.ID,
		"cost_type": c.CostType,
		"amount":    c.Amount,
	}, userID)

	writeJSON(w, http.StatusCreated, c)
}

func (a *api) handleUpdateCost(w http.ResponseWriter, r *http.Request, costID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateCostRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if req.CostType != nil && !validCostTypes[*req.CostType] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "cost_type must be one of: renovation, legal, tax, other"})
		return
	}
	if req.Status != nil && !validCostStatuses[*req.Status] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "status must be one of: planned, paid"})
		return
	}
	if req.Amount != nil && *req.Amount < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "amount must be >= 0"})
		return
	}

	// Check access via cost
	var workspaceID, propertyID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT c.workspace_id, c.property_id
		 FROM cost_items c
		 JOIN workspace_memberships m ON m.workspace_id = c.workspace_id
		 WHERE c.id = $1 AND m.user_id = $2`,
		costID, userID,
	).Scan(&workspaceID, &propertyID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost"})
		return
	}

	// Update cost
	var c costItem
	var dueDate sql.NullString
	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE cost_items SET
		   cost_type = COALESCE($1, cost_type),
		   category = COALESCE($2, category),
		   status = COALESCE($3, status),
		   amount = COALESCE($4, amount),
		   due_date = COALESCE($5, due_date),
		   vendor = COALESCE($6, vendor),
		   notes = COALESCE($7, notes),
		   updated_at = now()
		 WHERE id = $8
		 RETURNING id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, notes, created_at, updated_at`,
		req.CostType, req.Category, req.Status, req.Amount, req.DueDate, req.Vendor, req.Notes, costID,
	).Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update cost", Details: []string{err.Error()}})
		return
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.String
	}

	// Build changes map for timeline
	changes := make(map[string]any)
	if req.CostType != nil {
		changes["cost_type"] = *req.CostType
	}
	if req.Status != nil {
		changes["status"] = *req.Status
	}
	if req.Amount != nil {
		changes["amount"] = *req.Amount
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeCostUpdated, map[string]any{
		"cost_id": c.ID,
		"changes": changes,
	}, userID)

	writeJSON(w, http.StatusOK, c)
}

func (a *api) handleDeleteCost(w http.ResponseWriter, r *http.Request, costID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via cost
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT c.workspace_id
		 FROM cost_items c
		 JOIN workspace_memberships m ON m.workspace_id = c.workspace_id
		 WHERE c.id = $1 AND m.user_id = $2`,
		costID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost"})
		return
	}

	// Delete cost
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM cost_items WHERE id = $1`,
		costID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete cost"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}


