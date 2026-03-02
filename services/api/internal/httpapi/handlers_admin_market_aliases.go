package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/marketingest"
)

const (
	marketAliasDefaultLimit = 50
	marketAliasMaxLimit     = 200
)

type approveMarketAliasRequest struct {
	CanonicalName string `json:"canonical_name"`
}

type marketRegionAliasResponse struct {
	ID                  string   `json:"id"`
	City                string   `json:"city"`
	AliasRaw            *string  `json:"alias_raw"`
	AliasNormalized     string   `json:"alias_normalized"`
	CanonicalName       *string  `json:"canonical_name"`
	Status              string   `json:"status"`
	SuggestedCanonical  *string  `json:"suggested_canonical"`
	SuggestedConfidence *float64 `json:"suggested_confidence"`
	Occurrences         int      `json:"occurrences"`
	FirstSeenAt         string   `json:"first_seen_at"`
	LastSeenAt          string   `json:"last_seen_at"`
	ReviewedAt          *string  `json:"reviewed_at"`
	ReviewedBy          *string  `json:"reviewed_by"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
}

type listMarketRegionAliasesResponse struct {
	Items            []marketRegionAliasResponse `json:"items"`
	Total            int                         `json:"total"`
	CanonicalOptions []string                    `json:"canonical_options"`
}

func (a *api) handleAdminMarketAliasesSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/market/aliases")

	if path == "" || path == "/" {
		if r.Method == http.MethodGet {
			a.handleAdminListMarketAliases(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
		return
	}

	aliasID := strings.TrimSpace(parts[0])
	action := strings.TrimSpace(parts[1])
	if aliasID == "" {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
		return
	}

	switch action {
	case "approve":
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleAdminApproveMarketAlias(w, r, aliasID)
		return
	case "reject":
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		a.handleAdminRejectMarketAlias(w, r, aliasID)
		return
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
	}
}

func (a *api) handleAdminListMarketAliases(w http.ResponseWriter, r *http.Request) {
	city := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("city")))
	if city == "" {
		city = marketingest.DefaultCity
	}
	if city != marketingest.DefaultCity {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "city must be sp"})
		return
	}

	status := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
	if status != "" && status != "pending" && status != "approved" && status != "rejected" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "status must be pending|approved|rejected"})
		return
	}

	limit := marketAliasDefaultLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		value, err := parsePositiveInt(raw, marketAliasDefaultLimit)
		if err != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "limit must be positive"})
			return
		}
		if value > marketAliasMaxLimit {
			value = marketAliasMaxLimit
		}
		limit = value
	}

	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "offset must be non-negative"})
			return
		}
		offset = value
	}

	whereClause := "city = $1"
	args := []any{city}
	if status != "" {
		whereClause += " AND status = $2"
		args = append(args, status)
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM market_region_aliases WHERE %s`, whereClause)
	var total int
	if err := a.db.QueryRowContext(r.Context(), countQuery, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to count aliases"})
		return
	}

	queryArgs := append(args, limit, offset)
	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	listQuery := fmt.Sprintf(`
		SELECT
			id,
			city,
			alias_raw,
			alias_normalized,
			canonical_name,
			status,
			suggested_canonical,
			suggested_confidence,
			occurrences,
			first_seen_at,
			last_seen_at,
			reviewed_at,
			reviewed_by,
			created_at,
			updated_at
		FROM market_region_aliases
		WHERE %s
		ORDER BY
			CASE status
				WHEN 'pending' THEN 0
				WHEN 'approved' THEN 1
				ELSE 2
			END,
			occurrences DESC,
			last_seen_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, limitPos, offsetPos)

	rows, err := a.db.QueryContext(r.Context(), listQuery, queryArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list aliases"})
		return
	}
	defer rows.Close()

	items := make([]marketRegionAliasResponse, 0, limit)
	for rows.Next() {
		item, scanErr := scanMarketRegionAlias(rows)
		if scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan alias"})
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to iterate aliases"})
		return
	}

	writeJSON(w, http.StatusOK, listMarketRegionAliasesResponse{
		Items:            items,
		Total:            total,
		CanonicalOptions: marketingest.GoldenNeighborhoodCanonicalList(),
	})
}

func (a *api) handleAdminApproveMarketAlias(w http.ResponseWriter, r *http.Request, aliasID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	var req approveMarketAliasRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	canonical := marketingest.CanonicalNeighborhoodFromGolden(req.CanonicalName)
	if canonical == "" {
		canonical = marketingest.NormalizeNeighborhoodKey(req.CanonicalName)
	}
	if canonical == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "canonical_name is required"})
		return
	}

	row := a.db.QueryRowContext(r.Context(), `
		UPDATE market_region_aliases
		SET status = 'approved',
			canonical_name = $2,
			reviewed_at = NOW(),
			reviewed_by = $3,
			updated_at = NOW()
		WHERE id = $1
		RETURNING
			id,
			city,
			alias_raw,
			alias_normalized,
			canonical_name,
			status,
			suggested_canonical,
			suggested_confidence,
			occurrences,
			first_seen_at,
			last_seen_at,
			reviewed_at,
			reviewed_by,
			created_at,
			updated_at
	`, aliasID, canonical, userID)

	item, err := scanMarketRegionAlias(row)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "alias not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to approve alias"})
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func (a *api) handleAdminRejectMarketAlias(w http.ResponseWriter, r *http.Request, aliasID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	row := a.db.QueryRowContext(r.Context(), `
		UPDATE market_region_aliases
		SET status = 'rejected',
			canonical_name = NULL,
			reviewed_at = NOW(),
			reviewed_by = $2,
			updated_at = NOW()
		WHERE id = $1
		RETURNING
			id,
			city,
			alias_raw,
			alias_normalized,
			canonical_name,
			status,
			suggested_canonical,
			suggested_confidence,
			occurrences,
			first_seen_at,
			last_seen_at,
			reviewed_at,
			reviewed_by,
			created_at,
			updated_at
	`, aliasID, userID)

	item, err := scanMarketRegionAlias(row)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "alias not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to reject alias"})
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func scanMarketRegionAlias(scanner interface {
	Scan(dest ...interface{}) error
}) (marketRegionAliasResponse, error) {
	var out marketRegionAliasResponse
	var aliasRaw sql.NullString
	var canonicalName sql.NullString
	var suggestedCanonical sql.NullString
	var suggestedConfidence sql.NullFloat64
	var reviewedAt sql.NullTime
	var reviewedBy sql.NullString
	var firstSeenAt time.Time
	var lastSeenAt time.Time
	var createdAt time.Time
	var updatedAt time.Time

	err := scanner.Scan(
		&out.ID,
		&out.City,
		&aliasRaw,
		&out.AliasNormalized,
		&canonicalName,
		&out.Status,
		&suggestedCanonical,
		&suggestedConfidence,
		&out.Occurrences,
		&firstSeenAt,
		&lastSeenAt,
		&reviewedAt,
		&reviewedBy,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return marketRegionAliasResponse{}, err
	}

	if aliasRaw.Valid {
		value := aliasRaw.String
		out.AliasRaw = &value
	}
	if canonicalName.Valid {
		value := canonicalName.String
		out.CanonicalName = &value
	}
	if suggestedCanonical.Valid {
		value := suggestedCanonical.String
		out.SuggestedCanonical = &value
	}
	if suggestedConfidence.Valid {
		value := suggestedConfidence.Float64
		out.SuggestedConfidence = &value
	}
	if reviewedAt.Valid {
		value := reviewedAt.Time.UTC().Format(time.RFC3339)
		out.ReviewedAt = &value
	}
	if reviewedBy.Valid {
		value := reviewedBy.String
		out.ReviewedBy = &value
	}

	out.FirstSeenAt = firstSeenAt.UTC().Format(time.RFC3339)
	out.LastSeenAt = lastSeenAt.UTC().Format(time.RFC3339)
	out.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	out.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)

	return out, nil
}
