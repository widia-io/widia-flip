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

// Unified snapshot for workspace-wide listing
type unifiedSnapshot struct {
	ID              string    `json:"id"`
	PropertyID      string    `json:"property_id"`
	PropertyName    *string   `json:"property_name"`
	SnapshotType    string    `json:"snapshot_type"`
	StatusPipeline  *string   `json:"status_pipeline,omitempty"`
	NetProfit       float64   `json:"net_profit"`
	ROI             float64   `json:"roi"`
	PurchasePrice   *float64  `json:"purchase_price"`
	SalePrice       *float64  `json:"sale_price"`
	CreatedAt       time.Time `json:"created_at"`
	AnnotationCount int       `json:"annotation_count"`
}

type listUnifiedSnapshotsResponse struct {
	Items      []unifiedSnapshot `json:"items"`
	TotalCount int               `json:"total_count"`
}

// Snapshot annotation
type snapshotAnnotation struct {
	ID           string    `json:"id"`
	SnapshotID   string    `json:"snapshot_id"`
	SnapshotType string    `json:"snapshot_type"`
	Note         string    `json:"note"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type listAnnotationsResponse struct {
	Items []snapshotAnnotation `json:"items"`
}

type createAnnotationRequest struct {
	SnapshotID   string `json:"snapshot_id"`
	SnapshotType string `json:"snapshot_type"`
	Note         string `json:"note"`
}

type updateAnnotationRequest struct {
	Note string `json:"note"`
}

// Full snapshot for comparison
type fullSnapshot struct {
	ID             string                 `json:"id"`
	PropertyID     string                 `json:"property_id"`
	PropertyName   *string                `json:"property_name"`
	SnapshotType   string                 `json:"snapshot_type"`
	StatusPipeline *string                `json:"status_pipeline,omitempty"`
	Inputs         map[string]interface{} `json:"inputs"`
	Outputs        map[string]interface{} `json:"outputs"`
	Rates          map[string]interface{} `json:"rates,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
}

type compareSnapshotsResponse struct {
	Snapshots []fullSnapshot `json:"snapshots"`
}

