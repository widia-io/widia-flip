package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Types for opportunities API

type ScoreBreakdown struct {
	Discount  int `json:"discount"`
	Area      int `json:"area"`
	Bedrooms  int `json:"bedrooms"`
	Parking   int `json:"parking"`
	Keywords  int `json:"keywords"`
	Penalties int `json:"penalties"`
	Decay     int `json:"decay"`
}

type IngestListing struct {
	Source          string         `json:"source"`
	SourceListingID string         `json:"source_listing_id"`
	CanonicalURL    string         `json:"canonical_url"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	PriceCents      int64          `json:"price_cents"`
	AreaM2          float64        `json:"area_m2"`
	Bedrooms        int            `json:"bedrooms"`
	Bathrooms       int            `json:"bathrooms"`
	ParkingSpots    int            `json:"parking_spots"`
	CondoFeeCents   int64          `json:"condo_fee_cents"`
	IPTUCents       int64          `json:"iptu_cents"`
	Address         string         `json:"address"`
	Neighborhood    string         `json:"neighborhood"`
	City            string         `json:"city"`
	State           string         `json:"state"`
	Images          []string       `json:"images"`
	PublishedAt     *time.Time     `json:"published_at,omitempty"`
	Score           int            `json:"score"`
	ScoreBreakdown  ScoreBreakdown `json:"score_breakdown"`
	PricePerM2      float64        `json:"price_per_m2"`
	MedianPriceM2   float64        `json:"market_median_m2"`
	DiscountPct     float64        `json:"discount_pct"`
}

type IngestRequest struct {
	Source        string          `json:"source"`
	City          string          `json:"city"`
	Neighborhood  string          `json:"neighborhood"`
	ScrapedAt     time.Time       `json:"scraped_at"`
	MedianPriceM2 float64         `json:"median_price_m2"`
	Listings      []IngestListing `json:"listings"`
}

type IngestStats struct {
	TotalReceived int `json:"total_received"`
	NewListings   int `json:"new_listings"`
	Updated       int `json:"updated"`
}

type IngestResponse struct {
	JobRunID string      `json:"job_run_id"`
	Stats    IngestStats `json:"stats"`
}

type OpportunityResponse struct {
	ID              string         `json:"id"`
	Source          string         `json:"source"`
	SourceListingID string         `json:"source_listing_id"`
	CanonicalURL    string         `json:"canonical_url"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	PriceCents      int64          `json:"price_cents"`
	AreaM2          float64        `json:"area_m2"`
	Bedrooms        int            `json:"bedrooms"`
	Bathrooms       int            `json:"bathrooms"`
	ParkingSpots    int            `json:"parking_spots"`
	CondoFeeCents   int64          `json:"condo_fee_cents"`
	IPTUCents       int64          `json:"iptu_cents"`
	Address         string         `json:"address"`
	Neighborhood    string         `json:"neighborhood"`
	City            string         `json:"city"`
	State           string         `json:"state"`
	Images          []string       `json:"images"`
	PublishedAt     *time.Time     `json:"published_at,omitempty"`
	Score           int            `json:"score"`
	ScoreBreakdown  ScoreBreakdown `json:"score_breakdown"`
	PricePerM2      float64        `json:"price_per_m2"`
	MedianPriceM2   float64        `json:"market_median_m2"`
	DiscountPct     float64        `json:"discount_pct"`
	Status          string         `json:"status"`
	FirstSeenAt     time.Time      `json:"first_seen_at"`
	LastSeenAt      time.Time      `json:"last_seen_at"`
}

type OpportunityListResponse struct {
	Data   []OpportunityResponse `json:"data"`
	Total  int                   `json:"total"`
	Limit  int                   `json:"limit"`
	Offset int                   `json:"offset"`
}

