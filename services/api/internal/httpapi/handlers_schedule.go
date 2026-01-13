package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Timeline event types for schedule
const (
	EventTypeScheduleItemCreated   = "schedule_item_created"
	EventTypeScheduleItemCompleted = "schedule_item_completed"
	EventTypeScheduleItemUpdated   = "schedule_item_updated"
	dateFormatISO                  = "2006-01-02"
)

// Valid schedule categories
var validScheduleCategories = map[string]bool{
	"demolition": true,
	"structural": true,
	"electrical": true,
	"plumbing":   true,
	"flooring":   true,
	"painting":   true,
	"finishing":  true,
	"cleaning":   true,
	"other":      true,
}

type scheduleItem struct {
	ID            string    `json:"id"`
	PropertyID    string    `json:"property_id"`
	WorkspaceID   string    `json:"workspace_id"`
	Title         string    `json:"title"`
	PlannedDate   string    `json:"planned_date"`
	DoneAt        *string   `json:"done_at"`
	Notes         *string   `json:"notes"`
	OrderIndex    *int      `json:"order_index"`
	Category      *string   `json:"category"`
	EstimatedCost *float64  `json:"estimated_cost"`
	LinkedCostID  *string   `json:"linked_cost_id"`
	DocumentCount int       `json:"document_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type scheduleSummary struct {
	TotalItems         int     `json:"total_items"`
	CompletedItems     int     `json:"completed_items"`
	OverdueItems       int     `json:"overdue_items"`
	Upcoming7Days      int     `json:"upcoming_7_days"`
	ProgressPercent    float64 `json:"progress_percent"`
	EstimatedTotal     float64 `json:"estimated_total"`
	CompletedEstimated float64 `json:"completed_estimated"`
}

type listScheduleResponse struct {
	Items   []scheduleItem  `json:"items"`
	Summary scheduleSummary `json:"summary"`
}

// Workspace-level schedule types
type workspaceScheduleItem struct {
	scheduleItem
	PropertyName    string  `json:"property_name"`
	PropertyAddress *string `json:"property_address"`
}

type listWorkspaceScheduleResponse struct {
	Items   []workspaceScheduleItem `json:"items"`
	Summary scheduleSummary         `json:"summary"`
}

type createScheduleRequest struct {
	Title         string   `json:"title"`
	PlannedDate   string   `json:"planned_date"`
	Notes         *string  `json:"notes"`
	OrderIndex    *int     `json:"order_index"`
	Category      *string  `json:"category"`
	EstimatedCost *float64 `json:"estimated_cost"`
}

type updateScheduleRequest struct {
	Title         *string  `json:"title"`
	PlannedDate   *string  `json:"planned_date"`
	DoneAt        *string  `json:"done_at"`
	Notes         *string  `json:"notes"`
	OrderIndex    *int     `json:"order_index"`
	Category      *string  `json:"category"`
	EstimatedCost *float64 `json:"estimated_cost"`
}

// handlePropertySchedule routes /api/v1/properties/:id/schedule
func (a *api) handlePropertySchedule(w http.ResponseWriter, r *http.Request, propertyID string) {
	switch r.Method {
	case http.MethodGet:
		a.handleListSchedule(w, r, propertyID)
	case http.MethodPost:
		a.handleCreateScheduleItem(w, r, propertyID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// handleScheduleSubroutes routes /api/v1/schedule/:itemId and /api/v1/schedule/:itemId/documents
func (a *api) handleScheduleSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/schedule/")
	parts := strings.Split(rest, "/")

	itemID := strings.TrimSpace(parts[0])
	if itemID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/schedule/:itemId/documents
	if len(parts) == 2 && parts[1] == "documents" {
		if r.Method == http.MethodGet {
			a.handleListScheduleItemDocuments(w, r, itemID)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// /api/v1/schedule/:itemId
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodPut:
			a.handleUpdateScheduleItem(w, r, itemID)
		case http.MethodDelete:
			a.handleDeleteScheduleItem(w, r, itemID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleListSchedule(w http.ResponseWriter, r *http.Request, propertyID string) {
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
		`SELECT s.id, s.property_id, s.workspace_id, s.title, s.planned_date, s.done_at, s.notes, s.order_index, s.category, s.estimated_cost, c.id as linked_cost_id,
		        (SELECT COUNT(*) FROM documents d WHERE d.schedule_item_id = s.id) as document_count,
		        s.created_at, s.updated_at
		 FROM schedule_items s
		 LEFT JOIN cost_items c ON c.schedule_item_id = s.id
		 WHERE s.property_id = $1
		 ORDER BY s.done_at NULLS FIRST, s.planned_date ASC`,
		propertyID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query schedule"})
		return
	}
	defer rows.Close()

	items := make([]scheduleItem, 0)
	// Use date strings for comparison to avoid timezone issues
	todayStr := time.Now().Format(dateFormatISO)
	in7DaysStr := time.Now().AddDate(0, 0, 7).Format(dateFormatISO)

	var summary scheduleSummary

	for rows.Next() {
		var s scheduleItem
		var plannedDate time.Time
		var doneAt sql.NullTime
		var orderIndex sql.NullInt32
		var estimatedCost sql.NullFloat64
		var linkedCostID sql.NullString

		err := rows.Scan(
			&s.ID, &s.PropertyID, &s.WorkspaceID, &s.Title, &plannedDate,
			&doneAt, &s.Notes, &orderIndex, &s.Category, &estimatedCost,
			&linkedCostID, &s.DocumentCount, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan schedule item"})
			return
		}

		s.PlannedDate = plannedDate.Format(dateFormatISO)

		if doneAt.Valid {
			doneAtStr := doneAt.Time.Format(time.RFC3339)
			s.DoneAt = &doneAtStr
		}
		if orderIndex.Valid {
			idx := int(orderIndex.Int32)
			s.OrderIndex = &idx
		}
		if estimatedCost.Valid {
			s.EstimatedCost = &estimatedCost.Float64
			summary.EstimatedTotal += estimatedCost.Float64
		}
		if linkedCostID.Valid {
			s.LinkedCostID = &linkedCostID.String
		}

		items = append(items, s)
		summary.TotalItems++

		// Calculate summary metrics using date string comparison
		if doneAt.Valid {
			summary.CompletedItems++
			if estimatedCost.Valid {
				summary.CompletedEstimated += estimatedCost.Float64
			}
		} else {
			// Not done - check if overdue or upcoming
			if s.PlannedDate < todayStr {
				summary.OverdueItems++
			} else if s.PlannedDate <= in7DaysStr {
				summary.Upcoming7Days++
			}
		}
	}

	if summary.TotalItems > 0 {
		summary.ProgressPercent = float64(summary.CompletedItems) / float64(summary.TotalItems) * 100
	}

	writeJSON(w, http.StatusOK, listScheduleResponse{
		Items:   items,
		Summary: summary,
	})
}

func (a *api) handleCreateScheduleItem(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createScheduleRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if strings.TrimSpace(req.Title) == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "title is required"})
		return
	}
	if req.PlannedDate == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "planned_date is required"})
		return
	}
	// Validate date format
	_, err := time.Parse(dateFormatISO, req.PlannedDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "planned_date must be YYYY-MM-DD"})
		return
	}
	if req.Category != nil && *req.Category != "" && !validScheduleCategories[*req.Category] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid category"})
		return
	}
	if req.EstimatedCost != nil && *req.EstimatedCost < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "estimated_cost must be >= 0"})
		return
	}

	// Check access and get workspace_id
	var workspaceID string
	err = a.db.QueryRowContext(
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

	// Insert schedule item
	var s scheduleItem
	var plannedDate time.Time
	var doneAt sql.NullTime
	var orderIndex sql.NullInt32
	var estimatedCost sql.NullFloat64

	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO schedule_items (workspace_id, property_id, title, planned_date, notes, order_index, category, estimated_cost)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, property_id, workspace_id, title, planned_date, done_at, notes, order_index, category, estimated_cost, created_at, updated_at`,
		workspaceID, propertyID, req.Title, req.PlannedDate, req.Notes, req.OrderIndex, req.Category, req.EstimatedCost,
	).Scan(
		&s.ID, &s.PropertyID, &s.WorkspaceID, &s.Title, &plannedDate,
		&doneAt, &s.Notes, &orderIndex, &s.Category, &estimatedCost,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create schedule item", Details: []string{err.Error()}})
		return
	}

	s.PlannedDate = plannedDate.Format(dateFormatISO)
	if doneAt.Valid {
		doneAtStr := doneAt.Time.Format(time.RFC3339)
		s.DoneAt = &doneAtStr
	}
	if orderIndex.Valid {
		idx := int(orderIndex.Int32)
		s.OrderIndex = &idx
	}
	if estimatedCost.Valid {
		s.EstimatedCost = &estimatedCost.Float64
	}

	// Create linked cost_item if estimated_cost > 0
	if req.EstimatedCost != nil && *req.EstimatedCost > 0 {
		var costID string
		categoryStr := ""
		if req.Category != nil {
			categoryStr = *req.Category
		}
		notesStr := "Cronograma: " + req.Title

		err = a.db.QueryRowContext(
			r.Context(),
			`INSERT INTO cost_items (workspace_id, property_id, schedule_item_id, cost_type, category, status, amount, due_date, notes)
			 VALUES ($1, $2, $3, 'renovation', $4, 'planned', $5, $6, $7)
			 RETURNING id`,
			workspaceID, propertyID, s.ID, categoryStr, *req.EstimatedCost, req.PlannedDate, notesStr,
		).Scan(&costID)
		if err == nil {
			s.LinkedCostID = &costID
		}
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeScheduleItemCreated, map[string]any{
		"schedule_item_id": s.ID,
		"title":            s.Title,
		"planned_date":     s.PlannedDate,
	}, userID)

	writeJSON(w, http.StatusCreated, s)
}