func (a *api) handleSnapshotsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListUnifiedSnapshots(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleSnapshotsSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/snapshots/")
	parts := strings.Split(path, "/")

	// /api/v1/snapshots/compare
	if len(parts) == 1 && parts[0] == "compare" {
		switch r.Method {
		case http.MethodGet:
			a.handleCompareSnapshots(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/snapshots/annotations
	if len(parts) == 1 && parts[0] == "annotations" {
		switch r.Method {
		case http.MethodPost:
			a.handleCreateAnnotation(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/snapshots/annotations/:id
	if len(parts) == 2 && parts[0] == "annotations" {
		annotationID := parts[1]
		switch r.Method {
		case http.MethodPut:
			a.handleUpdateAnnotation(w, r, annotationID)
		case http.MethodDelete:
			a.handleDeleteAnnotation(w, r, annotationID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	// /api/v1/snapshots/:id/annotations
	if len(parts) == 2 && parts[1] == "annotations" {
		snapshotID := parts[0]
		snapshotType := r.URL.Query().Get("type")
		if snapshotType == "" {
			writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "type query param required"})
			return
		}
		switch r.Method {
		case http.MethodGet:
			a.handleListAnnotations(w, r, snapshotID, snapshotType)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleListUnifiedSnapshots(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "workspace_id required"})
		return
	}

	// Check workspace membership
	var exists bool
	err := a.db.QueryRowContext(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM flip.workspace_memberships WHERE workspace_id = $1 AND user_id = $2)`,
		workspaceID, userID,
	).Scan(&exists)
	if err != nil || !exists {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "workspace not accessible"})
		return
	}

	// Parse optional filters
	snapshotType := r.URL.Query().Get("snapshot_type")
	statusPipeline := r.URL.Query().Get("status_pipeline")
	propertySearch := r.URL.Query().Get("property_search")
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")
	minROIStr := r.URL.Query().Get("min_roi")

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	var minROI *float64
	if minROIStr != "" {
		if parsed, err := strconv.ParseFloat(minROIStr, 64); err == nil {
			minROI = &parsed
		}
	}

	// Build the UNION query
	query := `
		WITH unified AS (
			SELECT
				s.id,
				s.property_id,
				COALESCE(p.address, p.neighborhood) as property_name,
				'cash' as snapshot_type,
				s.status_pipeline,
				COALESCE((s.outputs->>'net_profit')::float, 0) as net_profit,
				COALESCE((s.outputs->>'roi')::float, 0) as roi,
				(s.inputs->>'purchase_price')::float as purchase_price,
				(s.inputs->>'sale_price')::float as sale_price,
				s.created_at,
				(SELECT COUNT(*) FROM flip.snapshot_annotations a WHERE a.snapshot_id = s.id AND a.snapshot_type = 'cash') as annotation_count
			FROM flip.analysis_cash_snapshots s
			JOIN flip.properties p ON p.id = s.property_id
			WHERE s.workspace_id = $1

			UNION ALL

			SELECT
				s.id,
				s.property_id,
				COALESCE(p.address, p.neighborhood) as property_name,
				'financing' as snapshot_type,
				s.status_pipeline,
				COALESCE((s.outputs_json->>'net_profit')::float, 0) as net_profit,
				COALESCE((s.outputs_json->>'roi')::float, 0) as roi,
				(s.inputs_json->>'purchase_price')::float as purchase_price,
				(s.inputs_json->>'sale_price')::float as sale_price,
				s.created_at,
				(SELECT COUNT(*) FROM flip.snapshot_annotations a WHERE a.snapshot_id = s.id AND a.snapshot_type = 'financing') as annotation_count
			FROM flip.analysis_financing_snapshots s
			JOIN flip.properties p ON p.id = s.property_id
			WHERE s.workspace_id = $1
		)
		SELECT id, property_id, property_name, snapshot_type, status_pipeline,
		       net_profit, roi, purchase_price, sale_price, created_at, annotation_count
		FROM unified
		WHERE 1=1
	`

	args := []interface{}{workspaceID}
	argIdx := 2

	if snapshotType != "" && snapshotType != "all" {
		query += ` AND snapshot_type = $` + strconv.Itoa(argIdx)
		args = append(args, snapshotType)
		argIdx++
	}

	if statusPipeline != "" {
		query += ` AND status_pipeline = $` + strconv.Itoa(argIdx)
		args = append(args, statusPipeline)
		argIdx++
	}

	if propertySearch != "" {
		query += ` AND property_name ILIKE $` + strconv.Itoa(argIdx)
		args = append(args, "%"+propertySearch+"%")
		argIdx++
	}

	if dateFrom != "" {
		query += ` AND created_at >= $` + strconv.Itoa(argIdx)
		args = append(args, dateFrom)
		argIdx++
	}

	if dateTo != "" {
		query += ` AND created_at <= $` + strconv.Itoa(argIdx)
		args = append(args, dateTo)
		argIdx++
	}

	if minROI != nil {
		query += ` AND roi >= $` + strconv.Itoa(argIdx)
		args = append(args, *minROI)
		argIdx++
	}

	// Get total count
	countQuery := `SELECT COUNT(*) FROM (` + query + `) as counted`
	var totalCount int
	if err := a.db.QueryRowContext(r.Context(), countQuery, args...).Scan(&totalCount); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count snapshots"})
		return
	}

	// Add ordering and pagination
	query += ` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query snapshots"})
		return
	}
	defer rows.Close()

	items := []unifiedSnapshot{}
	for rows.Next() {
		var s unifiedSnapshot
		if err := rows.Scan(
			&s.ID, &s.PropertyID, &s.PropertyName, &s.SnapshotType, &s.StatusPipeline,
			&s.NetProfit, &s.ROI, &s.PurchasePrice, &s.SalePrice, &s.CreatedAt, &s.AnnotationCount,
		); err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan snapshot"})
			return
		}
		items = append(items, s)
	}

	writeJSON(w, http.StatusOK, listUnifiedSnapshotsResponse{Items: items, TotalCount: totalCount})
}

func (a *api) handleListAnnotations(w http.ResponseWriter, r *http.Request, snapshotID, snapshotType string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Get workspace_id from snapshot and verify access
	var workspaceID string
	var err error

	if snapshotType == "cash" {
		err = a.db.QueryRowContext(r.Context(),
			`SELECT s.workspace_id FROM flip.analysis_cash_snapshots s
			 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
			 WHERE s.id = $1 AND m.user_id = $2`,
			snapshotID, userID,
		).Scan(&workspaceID)
	} else {
		err = a.db.QueryRowContext(r.Context(),
			`SELECT s.workspace_id FROM flip.analysis_financing_snapshots s
			 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
			 WHERE s.id = $1 AND m.user_id = $2`,
			snapshotID, userID,
		).Scan(&workspaceID)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "snapshot not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check access"})
		return
	}

	rows, err := a.db.QueryContext(r.Context(),
		`SELECT id, snapshot_id, snapshot_type, note, created_by, created_at, updated_at
		 FROM flip.snapshot_annotations
		 WHERE snapshot_id = $1 AND snapshot_type = $2
		 ORDER BY created_at DESC`,
		snapshotID, snapshotType,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list annotations"})
		return
	}
	defer rows.Close()

	items := []snapshotAnnotation{}
	for rows.Next() {
		var a snapshotAnnotation
		if err := rows.Scan(&a.ID, &a.SnapshotID, &a.SnapshotType, &a.Note, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan annotation"})
			return
		}
		items = append(items, a)
	}

	writeJSON(w, http.StatusOK, listAnnotationsResponse{Items: items})
}

func (a *api) handleCreateAnnotation(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_JSON", Message: "invalid request body"})
		return
	}

	if req.Note == "" || len(req.Note) > 1000 {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "note must be 1-1000 chars"})
		return
	}

	if req.SnapshotType != "cash" && req.SnapshotType != "financing" {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "snapshot_type must be cash or financing"})
		return
	}

	// Get workspace_id from snapshot and verify access
	var workspaceID string
	var err error

	if req.SnapshotType == "cash" {
		err = a.db.QueryRowContext(r.Context(),
			`SELECT s.workspace_id FROM flip.analysis_cash_snapshots s
			 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
			 WHERE s.id = $1 AND m.user_id = $2`,
			req.SnapshotID, userID,
		).Scan(&workspaceID)
	} else {
		err = a.db.QueryRowContext(r.Context(),
			`SELECT s.workspace_id FROM flip.analysis_financing_snapshots s
			 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
			 WHERE s.id = $1 AND m.user_id = $2`,
			req.SnapshotID, userID,
		).Scan(&workspaceID)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "snapshot not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check access"})
		return
	}

	var annotation snapshotAnnotation
	err = a.db.QueryRowContext(r.Context(),
		`INSERT INTO flip.snapshot_annotations (snapshot_id, snapshot_type, workspace_id, note, created_by)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, snapshot_id, snapshot_type, note, created_by, created_at, updated_at`,
		req.SnapshotID, req.SnapshotType, workspaceID, req.Note, userID,
	).Scan(&annotation.ID, &annotation.SnapshotID, &annotation.SnapshotType, &annotation.Note, &annotation.CreatedBy, &annotation.CreatedAt, &annotation.UpdatedAt)

	if err != nil {
		logger.WithContext(r.Context()).Error("create_annotation_failed",
			slog.String("snapshot_id", req.SnapshotID),
			slog.String("workspace_id", workspaceID),
			slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create annotation", Details: []string{err.Error()}})
		return
	}

	writeJSON(w, http.StatusCreated, annotation)
}

