package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

// Valid supplier categories
var validSupplierCategories = map[string]bool{
	"pintura":     true,
	"eletrica":    true,
	"hidraulica":  true,
	"arquitetura": true,
	"engenharia":  true,
	"marcenaria":  true,
	"gesso":       true,
	"piso":        true,
	"serralheria": true,
	"limpeza":     true,
	"corretor":    true,
	"advogado":    true,
	"despachante": true,
	"outro":       true,
}

type supplier struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	Name        string    `json:"name"`
	Phone       *string   `json:"phone"`
	Email       *string   `json:"email"`
	Category    string    `json:"category"`
	Notes       *string   `json:"notes"`
	Rating      *int      `json:"rating"`
	HourlyRate  *float64  `json:"hourly_rate"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type createSupplierRequest struct {
	WorkspaceID string   `json:"workspace_id"`
	Name        string   `json:"name"`
	Phone       *string  `json:"phone"`
	Email       *string  `json:"email"`
	Category    string   `json:"category"`
	Notes       *string  `json:"notes"`
	Rating      *int     `json:"rating"`
	HourlyRate  *float64 `json:"hourly_rate"`
}

type updateSupplierRequest struct {
	Name       *string  `json:"name"`
	Phone      *string  `json:"phone"`
	Email      *string  `json:"email"`
	Category   *string  `json:"category"`
	Notes      *string  `json:"notes"`
	Rating     *int     `json:"rating"`
	HourlyRate *float64 `json:"hourly_rate"`
}

type listSuppliersResponse struct {
	Items []supplier `json:"items"`
}

// handleSuppliersCollection routes /api/v1/suppliers (GET list, POST create)
func (a *api) handleSuppliersCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleListSuppliers(w, r)
	case http.MethodPost:
		a.handleCreateSupplier(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// handleSuppliersSubroutes routes /api/v1/suppliers/:id
func (a *api) handleSuppliersSubroutes(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/suppliers/")
	parts := strings.Split(rest, "/")
	supplierID := strings.TrimSpace(parts[0])

	if supplierID == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// /api/v1/suppliers/:id/documents
	if len(parts) == 2 && parts[1] == "documents" {
		if r.Method == http.MethodGet {
			a.handleListSupplierDocuments(w, r, supplierID)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// /api/v1/suppliers/:id
	switch r.Method {
	case http.MethodGet:
		a.handleGetSupplier(w, r, supplierID)
	case http.MethodPut:
		a.handleUpdateSupplier(w, r, supplierID)
	case http.MethodDelete:
		a.handleDeleteSupplier(w, r, supplierID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleListSuppliers(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id required"})
		return
	}

	// Check workspace access
	if ok, err := a.hasWorkspaceMembership(r.Context(), workspaceID, userID); err != nil || !ok {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "access denied"})
		return
	}

	// Optional category filter
	categoryFilter := r.URL.Query().Get("category")

	query := `SELECT id, workspace_id, name, phone, email, category, notes, rating, hourly_rate, created_at, updated_at
			  FROM flip.suppliers WHERE workspace_id = $1`
	args := []any{workspaceID}

	if categoryFilter != "" && validSupplierCategories[categoryFilter] {
		query += " AND category = $2"
		args = append(args, categoryFilter)
	}
	query += " ORDER BY name ASC"

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query suppliers"})
		return
	}
	defer rows.Close()

	items := make([]supplier, 0)
	for rows.Next() {
		var s supplier
		var rating sql.NullInt32
		var hourlyRate sql.NullFloat64
		err := rows.Scan(&s.ID, &s.WorkspaceID, &s.Name, &s.Phone, &s.Email, &s.Category, &s.Notes, &rating, &hourlyRate, &s.CreatedAt, &s.UpdatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan supplier"})
			return
		}
		if rating.Valid {
			v := int(rating.Int32)
			s.Rating = &v
		}
		if hourlyRate.Valid {
			s.HourlyRate = &hourlyRate.Float64
		}
		items = append(items, s)
	}

	writeJSON(w, http.StatusOK, listSuppliersResponse{Items: items})
}

func (a *api) handleCreateSupplier(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req createSupplierRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body"})
		return
	}

	// Validate required fields
	if req.WorkspaceID == "" || req.Name == "" || req.Category == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "workspace_id, name, category required"})
		return
	}
	if !validSupplierCategories[req.Category] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid category"})
		return
	}
	if req.Rating != nil && (*req.Rating < 1 || *req.Rating > 5) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "rating must be 1-5"})
		return
	}

	// Check workspace access
	if ok, err := a.hasWorkspaceMembership(r.Context(), req.WorkspaceID, userID); err != nil || !ok {
		writeError(w, http.StatusForbidden, apiError{Code: "FORBIDDEN", Message: "access denied"})
		return
	}

	// Enforce supplier limit
	requestID := r.Header.Get("X-Request-ID")
	if !a.enforceSupplierCreation(w, r, userID, req.WorkspaceID, requestID) {
		return
	}

	// Insert supplier
	var s supplier
	var rating sql.NullInt32
	var hourlyRate sql.NullFloat64
	err := a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO flip.suppliers (workspace_id, name, phone, email, category, notes, rating, hourly_rate)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, workspace_id, name, phone, email, category, notes, rating, hourly_rate, created_at, updated_at`,
		req.WorkspaceID, req.Name, req.Phone, req.Email, req.Category, req.Notes, req.Rating, req.HourlyRate,
	).Scan(&s.ID, &s.WorkspaceID, &s.Name, &s.Phone, &s.Email, &s.Category, &s.Notes, &rating, &hourlyRate, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create supplier"})
		return
	}
	if rating.Valid {
		v := int(rating.Int32)
		s.Rating = &v
	}
	if hourlyRate.Valid {
		s.HourlyRate = &hourlyRate.Float64
	}

	writeJSON(w, http.StatusCreated, s)
}