func (a *api) handleUpdateScheduleItem(w http.ResponseWriter, r *http.Request, itemID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateScheduleRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate
	if req.Title != nil && strings.TrimSpace(*req.Title) == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "title cannot be empty"})
		return
	}
	if req.PlannedDate != nil {
		_, err := time.Parse(dateFormatISO, *req.PlannedDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "planned_date must be YYYY-MM-DD"})
			return
		}
	}
	if req.Category != nil && *req.Category != "" && !validScheduleCategories[*req.Category] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid category"})
		return
	}
	if req.EstimatedCost != nil && *req.EstimatedCost < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "estimated_cost must be >= 0"})
		return
	}

	// Check access and get previous state
	var workspaceID, propertyID string
	var prevDoneAt sql.NullTime
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id, s.property_id, s.done_at
		 FROM schedule_items s
		 JOIN workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		itemID, userID,
	).Scan(&workspaceID, &propertyID, &prevDoneAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "schedule item not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check schedule item"})
		return
	}

	// Update schedule item
	var s scheduleItem
	var plannedDate time.Time
	var doneAt sql.NullTime
	var orderIndex sql.NullInt32
	var estimatedCost sql.NullFloat64

	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE schedule_items SET
		   title = COALESCE($1, title),
		   planned_date = COALESCE($2, planned_date),
		   done_at = CASE WHEN $3::text = 'null' THEN NULL WHEN $3::text != '' THEN $3::timestamptz ELSE done_at END,
		   notes = COALESCE($4, notes),
		   order_index = COALESCE($5, order_index),
		   category = COALESCE($6, category),
		   estimated_cost = COALESCE($7, estimated_cost),
		   updated_at = now()
		 WHERE id = $8
		 RETURNING id, property_id, workspace_id, title, planned_date, done_at, notes, order_index, category, estimated_cost, created_at, updated_at`,
		req.Title, req.PlannedDate, formatDoneAtForUpdate(req.DoneAt), req.Notes, req.OrderIndex, req.Category, req.EstimatedCost, itemID,
	).Scan(
		&s.ID, &s.PropertyID, &s.WorkspaceID, &s.Title, &plannedDate,
		&doneAt, &s.Notes, &orderIndex, &s.Category, &estimatedCost,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update schedule item", Details: []string{err.Error()}})
		return
	}

	s.PlannedDate = plannedDate.Format(dateFormatISO)
	if doneAt.Valid {
		doneAtStr := doneAt.Time.Format(time.RFC3339)
		s.DoneAt = &doneAtStr
	}
	if orderIndex.Valid {
		idx := int(orderIndex.Int32)
		s.OrderIndex = &idx
	}
	if estimatedCost.Valid {
		s.EstimatedCost = &estimatedCost.Float64
	}

	// Sync linked cost_item
	s.LinkedCostID = a.syncLinkedCost(r.Context(), itemID, workspaceID, propertyID, s.Title, s.PlannedDate, s.Category, s.EstimatedCost)

	// Determine timeline event type
	wasCompleted := !prevDoneAt.Valid && doneAt.Valid
	if wasCompleted {
		a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeScheduleItemCompleted, map[string]any{
			"schedule_item_id": s.ID,
			"title":            s.Title,
		}, userID)
	} else {
		// Build changes map for timeline
		changes := make(map[string]any)
		if req.Title != nil {
			changes["title"] = *req.Title
		}
		if req.PlannedDate != nil {
			changes["planned_date"] = *req.PlannedDate
		}
		if req.DoneAt != nil {
			if *req.DoneAt == "" {
				changes["done_at"] = nil
			} else {
				changes["done_at"] = *req.DoneAt
			}
		}

		a.createTimelineEvent(r.Context(), propertyID, workspaceID, EventTypeScheduleItemUpdated, map[string]any{
			"schedule_item_id": s.ID,
			"changes":          changes,
		}, userID)
	}

	writeJSON(w, http.StatusOK, s)
}

// formatDoneAtForUpdate handles the done_at update logic:
// - nil pointer: keep existing value (return empty string)
// - pointer to empty string: set to null (return "null")
// - pointer to timestamp: set to that value (return the timestamp)
func formatDoneAtForUpdate(doneAt *string) string {
	if doneAt == nil {
		return ""
	}
	if *doneAt == "" {
		return "null"
	}
	return *doneAt
}

func (a *api) handleDeleteScheduleItem(w http.ResponseWriter, r *http.Request, itemID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via schedule item
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id
		 FROM schedule_items s
		 JOIN workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		itemID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "schedule item not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check schedule item"})
		return
	}

	// Delete schedule item
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM schedule_items WHERE id = $1`,
		itemID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete schedule item"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "schedule item not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// syncLinkedCost handles the sync between schedule_items and cost_items
