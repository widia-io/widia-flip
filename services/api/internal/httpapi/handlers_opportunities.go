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
	Source          string          `json:"source"`
	SourceListingID string          `json:"source_listing_id"`
	CanonicalURL    string          `json:"canonical_url"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	PriceCents      int64           `json:"price_cents"`
	AreaM2          float64         `json:"area_m2"`
	Bedrooms        int             `json:"bedrooms"`
	Bathrooms       int             `json:"bathrooms"`
	ParkingSpots    int             `json:"parking_spots"`
	CondoFeeCents   int64           `json:"condo_fee_cents"`
	IPTUCents       int64           `json:"iptu_cents"`
	Address         string          `json:"address"`
	Neighborhood    string          `json:"neighborhood"`
	City            string          `json:"city"`
	State           string          `json:"state"`
	Images          []string        `json:"images"`
	PublishedAt     *time.Time      `json:"published_at,omitempty"`
	Score           int             `json:"score"`
	ScoreBreakdown  ScoreBreakdown  `json:"score_breakdown"`
	PricePerM2      float64         `json:"price_per_m2"`
	MedianPriceM2   float64         `json:"market_median_m2"`
	DiscountPct     float64         `json:"discount_pct"`
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
	ID              string          `json:"id"`
	Source          string          `json:"source"`
	SourceListingID string          `json:"source_listing_id"`
	CanonicalURL    string          `json:"canonical_url"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	PriceCents      int64           `json:"price_cents"`
	AreaM2          float64         `json:"area_m2"`
	Bedrooms        int             `json:"bedrooms"`
	Bathrooms       int             `json:"bathrooms"`
	ParkingSpots    int             `json:"parking_spots"`
	CondoFeeCents   int64           `json:"condo_fee_cents"`
	IPTUCents       int64           `json:"iptu_cents"`
	Address         string          `json:"address"`
	Neighborhood    string          `json:"neighborhood"`
	City            string          `json:"city"`
	State           string          `json:"state"`
	Images          []string        `json:"images"`
	PublishedAt     *time.Time      `json:"published_at,omitempty"`
	Score           int             `json:"score"`
	ScoreBreakdown  ScoreBreakdown  `json:"score_breakdown"`
	PricePerM2      float64         `json:"price_per_m2"`
	MedianPriceM2   float64         `json:"market_median_m2"`
	DiscountPct     float64         `json:"discount_pct"`
	Status          string          `json:"status"`
	FirstSeenAt     time.Time       `json:"first_seen_at"`
	LastSeenAt      time.Time       `json:"last_seen_at"`
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

// GET /api/v1/internal/opportunities
func (a *api) handleListOpportunities(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	// Parse filters
	city := q.Get("city")
	neighborhood := q.Get("neighborhood")
	scoreMin, _ := strconv.Atoi(q.Get("score_min"))
	priceMin, _ := strconv.ParseInt(q.Get("price_min"), 10, 64)
	priceMax, _ := strconv.ParseInt(q.Get("price_max"), 10, 64)
	areaMin, _ := strconv.ParseFloat(q.Get("area_min"), 64)
	areaMax, _ := strconv.ParseFloat(q.Get("area_max"), 64)
	status := q.Get("status")
	bedroomsStr := q.Get("bedrooms")
	sortBy := q.Get("sort")
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// Build query
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
		FROM opportunities o
		JOIN source_listings sl ON o.source_listing_id = sl.id
		WHERE 1=1
	`
	countQuery := `
		SELECT COUNT(*)
		FROM opportunities o
		JOIN source_listings sl ON o.source_listing_id = sl.id
		WHERE 1=1
	`

	var args []interface{}
	argNum := 1

	if city != "" {
		query += fmt.Sprintf(" AND sl.city ILIKE $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.city ILIKE $%d", argNum)
		args = append(args, "%"+city+"%")
		argNum++
	}

	if neighborhood != "" {
		query += fmt.Sprintf(" AND sl.neighborhood ILIKE $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.neighborhood ILIKE $%d", argNum)
		args = append(args, "%"+neighborhood+"%")
		argNum++
	}

	if scoreMin > 0 {
		query += fmt.Sprintf(" AND o.score >= $%d", argNum)
		countQuery += fmt.Sprintf(" AND o.score >= $%d", argNum)
		args = append(args, scoreMin)
		argNum++
	}

	if priceMin > 0 {
		query += fmt.Sprintf(" AND sl.price_cents >= $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.price_cents >= $%d", argNum)
		args = append(args, priceMin*100) // Convert to cents
		argNum++
	}

	if priceMax > 0 {
		query += fmt.Sprintf(" AND sl.price_cents <= $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.price_cents <= $%d", argNum)
		args = append(args, priceMax*100)
		argNum++
	}

	if areaMin > 0 {
		query += fmt.Sprintf(" AND sl.area_m2 >= $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.area_m2 >= $%d", argNum)
		args = append(args, areaMin)
		argNum++
	}

	if areaMax > 0 {
		query += fmt.Sprintf(" AND sl.area_m2 <= $%d", argNum)
		countQuery += fmt.Sprintf(" AND sl.area_m2 <= $%d", argNum)
		args = append(args, areaMax)
		argNum++
	}

	if status != "" {
		statuses := strings.Split(status, ",")
		placeholders := make([]string, len(statuses))
		for i, s := range statuses {
			placeholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, strings.TrimSpace(s))
			argNum++
		}
		query += fmt.Sprintf(" AND o.status IN (%s)", strings.Join(placeholders, ","))
		countQuery += fmt.Sprintf(" AND o.status IN (%s)", strings.Join(placeholders, ","))
	}

	if bedroomsStr != "" {
		bedrooms := strings.Split(bedroomsStr, ",")
		placeholders := make([]string, len(bedrooms))
		for i, b := range bedrooms {
			placeholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, strings.TrimSpace(b))
			argNum++
		}
		query += fmt.Sprintf(" AND sl.bedrooms IN (%s)", strings.Join(placeholders, ","))
		countQuery += fmt.Sprintf(" AND sl.bedrooms IN (%s)", strings.Join(placeholders, ","))
	}

	// Sorting
	switch sortBy {
	case "price_asc":
		query += " ORDER BY sl.price_cents ASC"
	case "price_desc":
		query += " ORDER BY sl.price_cents DESC"
	case "date_desc":
		query += " ORDER BY sl.listing_published_at DESC NULLS LAST"
	default:
		query += " ORDER BY o.score DESC, o.created_at DESC"
	}

	// Count total
	var total int
	err := a.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	// Add pagination
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argNum, argNum+1)
	args = append(args, limit, offset)

	rows, err := a.db.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	defer rows.Close()

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

	writeJSON(w, http.StatusOK, OpportunityListResponse{
		Data:   opportunities,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
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