func (a *api) handleUpdateAnnotation(w http.ResponseWriter, r *http.Request, annotationID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_JSON", Message: "invalid request body"})
		return
	}

	if req.Note == "" || len(req.Note) > 1000 {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "note must be 1-1000 chars"})
		return
	}

	// Check workspace membership via annotation
	var workspaceID string
	err := a.db.QueryRowContext(r.Context(),
		`SELECT a.workspace_id FROM flip.snapshot_annotations a
		 JOIN flip.workspace_memberships m ON m.workspace_id = a.workspace_id
		 WHERE a.id = $1 AND m.user_id = $2`,
		annotationID, userID,
	).Scan(&workspaceID)

	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "annotation not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check access"})
		return
	}

	var annotation snapshotAnnotation
	err = a.db.QueryRowContext(r.Context(),
		`UPDATE flip.snapshot_annotations
		 SET note = $1, updated_at = now()
		 WHERE id = $2
		 RETURNING id, snapshot_id, snapshot_type, note, created_by, created_at, updated_at`,
		req.Note, annotationID,
	).Scan(&annotation.ID, &annotation.SnapshotID, &annotation.SnapshotType, &annotation.Note, &annotation.CreatedBy, &annotation.CreatedAt, &annotation.UpdatedAt)

	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update annotation"})
		return
	}

	writeJSON(w, http.StatusOK, annotation)
}