type JobRunResponse struct {
	ID          string                 `json:"id"`
	JobName     string                 `json:"job_name"`
	Status      string                 `json:"status"`
	TriggerType string                 `json:"trigger_type"`
	TriggeredBy *string                `json:"triggered_by,omitempty"`
	StartedAt   *time.Time             `json:"started_at,omitempty"`
	FinishedAt  *time.Time             `json:"finished_at,omitempty"`
	Params      map[string]interface{} `json:"params,omitempty"`
	Stats       map[string]interface{} `json:"stats,omitempty"`
	Error       *string                `json:"error,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

type OpportunityFacetItemResponse struct {
	Value string `json:"value"`
	Label string `json:"label"`
	Count int    `json:"count"`
	State string `json:"state,omitempty"`
	City  string `json:"city,omitempty"`
}

type OpportunityFacetNumberItemResponse struct {
	Value int `json:"value"`
	Count int `json:"count"`
}

type OpportunityFacetRangesResponse struct {
	ScoreMin      int     `json:"score_min"`
	ScoreMax      int     `json:"score_max"`
	PriceMinCents int64   `json:"price_min_cents"`
	PriceMaxCents int64   `json:"price_max_cents"`
	AreaMin       float64 `json:"area_min"`
	AreaMax       float64 `json:"area_max"`
}

type OpportunityFacetsResponse struct {
	States        []OpportunityFacetItemResponse       `json:"states"`
	Cities        []OpportunityFacetItemResponse       `json:"cities"`
	Neighborhoods []OpportunityFacetItemResponse       `json:"neighborhoods"`
	Statuses      []OpportunityFacetItemResponse       `json:"statuses"`
	Bedrooms      []OpportunityFacetNumberItemResponse `json:"bedrooms"`
	Ranges        OpportunityFacetRangesResponse       `json:"ranges"`
}

type updateOpportunityStatusRequest struct {
	Status string `json:"status"`
}

type updateOpportunityStatusResponse struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	UpdatedAt time.Time `json:"updated_at"`
}

type opportunityListFilters struct {
	State        string
	City         string
	Neighborhood string
	ScoreMin     int
	PriceMin     int64
	PriceMax     int64
	AreaMin      float64
	AreaMax      float64
	Statuses     []string
	Bedrooms     []int
	SortBy       string
	Limit        int
	Offset       int
}

var allowedOpportunityStatuses = map[string]struct{}{
	"new":       {},
	"viewed":    {},
	"contacted": {},
	"discarded": {},
}

// handleOpportunitiesSubroutes routes /api/v1/opportunities/*
func (a *api) handleOpportunitiesSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/opportunities")

	switch {
	case path == "" || path == "/":
		if r.Method == http.MethodGet {
			a.handleListOpportunities(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	case path == "/facets" || path == "/facets/":
		if r.Method == http.MethodGet {
			a.handleListOpportunityFacets(w, r)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	case strings.HasSuffix(path, "/status"):
		if r.Method != http.MethodPatch {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) != 2 || parts[1] != "status" || parts[0] == "" {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
			return
		}
		a.handleUpdateOpportunityStatus(w, r, parts[0])
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
	}
}

// handleInternalOpportunitiesSubroutes routes /api/v1/internal/opportunities/*
func (a *api) handleInternalOpportunitiesSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/internal/opportunities")

	switch {
	case path == "" || path == "/":
		if r.Method == http.MethodGet {
			a.handleListOpportunities(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case path == "/ingest":
		if r.Method == http.MethodPost {
			a.handleIngestOpportunities(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
	}
}

// handleInternalJobRunsSubroutes routes /api/v1/internal/job-runs/*
func (a *api) handleInternalJobRunsSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/internal/job-runs")

	switch {
	case path == "" || path == "/":
		if r.Method == http.MethodGet {
			a.handleListJobRuns(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	default:
		// GET /api/v1/internal/job-runs/:id
		id := strings.TrimPrefix(path, "/")
		if r.Method == http.MethodGet {
			a.handleGetJobRun(w, r, id)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}
}

// POST /api/v1/internal/opportunities/ingest
func (a *api) handleIngestOpportunities(w http.ResponseWriter, r *http.Request) {
	var req IngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: err.Error()})
		return
	}

	if len(req.Listings) == 0 {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "listings cannot be empty"})
		return
	}

	// Create job run
	jobRunID := uuid.New().String()
	startedAt := time.Now()

	paramsJSON, _ := json.Marshal(map[string]interface{}{
		"source":          req.Source,
		"city":            req.City,
		"neighborhood":    req.Neighborhood,
		"median_price_m2": req.MedianPriceM2,
	})

	_, err := a.db.Exec(`
		INSERT INTO opportunity_job_runs (id, job_name, status, trigger_type, started_at, params, created_at)
		VALUES ($1, 'ZapOpportunityWorker', 'running', 'cli', $2, $3, $2)
	`, jobRunID, startedAt, paramsJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	// Process listings
	var newCount, updatedCount int

	for _, listing := range req.Listings {
		isNew, err := a.upsertListing(listing)
		if err != nil {
			// Log error but continue
			continue
		}
		if isNew {
			newCount++
		} else {
			updatedCount++
		}
	}

	// Update job run
	finishedAt := time.Now()
	statsJSON, _ := json.Marshal(map[string]interface{}{
		"total_received": len(req.Listings),
		"new_listings":   newCount,
		"updated":        updatedCount,
	})

	_, err = a.db.Exec(`
		UPDATE opportunity_job_runs
		SET status = 'completed', finished_at = $1, stats = $2
		WHERE id = $3
	`, finishedAt, statsJSON, jobRunID)
	if err != nil {
		// Log but don't fail
	}

	writeJSON(w, http.StatusOK, IngestResponse{
		JobRunID: jobRunID,
		Stats: IngestStats{
			TotalReceived: len(req.Listings),
			NewListings:   newCount,
			Updated:       updatedCount,
		},
	})
}

func (a *api) upsertListing(listing IngestListing) (isNew bool, err error) {
	imagesJSON, _ := json.Marshal(listing.Images)
	scoreBreakdownJSON, _ := json.Marshal(listing.ScoreBreakdown)

	// Check if exists
	var existingID string
	err = a.db.QueryRow(`
		SELECT id FROM source_listings
		WHERE source = $1 AND source_listing_id = $2
	`, listing.Source, listing.SourceListingID).Scan(&existingID)

	if err == sql.ErrNoRows {
		// Insert new
		isNew = true
		listingID := uuid.New().String()

		_, err = a.db.Exec(`
			INSERT INTO source_listings (
				id, source, source_listing_id, canonical_url, title, description,
				price_cents, area_m2, bedrooms, bathrooms, parking_spots,
				condo_fee_cents, iptu_cents, address, neighborhood, city, state,
				images, listing_published_at, first_seen_at, last_seen_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
			)
		`, listingID, listing.Source, listing.SourceListingID, listing.CanonicalURL,
			listing.Title, listing.Description, listing.PriceCents, listing.AreaM2,
			listing.Bedrooms, listing.Bathrooms, listing.ParkingSpots,
			listing.CondoFeeCents, listing.IPTUCents, listing.Address,
			listing.Neighborhood, listing.City, listing.State, imagesJSON, listing.PublishedAt)

		if err != nil {
			return false, err
		}

		// Insert opportunity
		_, err = a.db.Exec(`
			INSERT INTO opportunities (
				id, source_listing_id, score, score_breakdown,
				price_per_m2, market_median_m2, discount_pct, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
		`, uuid.New().String(), listingID, listing.Score, scoreBreakdownJSON,
			listing.PricePerM2, listing.MedianPriceM2, listing.DiscountPct)

		return true, err
	}

	if err != nil {
		return false, err
	}

	// Update existing
	_, err = a.db.Exec(`
		UPDATE source_listings SET
			canonical_url = $1, title = $2, description = $3,
			price_cents = $4, area_m2 = $5, bedrooms = $6, bathrooms = $7,
			parking_spots = $8, condo_fee_cents = $9, iptu_cents = $10,
			address = $11, neighborhood = $12, city = $13, state = $14,
			images = $15, last_seen_at = NOW(), updated_at = NOW()
		WHERE id = $16
	`, listing.CanonicalURL, listing.Title, listing.Description,
		listing.PriceCents, listing.AreaM2, listing.Bedrooms, listing.Bathrooms,
		listing.ParkingSpots, listing.CondoFeeCents, listing.IPTUCents,
		listing.Address, listing.Neighborhood, listing.City, listing.State,
		imagesJSON, existingID)

	if err != nil {
		return false, err
	}

	// Update opportunity score
	_, err = a.db.Exec(`
		UPDATE opportunities SET
			score = $1, score_breakdown = $2,
			price_per_m2 = $3, market_median_m2 = $4, discount_pct = $5,
			updated_at = NOW()
		WHERE source_listing_id = $6
	`, listing.Score, scoreBreakdownJSON, listing.PricePerM2,
		listing.MedianPriceM2, listing.DiscountPct, existingID)

	return false, err
}

func parseOpportunityListFilters(q map[string][]string) opportunityListFilters {
	filters := opportunityListFilters{
		State:        strings.TrimSpace(strings.ToLower(firstNonEmptyQueryValue(q, "state"))),
		City:         strings.TrimSpace(firstNonEmptyQueryValue(q, "city")),
		Neighborhood: strings.TrimSpace(firstNonEmptyQueryValue(q, "neighborhood")),
		SortBy:       strings.TrimSpace(firstNonEmptyQueryValue(q, "sort")),
		Statuses:     parseOpportunityCSV(firstNonEmptyQueryValue(q, "status")),
		Bedrooms:     parseOpportunityBedrooms(firstNonEmptyQueryValue(q, "bedrooms")),
	}

	filters.ScoreMin, _ = strconv.Atoi(firstNonEmptyQueryValue(q, "min_score", "score_min"))
	filters.PriceMin, _ = strconv.ParseInt(firstNonEmptyQueryValue(q, "min_price", "price_min"), 10, 64)
	filters.PriceMax, _ = strconv.ParseInt(firstNonEmptyQueryValue(q, "max_price", "price_max"), 10, 64)
	filters.AreaMin, _ = strconv.ParseFloat(firstNonEmptyQueryValue(q, "min_area", "area_min"), 64)
	filters.AreaMax, _ = strconv.ParseFloat(firstNonEmptyQueryValue(q, "max_area", "area_max"), 64)

	filters.Limit, _ = strconv.Atoi(firstNonEmptyQueryValue(q, "limit"))
	filters.Offset, _ = strconv.Atoi(firstNonEmptyQueryValue(q, "offset"))

	if filters.SortBy == "" {
		filters.SortBy = "score_desc"
	}
	if filters.Limit <= 0 || filters.Limit > 100 {
		filters.Limit = 20
	}
	if filters.Offset < 0 {
		filters.Offset = 0
	}

	return filters
}

func firstNonEmptyQueryValue(q map[string][]string, keys ...string) string {
	for _, key := range keys {
		values, ok := q[key]
		if !ok {
			continue
		}
		for _, value := range values {
			if strings.TrimSpace(value) != "" {
				return strings.TrimSpace(value)
			}
		}
	}
	return ""
}

func parseOpportunityCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	items := strings.Split(raw, ",")
	out := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func parseOpportunityBedrooms(raw string) []int {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	out := make([]int, 0, len(parts))
	seen := make(map[int]struct{}, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		value, err := strconv.Atoi(part)
		if err != nil || value < 0 {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func buildOpportunityFilterClause(filters opportunityListFilters) (string, []interface{}, int) {
	where := " WHERE 1=1"
	args := make([]interface{}, 0, 12)
	argNum := 1

	if filters.State != "" {
		where += fmt.Sprintf(" AND LOWER(sl.state) = LOWER($%d)", argNum)
		args = append(args, filters.State)
		argNum++
	}
	if filters.City != "" {
		where += fmt.Sprintf(" AND sl.city ILIKE $%d", argNum)
		args = append(args, "%"+filters.City+"%")
		argNum++
	}
	if filters.Neighborhood != "" {
		where += fmt.Sprintf(" AND sl.neighborhood ILIKE $%d", argNum)
		args = append(args, "%"+filters.Neighborhood+"%")
		argNum++
	}
	if filters.ScoreMin > 0 {
		where += fmt.Sprintf(" AND o.score >= $%d", argNum)
		args = append(args, filters.ScoreMin)
		argNum++
	}
	if filters.PriceMin > 0 {
		where += fmt.Sprintf(" AND sl.price_cents >= $%d", argNum)
		args = append(args, filters.PriceMin*100)
		argNum++
	}
	if filters.PriceMax > 0 {
		where += fmt.Sprintf(" AND sl.price_cents <= $%d", argNum)
		args = append(args, filters.PriceMax*100)
		argNum++
	}
	if filters.AreaMin > 0 {
		where += fmt.Sprintf(" AND sl.area_m2 >= $%d", argNum)
		args = append(args, filters.AreaMin)
		argNum++
	}
	if filters.AreaMax > 0 {
		where += fmt.Sprintf(" AND sl.area_m2 <= $%d", argNum)
		args = append(args, filters.AreaMax)
		argNum++
	}
	if len(filters.Statuses) > 0 {
		placeholders := make([]string, 0, len(filters.Statuses))
		for _, status := range filters.Statuses {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argNum))
			args = append(args, status)
			argNum++
		}
		where += fmt.Sprintf(" AND o.status IN (%s)", strings.Join(placeholders, ","))
	}
	if len(filters.Bedrooms) > 0 {
		placeholders := make([]string, 0, len(filters.Bedrooms))
		for _, bedroom := range filters.Bedrooms {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argNum))
			args = append(args, bedroom)
			argNum++
		}
		where += fmt.Sprintf(" AND sl.bedrooms IN (%s)", strings.Join(placeholders, ","))
	}

	return where, args, argNum
}

func scanOpportunityRows(rows *sql.Rows) []OpportunityResponse {
	opportunities := make([]OpportunityResponse, 0)

	for rows.Next() {
		var opp OpportunityResponse
		var imagesJSON, scoreBreakdownJSON []byte

		err := rows.Scan(
			&opp.ID, &opp.Source, &opp.SourceListingID, &opp.CanonicalURL,
			&opp.Title, &opp.Description, &opp.PriceCents, &opp.AreaM2,
			&opp.Bedrooms, &opp.Bathrooms, &opp.ParkingSpots,
			&opp.CondoFeeCents, &opp.IPTUCents, &opp.Address,
			&opp.Neighborhood, &opp.City, &opp.State, &imagesJSON,
			&opp.PublishedAt, &opp.Score, &scoreBreakdownJSON,
			&opp.PricePerM2, &opp.MedianPriceM2, &opp.DiscountPct,
			&opp.Status, &opp.FirstSeenAt, &opp.LastSeenAt,
		)
		if err != nil {
			continue
		}

		json.Unmarshal(imagesJSON, &opp.Images)
		json.Unmarshal(scoreBreakdownJSON, &opp.ScoreBreakdown)

		opportunities = append(opportunities, opp)
	}

	return opportunities
}

// GET /api/v1/internal/opportunities
// GET /api/v1/opportunities
func (a *api) handleListOpportunities(w http.ResponseWriter, r *http.Request) {
	filters := parseOpportunityListFilters(r.URL.Query())
	where, args, argNum := buildOpportunityFilterClause(filters)

	baseFrom := `
		FROM opportunities o
		JOIN source_listings sl ON o.source_listing_id = sl.id
	`

	query := `
		SELECT
			o.id, sl.source, sl.source_listing_id, sl.canonical_url,
			sl.title, sl.description, sl.price_cents, sl.area_m2,
			sl.bedrooms, sl.bathrooms, sl.parking_spots,
			sl.condo_fee_cents, sl.iptu_cents, sl.address,
			sl.neighborhood, sl.city, sl.state, sl.images,
			sl.listing_published_at, o.score, o.score_breakdown,
			o.price_per_m2, o.market_median_m2, o.discount_pct,
			o.status, sl.first_seen_at, sl.last_seen_at
	` + baseFrom + where

	countQuery := "SELECT COUNT(*) " + baseFrom + where

	switch filters.SortBy {
	case "price_asc":
		query += " ORDER BY sl.price_cents ASC"
	case "price_desc":
		query += " ORDER BY sl.price_cents DESC"
	case "date_desc":
		query += " ORDER BY sl.listing_published_at DESC NULLS LAST"
	default:
		query += " ORDER BY o.score DESC, o.created_at DESC"
	}

	var total int
	if err := a.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	listArgs := append(append([]interface{}{}, args...), filters.Limit, filters.Offset)

	rows, err := a.db.Query(query, listArgs...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	defer rows.Close()

	opportunities := scanOpportunityRows(rows)

	writeJSON(w, http.StatusOK, OpportunityListResponse{
		Data:   opportunities,
		Total:  total,
		Limit:  filters.Limit,
		Offset: filters.Offset,
	})
}

// GET /api/v1/opportunities/facets
func (a *api) handleListOpportunityFacets(w http.ResponseWriter, r *http.Request) {
	filters := parseOpportunityListFilters(r.URL.Query())
	where, args, _ := buildOpportunityFilterClause(filters)

	baseFrom := `
		FROM opportunities o
		JOIN source_listings sl ON o.source_listing_id = sl.id
	` + where

	facets := OpportunityFacetsResponse{
		States:        []OpportunityFacetItemResponse{},
		Cities:        []OpportunityFacetItemResponse{},
		Neighborhoods: []OpportunityFacetItemResponse{},
		Statuses:      []OpportunityFacetItemResponse{},
		Bedrooms:      []OpportunityFacetNumberItemResponse{},
		Ranges: OpportunityFacetRangesResponse{
			ScoreMin: 0,
			ScoreMax: 100,
		},
	}

	stateRows, err := a.db.Query(`
		SELECT LOWER(TRIM(sl.state)) AS state_value, COUNT(*)
	`+baseFrom+`
		AND sl.state IS NOT NULL
		AND TRIM(sl.state) <> ''
		GROUP BY state_value
		ORDER BY state_value ASC
	`, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	for stateRows.Next() {
		var value string
		var count int
		if scanErr := stateRows.Scan(&value, &count); scanErr != nil {
			continue
		}
		facets.States = append(facets.States, OpportunityFacetItemResponse{
			Value: value,
			Label: strings.ToUpper(value),
			Count: count,
			State: value,
		})
	}
	stateRows.Close()

	cityRows, err := a.db.Query(`
		SELECT LOWER(TRIM(sl.state)) AS state_value, TRIM(sl.city) AS city_value, COUNT(*)
	`+baseFrom+`
		AND sl.city IS NOT NULL
		AND TRIM(sl.city) <> ''
		GROUP BY state_value, city_value
		ORDER BY city_value ASC
	`, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	for cityRows.Next() {
		var stateValue string
		var cityValue string
		var count int
		if scanErr := cityRows.Scan(&stateValue, &cityValue, &count); scanErr != nil {
			continue
		}
		facets.Cities = append(facets.Cities, OpportunityFacetItemResponse{
			Value: cityValue,
			Label: cityValue,
			Count: count,
			State: stateValue,
		})
	}
	cityRows.Close()

	neighborhoodRows, err := a.db.Query(`
		SELECT LOWER(TRIM(sl.state)) AS state_value, TRIM(sl.city) AS city_value, TRIM(sl.neighborhood) AS neighborhood_value, COUNT(*)
	`+baseFrom+`
		AND sl.neighborhood IS NOT NULL
		AND TRIM(sl.neighborhood) <> ''
		GROUP BY state_value, city_value, neighborhood_value
		ORDER BY neighborhood_value ASC
	`, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	for neighborhoodRows.Next() {
		var stateValue string
		var cityValue string
		var neighborhoodValue string
		var count int
		if scanErr := neighborhoodRows.Scan(&stateValue, &cityValue, &neighborhoodValue, &count); scanErr != nil {
			continue
		}
		facets.Neighborhoods = append(facets.Neighborhoods, OpportunityFacetItemResponse{
			Value: neighborhoodValue,
			Label: neighborhoodValue,
			Count: count,
			State: stateValue,
			City:  cityValue,
		})
	}
	neighborhoodRows.Close()

	statusRows, err := a.db.Query(`
		SELECT o.status, COUNT(*)
	`+baseFrom+`
		GROUP BY o.status
		ORDER BY o.status ASC
	`, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	for statusRows.Next() {
		var value string
		var count int
		if scanErr := statusRows.Scan(&value, &count); scanErr != nil {
			continue
		}
		facets.Statuses = append(facets.Statuses, OpportunityFacetItemResponse{
			Value: value,
			Label: value,
			Count: count,
		})
	}
	statusRows.Close()

	bedroomRows, err := a.db.Query(`
		SELECT sl.bedrooms, COUNT(*)
	`+baseFrom+`
		AND sl.bedrooms IS NOT NULL
		GROUP BY sl.bedrooms
		ORDER BY sl.bedrooms ASC
	`, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	for bedroomRows.Next() {
		var value int
		var count int
		if scanErr := bedroomRows.Scan(&value, &count); scanErr != nil {
			continue
		}
		facets.Bedrooms = append(facets.Bedrooms, OpportunityFacetNumberItemResponse{
			Value: value,
			Count: count,
		})
	}
	bedroomRows.Close()

	var scoreMin sql.NullInt64
	var scoreMax sql.NullInt64
	var priceMin sql.NullInt64
	var priceMax sql.NullInt64
	var areaMin sql.NullFloat64
	var areaMax sql.NullFloat64

	err = a.db.QueryRow(`
		SELECT
			MIN(o.score),
			MAX(o.score),
			MIN(sl.price_cents),
			MAX(sl.price_cents),
			MIN(sl.area_m2),
			MAX(sl.area_m2)
	`+baseFrom+`
	`, args...).Scan(&scoreMin, &scoreMax, &priceMin, &priceMax, &areaMin, &areaMax)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	if scoreMin.Valid {
		facets.Ranges.ScoreMin = int(scoreMin.Int64)
	}
	if scoreMax.Valid {
		facets.Ranges.ScoreMax = int(scoreMax.Int64)
	}
	if priceMin.Valid {
		facets.Ranges.PriceMinCents = priceMin.Int64
	}
	if priceMax.Valid {
		facets.Ranges.PriceMaxCents = priceMax.Int64
	}
	if areaMin.Valid {
		facets.Ranges.AreaMin = areaMin.Float64
	}
	if areaMax.Valid {
		facets.Ranges.AreaMax = areaMax.Float64
	}

	writeJSON(w, http.StatusOK, facets)
}

// PATCH /api/v1/opportunities/:id/status
func (a *api) handleUpdateOpportunityStatus(w http.ResponseWriter, r *http.Request, opportunityID string) {
	var req updateOpportunityStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid request body"})
		return
	}

	status := strings.TrimSpace(strings.ToLower(req.Status))
	if _, ok := allowedOpportunityStatuses[status]; !ok {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "VALIDATION_ERROR",
			Message: "status must be one of: new, viewed, contacted, discarded",
		})
		return
	}

	var resp updateOpportunityStatusResponse
	err := a.db.QueryRow(`
		UPDATE opportunities
		SET status = $1,
			updated_at = NOW()
		WHERE id = $2
		RETURNING id, status, updated_at
	`, status, opportunityID).Scan(&resp.ID, &resp.Status, &resp.UpdatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "opportunity not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// GET /api/v1/internal/job-runs
func (a *api) handleListJobRuns(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	rows, err := a.db.Query(`
		SELECT id, job_name, status, trigger_type, triggered_by,
			   started_at, finished_at, params, stats, error_message, created_at
		FROM opportunity_job_runs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	defer rows.Close()

	var jobRuns []JobRunResponse
	for rows.Next() {
		var jr JobRunResponse
		var paramsJSON, statsJSON []byte

		err := rows.Scan(
			&jr.ID, &jr.JobName, &jr.Status, &jr.TriggerType, &jr.TriggeredBy,
			&jr.StartedAt, &jr.FinishedAt, &paramsJSON, &statsJSON, &jr.Error, &jr.CreatedAt,
		)
		if err != nil {
			continue
		}

		json.Unmarshal(paramsJSON, &jr.Params)
		json.Unmarshal(statsJSON, &jr.Stats)

		jobRuns = append(jobRuns, jr)
	}

	writeJSON(w, http.StatusOK, jobRuns)
}

// GET /api/v1/internal/job-runs/:id
func (a *api) handleGetJobRun(w http.ResponseWriter, r *http.Request, id string) {
	var jr JobRunResponse
	var paramsJSON, statsJSON []byte

	err := a.db.QueryRow(`
		SELECT id, job_name, status, trigger_type, triggered_by,
			   started_at, finished_at, params, stats, error_message, created_at
		FROM opportunity_job_runs
		WHERE id = $1
	`, id).Scan(
		&jr.ID, &jr.JobName, &jr.Status, &jr.TriggerType, &jr.TriggeredBy,
		&jr.StartedAt, &jr.FinishedAt, &paramsJSON, &statsJSON, &jr.Error, &jr.CreatedAt,
	)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "job run not found"})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	json.Unmarshal(paramsJSON, &jr.Params)
	json.Unmarshal(statsJSON, &jr.Stats)

	writeJSON(w, http.StatusOK, jr)
}
