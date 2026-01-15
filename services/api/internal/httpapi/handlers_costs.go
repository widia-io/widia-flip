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
	EventTypeCostAdded      = "cost_added"
	EventTypeCostUpdated    = "cost_updated"
	EventTypeCostMarkedPaid = "cost_marked_paid"
)

// Valid cost types and statuses
var (
	validCostTypes    = map[string]bool{"renovation": true, "legal": true, "tax": true, "other": true}
	validCostStatuses = map[string]bool{"planned": true, "paid": true}
)

type costItem struct {
	ID             string    `json:"id"`
	PropertyID     string    `json:"property_id"`
	WorkspaceID    string    `json:"workspace_id"`
	CostType       string    `json:"cost_type"`
	Category       *string   `json:"category"`
	Status         string    `json:"status"`
	Amount         float64   `json:"amount"`
	DueDate        *string   `json:"due_date"`
	Vendor         *string   `json:"vendor"`
	SupplierID     *string   `json:"supplier_id"`
	Notes          *string   `json:"notes"`
	ScheduleItemID *string   `json:"schedule_item_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type createCostRequest struct {
	CostType   string  `json:"cost_type"`
	Category   *string `json:"category"`
	Status     *string `json:"status"`
	Amount     float64 `json:"amount"`
	DueDate    *string `json:"due_date"`
	Vendor     *string `json:"vendor"`
	SupplierID *string `json:"supplier_id"`
	Notes      *string `json:"notes"`
}

type updateCostRequest struct {
	CostType   *string  `json:"cost_type"`
	Category   *string  `json:"category"`
	Status     *string  `json:"status"`
	Amount     *float64 `json:"amount"`
	DueDate    *string  `json:"due_date"`
	Vendor     *string  `json:"vendor"`
	SupplierID *string  `json:"supplier_id"`
	Notes      *string  `json:"notes"`
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

// handleCostsSubroutes routes /api/v1/costs/:costId and /api/v1/costs/:costId/mark-paid
func (a *api) handleCostsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/costs/")
	rest = strings.TrimSpace(rest)
	if rest == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// Handle /api/v1/costs/:costId/mark-paid
	if strings.HasSuffix(rest, "/mark-paid") {
		costID := strings.TrimSuffix(rest, "/mark-paid")
		if costID == "" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if r.Method == http.MethodPatch {
			a.handleMarkCostPaid(w, r, costID)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Handle /api/v1/costs/:costId
	costID := rest
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
		`SELECT id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, supplier_id, notes, schedule_item_id, created_at, updated_at
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
		var supplierID sql.NullString
		var scheduleItemID sql.NullString
		err := rows.Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &supplierID, &c.Notes, &scheduleItemID, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan cost"})
			return
		}
		if dueDate.Valid {
			c.DueDate = &dueDate.String
		}
		if supplierID.Valid {
			c.SupplierID = &supplierID.String
		}
		if scheduleItemID.Valid {
			c.ScheduleItemID = &scheduleItemID.String
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
	var supplierID sql.NullString
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO cost_items (workspace_id, property_id, cost_type, category, status, amount, due_date, vendor, supplier_id, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, supplier_id, notes, created_at, updated_at`,
		workspaceID, propertyID, req.CostType, req.Category, status, req.Amount, req.DueDate, req.Vendor, req.SupplierID, req.Notes,
	).Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &supplierID, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create cost", Details: []string{err.Error()}})
		return
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.String
	}
	if supplierID.Valid {
		c.SupplierID = &supplierID.String
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

	// Check access via cost and check if linked to schedule
	var workspaceID, propertyID string
	var scheduleItemID sql.NullString
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT c.workspace_id, c.property_id, c.schedule_item_id
		 FROM cost_items c
		 JOIN workspace_memberships m ON m.workspace_id = c.workspace_id
		 WHERE c.id = $1 AND m.user_id = $2`,
		costID, userID,
	).Scan(&workspaceID, &propertyID, &scheduleItemID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost"})
		return
	}

	// Block editing if linked to schedule
	if scheduleItemID.Valid {
		writeError(w, http.StatusForbidden, apiError{Code: "LINKED_TO_SCHEDULE", Message: "Este custo está vinculado ao cronograma. Edite pelo cronograma."})
		return
	}

	// Update cost
	var c costItem
	var dueDate sql.NullString
	var supplierID sql.NullString
	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE cost_items SET
		   cost_type = COALESCE($1, cost_type),
		   category = COALESCE($2, category),
		   status = COALESCE($3, status),
		   amount = COALESCE($4, amount),
		   due_date = COALESCE($5, due_date),
		   vendor = COALESCE($6, vendor),
		   supplier_id = COALESCE($7, supplier_id),
		   notes = COALESCE($8, notes),
		   updated_at = now()
		 WHERE id = $9
		 RETURNING id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, supplier_id, notes, created_at, updated_at`,
		req.CostType, req.Category, req.Status, req.Amount, req.DueDate, req.Vendor, req.SupplierID, req.Notes, costID,
	).Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &supplierID, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update cost", Details: []string{err.Error()}})
		return
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.String
	}
	if supplierID.Valid {
		c.SupplierID = &supplierID.String
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

	// Check access via cost and check if linked to schedule
	var workspaceID string
	var scheduleItemID sql.NullString
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT c.workspace_id, c.schedule_item_id
		 FROM cost_items c
		 JOIN workspace_memberships m ON m.workspace_id = c.workspace_id
		 WHERE c.id = $1 AND m.user_id = $2`,
		costID, userID,
	).Scan(&workspaceID, &scheduleItemID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost"})
		return
	}

	// Block deleting if linked to schedule
	if scheduleItemID.Valid {
		writeError(w, http.StatusForbidden, apiError{Code: "LINKED_TO_SCHEDULE", Message: "Este custo está vinculado ao cronograma. Delete pelo cronograma."})
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

// handleMarkCostPaid toggles cost status between planned and paid
// Works for all costs including schedule-linked ones
func (a *api) handleMarkCostPaid(w http.ResponseWriter, r *http.Request, costID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access and get current status
	var workspaceID, propertyID, currentStatus string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT c.workspace_id, c.property_id, c.status
		 FROM cost_items c
		 JOIN workspace_memberships m ON m.workspace_id = c.workspace_id
		 WHERE c.id = $1 AND m.user_id = $2`,
		costID, userID,
	).Scan(&workspaceID, &propertyID, &currentStatus)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "cost not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check cost"})
		return
	}

	// Toggle status
	newStatus := "paid"
	if currentStatus == "paid" {
		newStatus = "planned"
	}

	// Update cost status
	var c costItem
	var dueDate, scheduleItemID sql.NullString
	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE cost_items SET status = $1, updated_at = now()
		 WHERE id = $2
		 RETURNING id, property_id, workspace_id, cost_type, category, status, amount, due_date, vendor, notes, schedule_item_id, created_at, updated_at`,
		newStatus, costID,
	).Scan(&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount, &dueDate, &c.Vendor, &c.Notes, &scheduleItemID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update cost status", Details: []string{err.Error()}})
		return
	}
	if dueDate.Valid {
		c.DueDate = &dueDate.String
	}
	if scheduleItemID.Valid {
		c.ScheduleItemID = &scheduleItemID.String
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeCostMarkedPaid, map[string]any{
		"cost_id":     c.ID,
		"old_status":  currentStatus,
		"new_status":  newStatus,
		"amount":      c.Amount,
		"is_schedule": scheduleItemID.Valid,
	}, userID)

	writeJSON(w, http.StatusOK, c)
}