func (a *api) handleGetSupplier(w http.ResponseWriter, r *http.Request, supplierID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var s supplier
	var rating sql.NullInt32
	var hourlyRate sql.NullFloat64
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.id, s.workspace_id, s.name, s.phone, s.email, s.category, s.notes, s.rating, s.hourly_rate, s.created_at, s.updated_at
		 FROM flip.suppliers s
		 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		supplierID, userID,
	).Scan(&s.ID, &s.WorkspaceID, &s.Name, &s.Phone, &s.Email, &s.Category, &s.Notes, &rating, &hourlyRate, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "supplier not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to get supplier"})
		return
	}
	if rating.Valid {
		v := int(rating.Int32)
		s.Rating = &v
	}
	if hourlyRate.Valid {
		s.HourlyRate = &hourlyRate.Float64
	}

	writeJSON(w, http.StatusOK, s)
}

func (a *api) handleUpdateSupplier(w http.ResponseWriter, r *http.Request, supplierID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updateSupplierRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body"})
		return
	}

	// Validate
	if req.Category != nil && !validSupplierCategories[*req.Category] {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid category"})
		return
	}
	if req.Rating != nil && (*req.Rating < 1 || *req.Rating > 5) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "rating must be 1-5"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id
		 FROM flip.suppliers s
		 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		supplierID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "supplier not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check supplier"})
		return
	}

	// Build dynamic update query
	sets := []string{"updated_at = now()"}
	args := []any{}
	argIdx := 1

	if req.Name != nil {
		sets = append(sets, "name = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Phone != nil {
		sets = append(sets, "phone = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Phone)
		argIdx++
	}
	if req.Email != nil {
		sets = append(sets, "email = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Email)
		argIdx++
	}
	if req.Category != nil {
		sets = append(sets, "category = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Category)
		argIdx++
	}
	if req.Notes != nil {
		sets = append(sets, "notes = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Notes)
		argIdx++
	}
	if req.Rating != nil {
		sets = append(sets, "rating = $"+strconv.Itoa(argIdx))
		args = append(args, *req.Rating)
		argIdx++
	}
	if req.HourlyRate != nil {
		sets = append(sets, "hourly_rate = $"+strconv.Itoa(argIdx))
		args = append(args, *req.HourlyRate)
		argIdx++
	}

	args = append(args, supplierID)
	query := `UPDATE flip.suppliers SET ` + strings.Join(sets, ", ") + ` WHERE id = $` + strconv.Itoa(argIdx) +
		` RETURNING id, workspace_id, name, phone, email, category, notes, rating, hourly_rate, created_at, updated_at`

	var s supplier
	var rating sql.NullInt32
	var hourlyRate sql.NullFloat64
	err = a.db.QueryRowContext(r.Context(), query, args...).Scan(
		&s.ID, &s.WorkspaceID, &s.Name, &s.Phone, &s.Email, &s.Category, &s.Notes, &rating, &hourlyRate, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update supplier"})
		return
	}
	if rating.Valid {
		v := int(rating.Int32)
		s.Rating = &v
	}
	if hourlyRate.Valid {
		s.HourlyRate = &hourlyRate.Float64
	}

	writeJSON(w, http.StatusOK, s)
}

func (a *api) handleDeleteSupplier(w http.ResponseWriter, r *http.Request, supplierID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id
		 FROM flip.suppliers s
		 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		supplierID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "supplier not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check supplier"})
		return
	}

	// Delete supplier
	result, err := a.db.ExecContext(
		r.Context(),
		`DELETE FROM flip.suppliers WHERE id = $1`,
		supplierID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete supplier"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "supplier not found"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleListSupplierDocuments returns documents attached to a supplier (portfolio photos)
func (a *api) handleListSupplierDocuments(w http.ResponseWriter, r *http.Request, supplierID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT s.workspace_id
		 FROM flip.suppliers s
		 JOIN flip.workspace_memberships m ON m.workspace_id = s.workspace_id
		 WHERE s.id = $1 AND m.user_id = $2`,
		supplierID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "supplier not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check supplier"})
		return
	}

	rows, err := a.db.QueryContext(
		r.Context(),
		`SELECT id, workspace_id, property_id, cost_item_id, supplier_id, storage_key, storage_provider, filename, content_type, size_bytes, tags, created_at
		 FROM flip.documents
		 WHERE supplier_id = $1
		 ORDER BY created_at DESC`,
		supplierID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query documents"})
		return
	}
	defer rows.Close()

	items := make([]document, 0)
	for rows.Next() {
		var d document
		var tags []byte
		err := rows.Scan(&d.ID, &d.WorkspaceID, &d.PropertyID, &d.CostItemID, &d.SupplierID, &d.StorageKey, &d.StorageProvider, &d.Filename, &d.ContentType, &d.SizeBytes, &tags, &d.CreatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan document"})
			return
		}
		if tags != nil {
			json.Unmarshal(tags, &d.Tags)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		items = append(items, d)
	}

	writeJSON(w, http.StatusOK, listDocumentsResponse{Items: items})
}

// Enforcement functions

// countWorkspaceSuppliers counts total suppliers in workspace (not per-period)
func (a *api) countWorkspaceSuppliers(ctx context.Context, workspaceID string) (int, error) {
	var count int
	err := a.db.QueryRowContext(
		ctx,
		`SELECT COUNT(*) FROM flip.suppliers WHERE workspace_id = $1`,
		workspaceID,
	).Scan(&count)
	return count, err
}

// enforceSupplierCreation checks and enforces supplier creation limits
func (a *api) enforceSupplierCreation(w http.ResponseWriter, r *http.Request, userID string, workspaceID string, requestID string) bool {
	// Get workspace owner
	var ownerUserID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT created_by_user_id FROM flip.workspaces WHERE id = $1`,
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
		writeEnforcementError(w, ErrCodePaywallRequired, "Regularize seu pagamento para continuar adicionando fornecedores.", enforcementDetails{
			Tier:          billing.Tier,
			BillingStatus: getBillingStatusForResponse(billing),
		})
		return false
	}

	// Get tier limits
	limits := tierLimitsMap[billing.Tier]
	if limits.MaxWorkspaces == 0 {
		limits = tierLimitsMap["starter"]
	}

	// Count current suppliers in workspace
	count, err := a.countWorkspaceSuppliers(r.Context(), workspaceID)
	if err != nil {
		slog.Error("enforcement: failed to count suppliers", slog.String("workspace_id", workspaceID), slog.Any("error", err))
		// Allow on error to not block user
		return true
	}

	// Check limit
	if count >= limits.MaxSuppliers {
		slog.Warn("enforcement_blocked",
			slog.String("request_id", requestID),
			slog.String("user_id", userID),
			slog.String("workspace_id", workspaceID),
			slog.String("action", "create_supplier"),
			slog.String("reason", "limit_exceeded"),
			slog.String("tier", billing.Tier),
			slog.Int("used", count),
			slog.Int("limit", limits.MaxSuppliers),
		)
		writeEnforcementError(w, ErrCodeLimitExceeded, "Limite de fornecedores atingido. Faça upgrade para adicionar mais.", enforcementDetails{
			Tier:   billing.Tier,
			Metric: "suppliers",
			Usage:  count,
			Limit:  limits.MaxSuppliers,
		})
		return false
	}

	return true
}

// ========== Workspace-level suppliers summary (Dashboard) ==========

type suppliersByCategoryAgg struct {
	Category      string   `json:"category"`
	Count         int      `json:"count"`
	AvgRating     *float64 `json:"avg_rating"`
	AvgHourlyRate *float64 `json:"avg_hourly_rate"`
}

type categoryPriceAnalysis struct {
	Category      string   `json:"category"`
	MinHourly     *float64 `json:"min_hourly"`
	MaxHourly     *float64 `json:"max_hourly"`
	AvgHourly     *float64 `json:"avg_hourly"`
	SupplierCount int      `json:"supplier_count"`
}

type supplierUsageStats struct {
	SupplierID   string  `json:"supplier_id"`
	SupplierName string  `json:"supplier_name"`
	Category     string  `json:"category"`
	TotalCosts   int     `json:"total_costs"`
	TotalAmount  float64 `json:"total_amount"`
}

type suppliersSummary struct {
	TotalCount    int                     `json:"total_count"`
	ByCategory    []suppliersByCategoryAgg `json:"by_category"`
	AvgRating     *float64                `json:"avg_rating"`
	AvgHourlyRate *float64                `json:"avg_hourly_rate"`
	TopRated      []supplier              `json:"top_rated"`
	PriceAnalysis []categoryPriceAnalysis `json:"price_analysis"`
	UsageStats    []supplierUsageStats    `json:"usage_stats"`
}

type listWorkspaceSuppliersResponse struct {
	Items   []supplier       `json:"items"`
	Summary suppliersSummary `json:"summary"`
}

// handleWorkspaceSuppliersSummary handles GET /api/v1/workspaces/:id/suppliers/summary
func (a *api) handleWorkspaceSuppliersSummary(w http.ResponseWriter, r *http.Request, workspaceID string) {
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

	// Parse filters
	categoryFilter := r.URL.Query().Get("category")
	minRatingStr := r.URL.Query().Get("min_rating")
	minHourlyStr := r.URL.Query().Get("min_hourly_rate")
	maxHourlyStr := r.URL.Query().Get("max_hourly_rate")

	var minRating *int
	var minHourly, maxHourly *float64

	if minRatingStr != "" {
		if v, err := strconv.Atoi(minRatingStr); err == nil && v >= 1 && v <= 5 {
			minRating = &v
		}
	}
	if minHourlyStr != "" {
		if v, err := strconv.ParseFloat(minHourlyStr, 64); err == nil {
			minHourly = &v
		}
	}
	if maxHourlyStr != "" {
		if v, err := strconv.ParseFloat(maxHourlyStr, 64); err == nil {
			maxHourly = &v
		}
	}

	// Build query with filters
	query := `SELECT id, workspace_id, name, phone, email, category, notes, rating, hourly_rate, created_at, updated_at
			  FROM flip.suppliers WHERE workspace_id = $1`
	args := []any{workspaceID}
	argIdx := 2

	if categoryFilter != "" && validSupplierCategories[categoryFilter] {
		query += " AND category = $" + strconv.Itoa(argIdx)
		args = append(args, categoryFilter)
		argIdx++
	}
	if minRating != nil {
		query += " AND rating >= $" + strconv.Itoa(argIdx)
		args = append(args, *minRating)
		argIdx++
	}
	if minHourly != nil {
		query += " AND hourly_rate >= $" + strconv.Itoa(argIdx)
		args = append(args, *minHourly)
		argIdx++
	}
	if maxHourly != nil {
		query += " AND hourly_rate <= $" + strconv.Itoa(argIdx)
		args = append(args, *maxHourly)
		argIdx++
	}
	query += " ORDER BY COALESCE(rating, 0) DESC, name ASC"

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to query suppliers"})
		return
	}
	defer rows.Close()

	items := make([]supplier, 0)
	categoryAgg := make(map[string]*suppliersByCategoryAgg)
	priceAgg := make(map[string]*categoryPriceAnalysis)
	var totalRating, totalHourly float64
	var ratingCount, hourlyCount int

	for rows.Next() {
		var s supplier
		var rating sql.NullInt32
		var hourlyRate sql.NullFloat64
		err := rows.Scan(&s.ID, &s.WorkspaceID, &s.Name, &s.Phone, &s.Email, &s.Category, &s.Notes, &rating, &hourlyRate, &s.CreatedAt, &s.UpdatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan supplier"})
			return
		}
		if rating.Valid {
			v := int(rating.Int32)
			s.Rating = &v
			totalRating += float64(v)
			ratingCount++
		}
		if hourlyRate.Valid {
			s.HourlyRate = &hourlyRate.Float64
			totalHourly += hourlyRate.Float64
			hourlyCount++
		}
		items = append(items, s)

		// Aggregate by category
		if _, exists := categoryAgg[s.Category]; !exists {
			categoryAgg[s.Category] = &suppliersByCategoryAgg{Category: s.Category}
		}
		categoryAgg[s.Category].Count++
		if rating.Valid {
			if categoryAgg[s.Category].AvgRating == nil {
				v := float64(rating.Int32)
				categoryAgg[s.Category].AvgRating = &v
			} else {
				// Running average
				old := *categoryAgg[s.Category].AvgRating
				count := float64(categoryAgg[s.Category].Count)
				*categoryAgg[s.Category].AvgRating = old + (float64(rating.Int32)-old)/count
			}
		}
		if hourlyRate.Valid {
			if categoryAgg[s.Category].AvgHourlyRate == nil {
				categoryAgg[s.Category].AvgHourlyRate = &hourlyRate.Float64
			} else {
				old := *categoryAgg[s.Category].AvgHourlyRate
				count := float64(categoryAgg[s.Category].Count)
				*categoryAgg[s.Category].AvgHourlyRate = old + (hourlyRate.Float64-old)/count
			}
		}

		// Price analysis by category
		if _, exists := priceAgg[s.Category]; !exists {
			priceAgg[s.Category] = &categoryPriceAnalysis{Category: s.Category}
		}
		if hourlyRate.Valid {
			priceAgg[s.Category].SupplierCount++
			if priceAgg[s.Category].MinHourly == nil || hourlyRate.Float64 < *priceAgg[s.Category].MinHourly {
				priceAgg[s.Category].MinHourly = &hourlyRate.Float64
			}
			if priceAgg[s.Category].MaxHourly == nil || hourlyRate.Float64 > *priceAgg[s.Category].MaxHourly {
				priceAgg[s.Category].MaxHourly = &hourlyRate.Float64
			}
			if priceAgg[s.Category].AvgHourly == nil {
				priceAgg[s.Category].AvgHourly = &hourlyRate.Float64
			} else {
				old := *priceAgg[s.Category].AvgHourly
				count := float64(priceAgg[s.Category].SupplierCount)
				*priceAgg[s.Category].AvgHourly = old + (hourlyRate.Float64-old)/count
			}
		}
	}

	// Convert maps to slices
	byCategory := make([]suppliersByCategoryAgg, 0, len(categoryAgg))
	for _, v := range categoryAgg {
		byCategory = append(byCategory, *v)
	}
	priceAnalysis := make([]categoryPriceAnalysis, 0, len(priceAgg))
	for _, v := range priceAgg {
		if v.SupplierCount > 0 {
			priceAnalysis = append(priceAnalysis, *v)
		}
	}

	// Calculate overall averages
	var avgRating, avgHourly *float64
	if ratingCount > 0 {
		v := totalRating / float64(ratingCount)
		avgRating = &v
	}
	if hourlyCount > 0 {
		v := totalHourly / float64(hourlyCount)
		avgHourly = &v
	}

	// Top rated (limit 5)
	topRated := make([]supplier, 0)
	for _, s := range items {
		if s.Rating != nil && *s.Rating >= 4 && len(topRated) < 5 {
			topRated = append(topRated, s)
		}
	}

	// Query usage stats (suppliers with costs)
	usageRows, err := a.db.QueryContext(
		r.Context(),
		`SELECT s.id, s.name, s.category, COUNT(c.id) as total_costs, COALESCE(SUM(c.amount), 0) as total_amount
		 FROM flip.suppliers s
		 LEFT JOIN flip.cost_items c ON c.supplier_id = s.id
		 WHERE s.workspace_id = $1
		 GROUP BY s.id, s.name, s.category
		 HAVING COUNT(c.id) > 0
		 ORDER BY COUNT(c.id) DESC
		 LIMIT 10`,
		workspaceID,
	)
	if err != nil {
		slog.Warn("failed to query usage stats", slog.Any("error", err))
		// Don't fail the request, just return empty usage stats
	}

	usageStats := make([]supplierUsageStats, 0)
	if usageRows != nil {
		defer usageRows.Close()
		for usageRows.Next() {
			var u supplierUsageStats
			if err := usageRows.Scan(&u.SupplierID, &u.SupplierName, &u.Category, &u.TotalCosts, &u.TotalAmount); err != nil {
				slog.Warn("failed to scan usage stats", slog.Any("error", err))
				continue
			}
			usageStats = append(usageStats, u)
		}
	}

	writeJSON(w, http.StatusOK, listWorkspaceSuppliersResponse{
		Items: items,
		Summary: suppliersSummary{
			TotalCount:    len(items),
			ByCategory:    byCategory,
			AvgRating:     avgRating,
			AvgHourlyRate: avgHourly,
			TopRated:      topRated,
			PriceAnalysis: priceAnalysis,
			UsageStats:    usageStats,
		},
	})
}
