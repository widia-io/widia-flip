package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Timeline event types
const (
	EventTypeStatusChanged     = "status_changed"
	EventTypeAnalysisCashSaved = "analysis_cash_saved"
)

type property struct {
	ID               string    `json:"id"`
	WorkspaceID      string    `json:"workspace_id"`
	OriginProspectID *string   `json:"origin_prospect_id"`
	StatusPipeline   string    `json:"status_pipeline"`
	Neighborhood     *string   `json:"neighborhood"`
	Address          *string   `json:"address"`
	AreaUsable       *float64  `json:"area_usable"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type listPropertiesResponse struct {
	Items      []property `json:"items"`
	NextCursor *string    `json:"next_cursor,omitempty"`
}

type createPropertyRequest struct {
	WorkspaceID    string   `json:"workspace_id"`
	Neighborhood   *string  `json:"neighborhood"`
	Address        *string  `json:"address"`
	AreaUsable     *float64 `json:"area_usable"`
	StatusPipeline *string  `json:"status_pipeline"`
}

type updatePropertyRequest struct {
	Neighborhood *string  `json:"neighborhood"`
	Address      *string  `json:"address"`
	AreaUsable   *float64 `json:"area_usable"`
}

type updateStatusRequest struct {
	StatusPipeline string `json:"status_pipeline"`
}

type timelineEvent struct {
	ID          string          `json:"id"`
	PropertyID  string          `json:"property_id"`
	WorkspaceID string          `json:"workspace_id"`
	EventType   string          `json:"event_type"`
	Payload     json.RawMessage `json:"payload,omitempty"`
	ActorUserID *string         `json:"actor_user_id,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

type listTimelineResponse struct {
	Items []timelineEvent `json:"items"`
}

func (a *api) handlePropertiesCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListProperties(w, r)
	case http.MethodPost:
		a.handleCreateProperty(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handlePropertiesSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/properties/")
	parts := strings.Split(rest, "/")

	propertyID := strings.TrimSpace(parts[0])
	if propertyID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/properties/:id/status
	if len(parts) == 2 && parts[1] == "status" {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleUpdatePropertyStatus(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/timeline
	if len(parts) == 2 && parts[1] == "timeline" {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleGetPropertyTimeline(w, r, propertyID)
		return
	}

	// /api/v1/properties/:id/analysis/cash/...
	if len(parts) >= 3 && parts[1] == "analysis" && parts[2] == "cash" {
		a.handlePropertyCashAnalysis(w, r, propertyID, parts[3:])
		return
	}

	// /api/v1/properties/:id
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			a.handleGetProperty(w, r, propertyID)
		case http.MethodPut:
			a.handleUpdateProperty(w, r, propertyID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleListProperties(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id is required"})
		return
	}

	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	// Query params
	statusPipeline := r.URL.Query().Get("status_pipeline")
	limitStr := r.URL.Query().Get("limit")
	cursor := r.URL.Query().Get("cursor")

	limit := 50
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Build query
	query := `
		SELECT id, workspace_id, origin_prospect_id, status_pipeline, neighborhood, address, area_usable, created_at, updated_at
		FROM properties
		WHERE workspace_id = $1
	`
	args := []any{workspaceID}
	argIdx := 2

	if statusPipeline != "" {
		query += ` AND status_pipeline = $` + strconv.Itoa(argIdx)
		args = append(args, statusPipeline)
		argIdx++
	}

	if cursor != "" {
		query += ` AND created_at < $` + strconv.Itoa(argIdx)
		args = append(args, cursor)
		argIdx++
	}

	query += ` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(argIdx)
	args = append(args, limit+1)

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query properties"})
		return
	}
	defer rows.Close()

	items := make([]property, 0)
	for rows.Next() {
		var p property
		err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline,
			&p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan property"})
			return
		}
		items = append(items, p)
	}

	var nextCursor *string
	if len(items) > limit {
		items = items[:limit]
		c := items[limit-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	writeJSON(w, http.StatusOK, listPropertiesResponse{Items: items, NextCursor: nextCursor})
}

func (a *api) handleCreateProperty(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createPropertyRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	req.WorkspaceID = strings.TrimSpace(req.WorkspaceID)
	if req.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id is required"})
		return
	}

	if ok, err := a.hasWorkspaceMembership(r.Context(), req.WorkspaceID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check membership"})
		return
	} else if !ok {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "workspace not found"})
		return
	}

	// Validate area_usable
	if req.AreaUsable != nil && *req.AreaUsable <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "area_usable must be greater than 0"})
		return
	}

	// Default status
	status := PropertyStatusAnalyzing
	if req.StatusPipeline != nil && isValidPropertyStatus(*req.StatusPipeline) {
		status = *req.StatusPipeline
	}

	// Insert property
	var p property
	err := a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO properties (workspace_id, status_pipeline, neighborhood, address, area_usable)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, workspace_id, origin_prospect_id, status_pipeline, neighborhood, address, area_usable, created_at, updated_at`,
		req.WorkspaceID, status, req.Neighborhood, req.Address, req.AreaUsable,
	).Scan(&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline, &p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create property", Details: []string{err.Error()}})
		return
	}

	// Create timeline event for initial status
	a.createTimelineEvent(r.Context(), p.ID, p.WorkspaceID, EventTypeStatusChanged, map[string]any{
		"from_status": nil,
		"to_status":   status,
	}, userID)

	writeJSON(w, http.StatusCreated, p)
}

func (a *api) handleGetProperty(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var p property
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.id, p.workspace_id, p.origin_prospect_id, p.status_pipeline, p.neighborhood, p.address, p.area_usable, p.created_at, p.updated_at
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline, &p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch property"})
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleUpdateProperty(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updatePropertyRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate area_usable
	if req.AreaUsable != nil && *req.AreaUsable <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "area_usable must be greater than 0"})
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

	// Build update query dynamically
	sets := []string{"updated_at = now()"}
	args := []any{}
	argIdx := 1

	if req.Neighborhood != nil {
		sets = append(sets, "neighborhood = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Neighborhood)
		argIdx++
	}
	if req.Address != nil {
		sets = append(sets, "address = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Address)
		argIdx++
	}
	if req.AreaUsable != nil {
		sets = append(sets, "area_usable = $"+strconv.Itoa(argIdx))
		args = append(args, *req.AreaUsable)
		argIdx++
	}

	args = append(args, propertyID)
	query := `UPDATE properties SET ` + strings.Join(sets, ", ") + ` WHERE id = $` + strconv.Itoa(argIdx) + `
		 RETURNING id, workspace_id, origin_prospect_id, status_pipeline, neighborhood, address, area_usable, created_at, updated_at`

	var p property
	err = a.db.QueryRowContext(r.Context(), query, args...).Scan(
		&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline, &p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update property"})
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleUpdatePropertyStatus(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateStatusRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	if !isValidPropertyStatus(req.StatusPipeline) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid status_pipeline value"})
		return
	}

	// Get current property and check access
	var p property
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.id, p.workspace_id, p.origin_prospect_id, p.status_pipeline, p.neighborhood, p.address, p.area_usable, p.created_at, p.updated_at
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline, &p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch property"})
		return
	}

	oldStatus := p.StatusPipeline

	// Update status
	err = a.db.QueryRowContext(
		r.Context(),
		`UPDATE properties SET status_pipeline = $1, updated_at = now() WHERE id = $2
		 RETURNING id, workspace_id, origin_prospect_id, status_pipeline, neighborhood, address, area_usable, created_at, updated_at`,
		req.StatusPipeline, propertyID,
	).Scan(&p.ID, &p.WorkspaceID, &p.OriginProspectID, &p.StatusPipeline, &p.Neighborhood, &p.Address, &p.AreaUsable, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update property status"})
		return
	}

	// Create timeline event
	a.createTimelineEvent(r.Context(), p.ID, p.WorkspaceID, EventTypeStatusChanged, map[string]any{
		"from_status": oldStatus,
		"to_status":   req.StatusPipeline,
	}, userID)

	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleGetPropertyTimeline(w http.ResponseWriter, r *http.Request, propertyID string) {
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
		`SELECT id, property_id, workspace_id, event_type, payload, actor_user_id, created_at
		 FROM timeline_events
		 WHERE property_id = $1
		 ORDER BY created_at DESC
		 LIMIT 100`,
		propertyID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query timeline"})
		return
	}
	defer rows.Close()

	items := make([]timelineEvent, 0)
	for rows.Next() {
		var e timelineEvent
		var payload []byte
		err := rows.Scan(&e.ID, &e.PropertyID, &e.WorkspaceID, &e.EventType, &payload, &e.ActorUserID, &e.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan timeline event"})
			return
		}
		if len(payload) > 0 {
			e.Payload = payload
		}
		items = append(items, e)
	}

	writeJSON(w, http.StatusOK, listTimelineResponse{Items: items})
}

func isValidPropertyStatus(s string) bool {
	switch s {
	case PropertyStatusProspecting, PropertyStatusAnalyzing, PropertyStatusBought,
		PropertyStatusRenovation, PropertyStatusForSale, PropertyStatusSold, PropertyStatusArchived:
		return true
	}
	return false
}

func (a *api) createTimelineEvent(ctx context.Context, propertyID, workspaceID, eventType string, payload map[string]any, actorUserID string) {
	payloadBytes, _ := json.Marshal(payload)
	_, _ = a.db.ExecContext(
		ctx,
		`INSERT INTO timeline_events (property_id, workspace_id, event_type, payload, actor_user_id)
		 VALUES ($1, $2, $3, $4, $5)`,
		propertyID, workspaceID, eventType, payloadBytes, actorUserID,
	)
}
