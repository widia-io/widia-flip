package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Prospect statuses
const (
	ProspectStatusActive    = "active"
	ProspectStatusDiscarded = "discarded"
	ProspectStatusConverted = "converted"
)

// Property pipeline statuses (MVP locked)
const (
	PropertyStatusProspecting = "prospecting"
	PropertyStatusAnalyzing   = "analyzing"
	PropertyStatusBought      = "bought"
	PropertyStatusRenovation  = "renovation"
	PropertyStatusForSale     = "for_sale"
	PropertyStatusSold        = "sold"
	PropertyStatusArchived    = "archived"
)

type prospect struct {
	ID           string    `json:"id"`
	WorkspaceID  string    `json:"workspace_id"`
	Status       string    `json:"status"`
	Link         *string   `json:"link"`
	Neighborhood *string   `json:"neighborhood"`
	Address      *string   `json:"address"`
	AreaUsable   *float64  `json:"area_usable"`
	Bedrooms     *int      `json:"bedrooms"`
	Suites       *int      `json:"suites"`
	Bathrooms    *int      `json:"bathrooms"`
	Gas          *string   `json:"gas"`
	Floor        *int      `json:"floor"`
	Elevator     *bool     `json:"elevator"`
	Face         *string   `json:"face"`
	Parking      *int      `json:"parking"`
	CondoFee     *float64  `json:"condo_fee"`
	IPTU         *float64  `json:"iptu"`
	AskingPrice  *float64  `json:"asking_price"`
	Agency       *string   `json:"agency"`
	BrokerName   *string   `json:"broker_name"`
	BrokerPhone  *string   `json:"broker_phone"`
	Comments     *string   `json:"comments"`
	Tags         []string  `json:"tags"`
	PricePerSqm  *float64  `json:"price_per_sqm"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type listProspectsResponse struct {
	Items      []prospect `json:"items"`
	NextCursor *string    `json:"next_cursor,omitempty"`
}

type createProspectRequest struct {
	WorkspaceID  string   `json:"workspace_id"`
	Link         *string  `json:"link"`
	Neighborhood *string  `json:"neighborhood"`
	Address      *string  `json:"address"`
	AreaUsable   *float64 `json:"area_usable"`
	Bedrooms     *int     `json:"bedrooms"`
	Suites       *int     `json:"suites"`
	Bathrooms    *int     `json:"bathrooms"`
	Gas          *string  `json:"gas"`
	Floor        *int     `json:"floor"`
	Elevator     *bool    `json:"elevator"`
	Face         *string  `json:"face"`
	Parking      *int     `json:"parking"`
	CondoFee     *float64 `json:"condo_fee"`
	IPTU         *float64 `json:"iptu"`
	AskingPrice  *float64 `json:"asking_price"`
	Agency       *string  `json:"agency"`
	BrokerName   *string  `json:"broker_name"`
	BrokerPhone  *string  `json:"broker_phone"`
	Comments     *string  `json:"comments"`
	Tags         []string `json:"tags"`
}

type updateProspectRequest struct {
	Status       *string  `json:"status"`
	Link         *string  `json:"link"`
	Neighborhood *string  `json:"neighborhood"`
	Address      *string  `json:"address"`
	AreaUsable   *float64 `json:"area_usable"`
	Bedrooms     *int     `json:"bedrooms"`
	Suites       *int     `json:"suites"`
	Bathrooms    *int     `json:"bathrooms"`
	Gas          *string  `json:"gas"`
	Floor        *int     `json:"floor"`
	Elevator     *bool    `json:"elevator"`
	Face         *string  `json:"face"`
	Parking      *int     `json:"parking"`
	CondoFee     *float64 `json:"condo_fee"`
	IPTU         *float64 `json:"iptu"`
	AskingPrice  *float64 `json:"asking_price"`
	Agency       *string  `json:"agency"`
	BrokerName   *string  `json:"broker_name"`
	BrokerPhone  *string  `json:"broker_phone"`
	Comments     *string  `json:"comments"`
	Tags         []string `json:"tags"`
}

type convertProspectResponse struct {
	PropertyID string `json:"property_id"`
}

func (a *api) handleProspectsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListProspects(w, r)
	case http.MethodPost:
		a.handleCreateProspect(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleProspectsSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/prospects/")
	parts := strings.Split(rest, "/")

	prospectID := strings.TrimSpace(parts[0])
	if prospectID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/prospects/:id/convert
	if len(parts) == 2 && parts[1] == "convert" {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleConvertProspect(w, r, prospectID)
		return
	}

	// /api/v1/prospects/:id
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			a.handleGetProspect(w, r, prospectID)
		case http.MethodPut:
			a.handleUpdateProspect(w, r, prospectID)
		case http.MethodDelete:
			a.handleDeleteProspect(w, r, prospectID)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}

	w.WriteHeader(http.StatusNotFound)
}

func (a *api) handleListProspects(w http.ResponseWriter, r *http.Request) {
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
	status := r.URL.Query().Get("status")
	q := r.URL.Query().Get("q")
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
		SELECT id, workspace_id, status, link, neighborhood, address,
		       area_usable, bedrooms, suites, bathrooms, gas, floor, elevator, face, parking,
		       condo_fee, iptu, asking_price, agency, broker_name, broker_phone,
		       comments, tags, created_at, updated_at
		FROM prospecting_properties
		WHERE workspace_id = $1
	`
	args := []any{workspaceID}
	argIdx := 2

	if status != "" {
		query += ` AND status = $` + strconv.Itoa(argIdx)
		args = append(args, status)
		argIdx++
	}

	if q != "" {
		query += ` AND (neighborhood ILIKE $` + strconv.Itoa(argIdx) + ` OR address ILIKE $` + strconv.Itoa(argIdx) + `)`
		args = append(args, "%"+q+"%")
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
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query prospects"})
		return
	}
	defer rows.Close()

	items := make([]prospect, 0)
	for rows.Next() {
		var p prospect
		var tags []byte
		err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
			&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
			&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
			&p.Comments, &tags, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan prospect"})
			return
		}
		p.Tags = parseTags(tags)
		p.PricePerSqm = computePricePerSqm(p.AskingPrice, p.AreaUsable)
		items = append(items, p)
	}

	var nextCursor *string
	if len(items) > limit {
		items = items[:limit]
		c := items[limit-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	writeJSON(w, http.StatusOK, listProspectsResponse{Items: items, NextCursor: nextCursor})
}

func (a *api) handleCreateProspect(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createProspectRequest
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

	// Validations
	if req.AreaUsable != nil && *req.AreaUsable <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "area_usable must be greater than 0"})
		return
	}
	if req.AskingPrice != nil && *req.AskingPrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "asking_price must be >= 0"})
		return
	}

	if req.Tags == nil {
		req.Tags = []string{}
	}

	var p prospect
	var tagsBytes []byte
	err := a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO prospecting_properties
			(workspace_id, link, neighborhood, address, area_usable, bedrooms, suites, bathrooms,
			 gas, floor, elevator, face, parking, condo_fee, iptu, asking_price, agency, broker_name, broker_phone,
			 comments, tags)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		 RETURNING id, workspace_id, status, link, neighborhood, address,
		           area_usable, bedrooms, suites, bathrooms, gas, floor, elevator, face, parking,
		           condo_fee, iptu, asking_price, agency, broker_name, broker_phone,
		           comments, tags, created_at, updated_at`,
		req.WorkspaceID, req.Link, req.Neighborhood, req.Address, req.AreaUsable,
		req.Bedrooms, req.Suites, req.Bathrooms, req.Gas, req.Floor, req.Elevator, req.Face, req.Parking,
		req.CondoFee, req.IPTU, req.AskingPrice, req.Agency, req.BrokerName, req.BrokerPhone,
		req.Comments, pq.Array(req.Tags),
	).Scan(
		&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
		&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
		&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
		&p.Comments, &tagsBytes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create prospect", Details: []string{err.Error()}})
		return
	}

	p.Tags = parseTags(tagsBytes)
	p.PricePerSqm = computePricePerSqm(p.AskingPrice, p.AreaUsable)
	writeJSON(w, http.StatusCreated, p)
}

func (a *api) handleGetProspect(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var p prospect
	var tags []byte
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.id, p.workspace_id, p.status, p.link, p.neighborhood, p.address,
		        p.area_usable, p.bedrooms, p.suites, p.bathrooms, p.gas, p.floor, p.elevator, p.face, p.parking,
		        p.condo_fee, p.iptu, p.asking_price, p.agency, p.broker_name, p.broker_phone,
		        p.comments, p.tags, p.created_at, p.updated_at
		 FROM prospecting_properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		prospectID, userID,
	).Scan(
		&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
		&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
		&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
		&p.Comments, &tags, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	p.Tags = parseTags(tags)
	p.PricePerSqm = computePricePerSqm(p.AskingPrice, p.AreaUsable)
	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleUpdateProspect(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateProspectRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validations
	if req.Status != nil {
		s := *req.Status
		if s != ProspectStatusActive && s != ProspectStatusDiscarded && s != ProspectStatusConverted {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "status must be one of: active, discarded, converted"})
			return
		}
	}
	if req.AreaUsable != nil && *req.AreaUsable <= 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "area_usable must be greater than 0"})
		return
	}
	if req.AskingPrice != nil && *req.AskingPrice < 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "asking_price must be >= 0"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM prospecting_properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		prospectID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check prospect"})
		return
	}

	// Build update query dynamically
	sets := []string{"updated_at = now()"}
	args := []any{}
	argIdx := 1

	if req.Status != nil {
		sets = append(sets, "status = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Status)
		argIdx++
	}
	if req.Link != nil {
		sets = append(sets, "link = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Link)
		argIdx++
	}
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
	if req.Bedrooms != nil {
		sets = append(sets, "bedrooms = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Bedrooms)
		argIdx++
	}
	if req.Suites != nil {
		sets = append(sets, "suites = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Suites)
		argIdx++
	}
	if req.Bathrooms != nil {
		sets = append(sets, "bathrooms = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Bathrooms)
		argIdx++
	}
	if req.Gas != nil {
		sets = append(sets, "gas = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Gas)
		argIdx++
	}
	if req.Floor != nil {
		sets = append(sets, "floor = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Floor)
		argIdx++
	}
	if req.Elevator != nil {
		sets = append(sets, "elevator = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Elevator)
		argIdx++
	}
	if req.Face != nil {
		sets = append(sets, "face = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Face)
		argIdx++
	}
	if req.Parking != nil {
		sets = append(sets, "parking = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Parking)
		argIdx++
	}
	if req.CondoFee != nil {
		sets = append(sets, "condo_fee = $"+strconv.Itoa(argIdx))
		args = append(args, *req.CondoFee)
		argIdx++
	}
	if req.IPTU != nil {
		sets = append(sets, "iptu = $"+strconv.Itoa(argIdx))
		args = append(args, *req.IPTU)
		argIdx++
	}
	if req.AskingPrice != nil {
		sets = append(sets, "asking_price = $"+strconv.Itoa(argIdx))
		args = append(args, *req.AskingPrice)
		argIdx++
	}
	if req.Agency != nil {
		sets = append(sets, "agency = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Agency)
		argIdx++
	}
	if req.BrokerName != nil {
		sets = append(sets, "broker_name = $"+strconv.Itoa(argIdx))
		args = append(args, *req.BrokerName)
		argIdx++
	}
	if req.BrokerPhone != nil {
		sets = append(sets, "broker_phone = $"+strconv.Itoa(argIdx))
		args = append(args, *req.BrokerPhone)
		argIdx++
	}
	if req.Comments != nil {
		sets = append(sets, "comments = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Comments)
		argIdx++
	}
	if req.Tags != nil {
		sets = append(sets, "tags = $"+strconv.Itoa(argIdx))
		args = append(args, pq.Array(req.Tags))
		argIdx++
	}

	args = append(args, prospectID)
	query := `UPDATE prospecting_properties SET ` + strings.Join(sets, ", ") + ` WHERE id = $` + strconv.Itoa(argIdx) + `
		 RETURNING id, workspace_id, status, link, neighborhood, address,
		           area_usable, bedrooms, suites, bathrooms, gas, floor, elevator, face, parking,
		           condo_fee, iptu, asking_price, agency, broker_name, broker_phone,
		           comments, tags, created_at, updated_at`

	var p prospect
	var tags []byte
	err = a.db.QueryRowContext(r.Context(), query, args...).Scan(
		&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
		&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
		&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
		&p.Comments, &tags, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update prospect"})
		return
	}

	p.Tags = parseTags(tags)
	p.PricePerSqm = computePricePerSqm(p.AskingPrice, p.AreaUsable)
	writeJSON(w, http.StatusOK, p)
}

func (a *api) handleDeleteProspect(w http.ResponseWriter, r *http.Request, prospectID string) {
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
		 FROM prospecting_properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		prospectID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check prospect"})
		return
	}

	_, err = a.db.ExecContext(r.Context(), `DELETE FROM prospecting_properties WHERE id = $1`, prospectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete prospect"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *api) handleConvertProspect(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Get prospect data and check access
	var p prospect
	var tags []byte
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.id, p.workspace_id, p.status, p.link, p.neighborhood, p.address,
		        p.area_usable, p.bedrooms, p.suites, p.bathrooms, p.gas, p.floor, p.elevator, p.face, p.parking,
		        p.condo_fee, p.iptu, p.asking_price, p.agency, p.broker_name, p.broker_phone,
		        p.comments, p.tags, p.created_at, p.updated_at
		 FROM prospecting_properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		prospectID, userID,
	).Scan(
		&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
		&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
		&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
		&p.Comments, &tags, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	// Check if already converted
	if p.Status == ProspectStatusConverted {
		writeError(w, http.StatusBadRequest, apiError{Code: "ALREADY_CONVERTED", Message: "prospect is already converted"})
		return
	}

	// Convert in transaction
	propertyID, err := a.convertProspectTx(r.Context(), &p)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to convert prospect"})
		return
	}

	writeJSON(w, http.StatusCreated, convertProspectResponse{PropertyID: propertyID})
}

func (a *api) convertProspectTx(ctx context.Context, p *prospect) (string, error) {
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	// Create property
	var propertyID string
	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO properties (workspace_id, origin_prospect_id, status_pipeline, neighborhood, address, area_usable)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		p.WorkspaceID, p.ID, PropertyStatusAnalyzing, p.Neighborhood, p.Address, p.AreaUsable,
	).Scan(&propertyID)
	if err != nil {
		return "", err
	}

	// Update prospect status
	_, err = tx.ExecContext(
		ctx,
		`UPDATE prospecting_properties SET status = $1, updated_at = now() WHERE id = $2`,
		ProspectStatusConverted, p.ID,
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return propertyID, nil
}

func computePricePerSqm(askingPrice, areaUsable *float64) *float64 {
	if askingPrice == nil || areaUsable == nil || *areaUsable == 0 {
		return nil
	}
	result := *askingPrice / *areaUsable
	return &result
}

func parseTags(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	// Postgres array format: {tag1,tag2}
	s := string(data)
	if s == "{}" || s == "" {
		return []string{}
	}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return []string{}
	}
	return strings.Split(s, ",")
}