// Returns the linked cost ID (or nil if no cost)
func (a *api) syncLinkedCost(ctx context.Context, scheduleItemID, workspaceID, propertyID, title, plannedDate string, category *string, estimatedCost *float64) *string {
	// Check if there's an existing linked cost
	var existingCostID sql.NullString
	_ = a.db.QueryRowContext(ctx,
		`SELECT id FROM cost_items WHERE schedule_item_id = $1`,
		scheduleItemID,
	).Scan(&existingCostID)

	// Determine what to do based on estimated_cost
	hasEstimatedCost := estimatedCost != nil && *estimatedCost > 0

	if hasEstimatedCost && !existingCostID.Valid {
		// Create new linked cost
		var costID string
		categoryStr := ""
		if category != nil {
			categoryStr = *category
		}
		notesStr := "Cronograma: " + title

		err := a.db.QueryRowContext(ctx,
			`INSERT INTO cost_items (workspace_id, property_id, schedule_item_id, cost_type, category, status, amount, due_date, notes)
			 VALUES ($1, $2, $3, 'renovation', $4, 'planned', $5, $6, $7)
			 RETURNING id`,
			workspaceID, propertyID, scheduleItemID, categoryStr, *estimatedCost, plannedDate, notesStr,
		).Scan(&costID)
		if err == nil {
			return &costID
		}
		return nil
	}

	if hasEstimatedCost && existingCostID.Valid {
		// Update existing linked cost
		categoryStr := ""
		if category != nil {
			categoryStr = *category
		}
		notesStr := "Cronograma: " + title

		_, _ = a.db.ExecContext(ctx,
			`UPDATE cost_items SET
			   amount = $1,
			   due_date = $2,
			   category = $3,
			   notes = $4,
			   updated_at = now()
			 WHERE id = $5`,
			*estimatedCost, plannedDate, categoryStr, notesStr, existingCostID.String,
		)
		return &existingCostID.String
	}

	if !hasEstimatedCost && existingCostID.Valid {
		// Delete linked cost (estimated_cost removed or set to 0)
		_, _ = a.db.ExecContext(ctx,
			`DELETE FROM cost_items WHERE id = $1`,
			existingCostID.String,
		)
		return nil
	}

	// No estimated_cost and no existing cost - nothing to do
	return nil
}