func (a *api) handleDeleteAnnotation(w http.ResponseWriter, r *http.Request, annotationID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check workspace membership via annotation
	var workspaceID string
	err := a.db.QueryRowContext(r.Context(),
		`SELECT a.workspace_id FROM flip.snapshot_annotations a
		 JOIN flip.workspace_memberships m ON m.workspace_id = a.workspace_id
		 WHERE a.id = $1 AND m.user_id = $2`,
		annotationID, userID,
	).Scan(&workspaceID)

	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "annotation not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check access"})
		return
	}

	_, err = a.db.ExecContext(r.Context(),
		`DELETE FROM flip.snapshot_annotations WHERE id = $1`,
		annotationID,
	)

	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete annotation"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *api) handleCompareSnapshots(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	idsParam := r.URL.Query().Get("ids")
	typesParam := r.URL.Query().Get("types")

	if idsParam == "" || typesParam == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "ids and types query params required"})
		return
	}

	ids := strings.Split(idsParam, ",")
	types := strings.Split(typesParam, ",")

	if len(ids) != 2 || len(types) != 2 {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "exactly 2 ids and types required"})
		return
	}

	snapshots := make([]fullSnapshot, 0, 2)

	for i := 0; i < 2; i++ {
		snapshotID := strings.TrimSpace(ids[i])
		snapshotType := strings.TrimSpace(types[i])

		if snapshotType != "cash" && snapshotType != "financing" {
			writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_PARAMS", Message: "type must be cash or financing"})
			return
		}

		var snapshot fullSnapshot
		var inputsJSON, outputsJSON, ratesJSON []byte
		var workspaceID string

		if snapshotType == "cash" {
			err := a.db.QueryRowContext(r.Context(),
				`SELECT s.id, s.property_id, COALESCE(p.address, p.neighborhood), s.workspace_id,
				        s.status_pipeline, s.inputs, s.outputs, s.effective_rates, s.created_at
				 FROM flip.analysis_cash_snapshots s
				 JOIN flip.properties p ON p.id = s.property_id
				 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
				 WHERE s.id = $1 AND m.user_id = $2`,
				snapshotID, userID,
			).Scan(&snapshot.ID, &snapshot.PropertyID, &snapshot.PropertyName, &workspaceID,
				&snapshot.StatusPipeline, &inputsJSON, &outputsJSON, &ratesJSON, &snapshot.CreatedAt)

			if err != nil {
				if err == sql.ErrNoRows {
					writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "snapshot not found: " + snapshotID})
					return
				}
				logger.WithContext(r.Context()).Error("fetch_cash_snapshot_failed",
					slog.String("snapshot_id", snapshotID),
					slog.Any("error", err))
				writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch snapshot"})
				return
			}
		} else {
			err := a.db.QueryRowContext(r.Context(),
				`SELECT s.id, s.property_id, COALESCE(p.address, p.neighborhood), s.workspace_id,
				        s.status_pipeline, s.inputs_json, s.outputs_json, s.effective_rates, s.created_at
				 FROM flip.analysis_financing_snapshots s
				 JOIN flip.properties p ON p.id = s.property_id
				 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
				 WHERE s.id = $1 AND m.user_id = $2`,
				snapshotID, userID,
			).Scan(&snapshot.ID, &snapshot.PropertyID, &snapshot.PropertyName, &workspaceID,
				&snapshot.StatusPipeline, &inputsJSON, &outputsJSON, &ratesJSON, &snapshot.CreatedAt)

			if err != nil {
				if err == sql.ErrNoRows {
					writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "snapshot not found: " + snapshotID})
					return
				}
				logger.WithContext(r.Context()).Error("fetch_financing_snapshot_failed",
					slog.String("snapshot_id", snapshotID),
					slog.Any("error", err))
				writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch snapshot"})
				return
			}
		}

		snapshot.SnapshotType = snapshotType

		// Parse JSON fields
		if len(inputsJSON) > 0 {
			if err := json.Unmarshal(inputsJSON, &snapshot.Inputs); err != nil {
				snapshot.Inputs = make(map[string]interface{})
			}
		}
		if len(outputsJSON) > 0 {
			if err := json.Unmarshal(outputsJSON, &snapshot.Outputs); err != nil {
				snapshot.Outputs = make(map[string]interface{})
			}
		}
		if len(ratesJSON) > 0 {
			if err := json.Unmarshal(ratesJSON, &snapshot.Rates); err != nil {
				snapshot.Rates = make(map[string]interface{})
			}
		}

		snapshots = append(snapshots, snapshot)
	}

	writeJSON(w, http.StatusOK, compareSnapshotsResponse{Snapshots: snapshots})
}