// ========== Workspace-level costs (Custos centralizado) ==========

type workspaceCostItem struct {
	ID              string    `json:"id"`
	PropertyID      string    `json:"property_id"`
	WorkspaceID     string    `json:"workspace_id"`
	CostType        string    `json:"cost_type"`
	Category        *string   `json:"category"`
	Status          string    `json:"status"`
	Amount          float64   `json:"amount"`
	DueDate         *string   `json:"due_date"`
	Vendor          *string   `json:"vendor"`
	SupplierID      *string   `json:"supplier_id"`
	Notes           *string   `json:"notes"`
	ScheduleItemID  *string   `json:"schedule_item_id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	PropertyName    string    `json:"property_name"`
	PropertyAddress *string   `json:"property_address"`
}

type costsByTypeAggregation struct {
	CostType     string  `json:"cost_type"`
	TotalPlanned float64 `json:"total_planned"`
	TotalPaid    float64 `json:"total_paid"`
}

type costsByPropertyAggregation struct {
	PropertyID      string  `json:"property_id"`
	PropertyName    string  `json:"property_name"`
	PropertyAddress *string `json:"property_address"`
	TotalPlanned    float64 `json:"total_planned"`
	TotalPaid       float64 `json:"total_paid"`
}

type upcomingCost struct {
	workspaceCostItem
	DaysUntilDue int `json:"days_until_due"`
}

type workspaceCostsSummary struct {
	TotalPlanned  float64                      `json:"total_planned"`
	TotalPaid     float64                      `json:"total_paid"`
	TotalAll      float64                      `json:"total_all"`
	ByType        []costsByTypeAggregation     `json:"by_type"`
	ByProperty    []costsByPropertyAggregation `json:"by_property"`
	UpcomingCount int                          `json:"upcoming_count"`
}

type listWorkspaceCostsResponse struct {
	Items    []workspaceCostItem   `json:"items"`
	Summary  workspaceCostsSummary `json:"summary"`
	Upcoming []upcomingCost        `json:"upcoming"`
}

// handleWorkspaceCosts handles GET /api/v1/workspaces/:id/costs
func (a *api) handleWorkspaceCosts(w http.ResponseWriter, r *http.Request, workspaceID string) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check workspace membership
	if hasMembership, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !hasMembership {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	// Query all costs with property info
	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT c.id, c.property_id, c.workspace_id, c.cost_type, c.category, c.status, c.amount,
		        c.due_date, c.vendor, c.supplier_id, c.notes, c.schedule_item_id, c.created_at, c.updated_at,
		        COALESCE(p.address, p.neighborhood, 'Sem endereço') as property_name, p.address as property_address
		 FROM cost_items c
		 JOIN properties p ON p.id = c.property_id
		 WHERE c.workspace_id = $1
		 ORDER BY c.created_at DESC`,
		workspaceID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query costs"})
		return
	}
	defer rows.Close()

	items := make([]workspaceCostItem, 0)
	var totalPlanned, totalPaid float64
	typeAgg := make(map[string]*costsByTypeAggregation)
	propAgg := make(map[string]*costsByPropertyAggregation)

	for rows.Next() {
		var c workspaceCostItem
		var dueDate, supplierID, scheduleItemID, propAddr sql.NullString
		err := rows.Scan(
			&c.ID, &c.PropertyID, &c.WorkspaceID, &c.CostType, &c.Category, &c.Status, &c.Amount,
			&dueDate, &c.Vendor, &supplierID, &c.Notes, &scheduleItemID, &c.CreatedAt, &c.UpdatedAt,
			&c.PropertyName, &propAddr,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan cost"})
			return
		}
		if dueDate.Valid {
			c.DueDate = &dueDate.String
		}
		if supplierID.Valid {
			c.SupplierID = &supplierID.String
		}
		if scheduleItemID.Valid {
			c.ScheduleItemID = &scheduleItemID.String
		}
		if propAddr.Valid {
			c.PropertyAddress = &propAddr.String
		}
		items = append(items, c)

		// Aggregate totals
		if c.Status == "planned" {
			totalPlanned += c.Amount
		} else if c.Status == "paid" {
			totalPaid += c.Amount
		}

		// Aggregate by type
		if _, exists := typeAgg[c.CostType]; !exists {
			typeAgg[c.CostType] = &costsByTypeAggregation{CostType: c.CostType}
		}
		if c.Status == "planned" {
			typeAgg[c.CostType].TotalPlanned += c.Amount
		} else if c.Status == "paid" {
			typeAgg[c.CostType].TotalPaid += c.Amount
		}

		// Aggregate by property
		if _, exists := propAgg[c.PropertyID]; !exists {
			propAgg[c.PropertyID] = &costsByPropertyAggregation{
				PropertyID:      c.PropertyID,
				PropertyName:    c.PropertyName,
				PropertyAddress: c.PropertyAddress,
			}
		}
		if c.Status == "planned" {
			propAgg[c.PropertyID].TotalPlanned += c.Amount
		} else if c.Status == "paid" {
			propAgg[c.PropertyID].TotalPaid += c.Amount
		}
	}

	// Convert aggregation maps to slices
	byType := make([]costsByTypeAggregation, 0, len(typeAgg))
	for _, v := range typeAgg {
		byType = append(byType, *v)
	}
	byProperty := make([]costsByPropertyAggregation, 0, len(propAgg))
	for _, v := range propAgg {
		byProperty = append(byProperty, *v)
	}

	// Query upcoming costs (next 30 days)
	upcomingRows, err := a.db.QueryContext(
		r.Context(),
		`SELECT c.id, c.property_id, c.workspace_id, c.cost_type, c.category, c.status, c.amount,
		        c.due_date, c.vendor, c.supplier_id, c.notes, c.schedule_item_id, c.created_at, c.updated_at,
		        COALESCE(p.address, p.neighborhood, 'Sem endereço') as property_name, p.address as property_address,
		        (c.due_date::date - CURRENT_DATE) as days_until_due
		 FROM cost_items c
		 JOIN properties p ON p.id = c.property_id
		 WHERE c.workspace_id = $1
		   AND c.due_date IS NOT NULL
		   AND c.due_date::date >= CURRENT_DATE
		   AND c.due_date::date <= CURRENT_DATE + INTERVAL '30 days'
		   AND c.status = 'planned'
		 ORDER BY c.due_date ASC
		 LIMIT 10`,
		workspaceID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query upcoming costs"})
		return
	}
	defer upcomingRows.Close()

	upcoming := make([]upcomingCost, 0)
	for upcomingRows.Next() {
		var uc upcomingCost
		var dueDate, supplierID, scheduleItemID, propAddr sql.NullString
		err := upcomingRows.Scan(
			&uc.ID, &uc.PropertyID, &uc.WorkspaceID, &uc.CostType, &uc.Category, &uc.Status, &uc.Amount,
			&dueDate, &uc.Vendor, &supplierID, &uc.Notes, &scheduleItemID, &uc.CreatedAt, &uc.UpdatedAt,
			&uc.PropertyName, &propAddr, &uc.DaysUntilDue,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan upcoming cost"})
			return
		}
		if dueDate.Valid {
			uc.DueDate = &dueDate.String
		}
		if supplierID.Valid {
			uc.SupplierID = &supplierID.String
		}
		if scheduleItemID.Valid {
			uc.ScheduleItemID = &scheduleItemID.String
		}
		if propAddr.Valid {
			uc.PropertyAddress = &propAddr.String
		}
		upcoming = append(upcoming, uc)
	}

	writeJSON(w, http.StatusOK, listWorkspaceCostsResponse{
		Items: items,
		Summary: workspaceCostsSummary{
			TotalPlanned:  totalPlanned,
			TotalPaid:     totalPaid,
			TotalAll:      totalPlanned + totalPaid,
			ByType:        byType,
			ByProperty:    byProperty,
			UpcomingCount: len(upcoming),
		},
		Upcoming: upcoming,
	})
}