// handleWorkspaceSchedule handles GET /api/v1/workspaces/:id/schedule
func (a *api) handleWorkspaceSchedule(w http.ResponseWriter, r *http.Request, workspaceID string) {
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
	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT s.id, s.property_id, s.workspace_id, s.title, s.planned_date, s.done_at, s.notes, s.order_index, s.category, s.estimated_cost, c.id as linked_cost_id,
		        (SELECT COUNT(*) FROM documents d WHERE d.schedule_item_id = s.id) as document_count,
		        s.created_at, s.updated_at,
		        COALESCE(p.address, p.neighborhood, 'Sem endereço') as property_name, p.address as property_address
		 FROM schedule_items s
		 JOIN properties p ON p.id = s.property_id
		 LEFT JOIN cost_items c ON c.schedule_item_id = s.id
		 WHERE s.workspace_id = $1
		 ORDER BY s.done_at NULLS FIRST, s.planned_date ASC`,
		workspaceID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query schedule"})
		return
	}
	defer rows.Close()

	items := make([]workspaceScheduleItem, 0)
	todayStr := time.Now().Format(dateFormatISO)
	in7DaysStr := time.Now().AddDate(0, 0, 7).Format(dateFormatISO)

	var summary scheduleSummary

	for rows.Next() {
		var item workspaceScheduleItem
		var plannedDate time.Time
		var doneAt sql.NullTime
		var orderIndex sql.NullInt32
		var estimatedCost sql.NullFloat64
		var linkedCostID sql.NullString
		var propertyAddress sql.NullString

		err := rows.Scan(
			&item.ID, &item.PropertyID, &item.WorkspaceID, &item.Title, &plannedDate,
			&doneAt, &item.Notes, &orderIndex, &item.Category, &estimatedCost,
			&linkedCostID, &item.DocumentCount, &item.CreatedAt, &item.UpdatedAt,
			&item.PropertyName, &propertyAddress,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan schedule item"})
			return
		}

		item.PlannedDate = plannedDate.Format(dateFormatISO)

		if doneAt.Valid {
			doneAtStr := doneAt.Time.Format(time.RFC3339)
			item.DoneAt = &doneAtStr
		}
		if orderIndex.Valid {
			idx := int(orderIndex.Int32)
			item.OrderIndex = &idx
		}
		if estimatedCost.Valid {
			item.EstimatedCost = &estimatedCost.Float64
			summary.EstimatedTotal += estimatedCost.Float64
		}
		if linkedCostID.Valid {
			item.LinkedCostID = &linkedCostID.String
		}
		if propertyAddress.Valid {
			item.PropertyAddress = &propertyAddress.String
		}

		items = append(items, item)
		summary.TotalItems++

		// Calculate summary metrics
		if doneAt.Valid {
			summary.CompletedItems++
			if estimatedCost.Valid {
				summary.CompletedEstimated += estimatedCost.Float64
			}
		} else {
			if item.PlannedDate < todayStr {
				summary.OverdueItems++
			} else if item.PlannedDate <= in7DaysStr {
				summary.Upcoming7Days++
			}
		}
	}

	if summary.TotalItems > 0 {
		summary.ProgressPercent = float64(summary.CompletedItems) / float64(summary.TotalItems) * 100
	}

	writeJSON(w, http.StatusOK, listWorkspaceScheduleResponse{
		Items:   items,
		Summary: summary,
	})
}

// handleListScheduleItemDocuments lists documents attached to a schedule item
func (a *api) handleListScheduleItemDocuments(w http.ResponseWriter, r *http.Request, itemID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access via schedule_item and workspace membership
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id
		 FROM schedule_items s
		 JOIN workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		itemID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "schedule item not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check schedule item"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT id, workspace_id, property_id, cost_item_id, supplier_id, schedule_item_id, storage_key, storage_provider, filename, content_type, size_bytes, tags, created_at
		 FROM documents
		 WHERE schedule_item_id = $1
		 ORDER BY created_at DESC`,
		itemID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query documents"})
		return
	}
	defer rows.Close()

	type scheduleDocument struct {
		ID              string    `json:"id"`
		WorkspaceID     string    `json:"workspace_id"`
		PropertyID      *string   `json:"property_id"`
		CostItemID      *string   `json:"cost_item_id"`
		SupplierID      *string   `json:"supplier_id"`
		ScheduleItemID  *string   `json:"schedule_item_id"`
		StorageKey      string    `json:"storage_key"`
		StorageProvider string    `json:"storage_provider"`
		Filename        string    `json:"filename"`
		ContentType     *string   `json:"content_type"`
		SizeBytes       *int64    `json:"size_bytes"`
		Tags            []string  `json:"tags"`
		CreatedAt       time.Time `json:"created_at"`
	}

	items := make([]scheduleDocument, 0)
	for rows.Next() {
		var doc scheduleDocument
		var tagsArr pq.StringArray
		err := rows.Scan(&doc.ID, &doc.WorkspaceID, &doc.PropertyID, &doc.CostItemID, &doc.SupplierID, &doc.ScheduleItemID, &doc.StorageKey, &doc.StorageProvider, &doc.Filename, &doc.ContentType, &doc.SizeBytes, &tagsArr, &doc.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan document"})
			return
		}
		doc.Tags = tagsArr
		if doc.Tags == nil {
			doc.Tags = []string{}
		}
		items = append(items, doc)
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}
