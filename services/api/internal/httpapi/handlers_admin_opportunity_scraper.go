package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/zapscraper"
)

const (
	defaultOpportunityScraperLimit = 50
	maxOpportunityScraperLimit     = 200
	defaultOpportunityState        = "pr"

	defaultOpportunityCleanupLimit = 50
	maxOpportunityCleanupLimit     = 300
	opportunityCleanupBodyLimit    = 256 * 1024
	opportunityCleanupUserAgent    = "Mozilla/5.0 (compatible; WidiaFlipBot/1.0; +https://widia.com.br)"

	opportunityCleanupMinDelay               = 1500 * time.Millisecond
	opportunityCleanupMaxJitter              = 2500 * time.Millisecond
	opportunityCleanupBackoffBase            = 8 * time.Second
	opportunityCleanupBackoffMax             = 90 * time.Second
	opportunityCleanupMaxConsecutiveThrottle = 3
)

type opportunityScraperPlaceholderResponse struct {
	ID           string     `json:"id"`
	State        string     `json:"state"`
	City         string     `json:"city"`
	Neighborhood string     `json:"neighborhood"`
	LastRunAt    *time.Time `json:"last_run_at"`
	LastJobRunID *string    `json:"last_job_run_id"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type listOpportunityScraperPlaceholdersResponse struct {
	Items []opportunityScraperPlaceholderResponse `json:"items"`
}

type upsertOpportunityScraperPlaceholderRequest struct {
	State        string `json:"state"`
	City         string `json:"city"`
	Neighborhood string `json:"neighborhood"`
}

type runOpportunityScraperRequest struct {
	State         string  `json:"state"`
	City          string  `json:"city"`
	Neighborhood  string  `json:"neighborhood"`
	PlaceholderID *string `json:"placeholder_id,omitempty"`
	Limit         int     `json:"limit,omitempty"`
	DryRun        bool    `json:"dry_run"`
}

type runOpportunityScraperStats struct {
	TotalReceived int     `json:"total_received"`
	NewListings   int     `json:"new_listings"`
	Updated       int     `json:"updated"`
	MedianPriceM2 float64 `json:"median_price_m2"`
}

type runOpportunityScraperListing struct {
	SourceListingID string  `json:"source_listing_id"`
	CanonicalURL    string  `json:"canonical_url"`
	Title           string  `json:"title"`
	Neighborhood    string  `json:"neighborhood"`
	City            string  `json:"city"`
	State           string  `json:"state"`
	PriceCents      int64   `json:"price_cents"`
	AreaM2          float64 `json:"area_m2"`
	Bedrooms        int     `json:"bedrooms"`
	Bathrooms       int     `json:"bathrooms"`
	ParkingSpots    int     `json:"parking_spots"`
	Score           int     `json:"score"`
	PricePerM2      float64 `json:"price_per_m2"`
	MedianPriceM2   float64 `json:"market_median_m2"`
	DiscountPct     float64 `json:"discount_pct"`
}

type runOpportunityScraperResponse struct {
	JobRunID    string                                 `json:"job_run_id"`
	DryRun      bool                                   `json:"dry_run"`
	Stats       runOpportunityScraperStats             `json:"stats"`
	Listings    []runOpportunityScraperListing         `json:"listings"`
	Placeholder *opportunityScraperPlaceholderResponse `json:"placeholder,omitempty"`
}

type runOpportunityCleanupLinksRequest struct {
	Limit  int  `json:"limit,omitempty"`
	DryRun bool `json:"dry_run"`
}

type runOpportunityCleanupLinksStats struct {
	TotalCandidates int `json:"total_candidates"`
	Checked         int `json:"checked"`
	Unavailable     int `json:"unavailable_found"`
	Deleted         int `json:"deleted"`
	FetchErrors     int `json:"fetch_errors"`
	DeleteErrors    int `json:"delete_errors"`
}

type runOpportunityCleanupBrokenLink struct {
	SourceListingID string `json:"source_listing_id"`
	CanonicalURL    string `json:"canonical_url"`
	Reason          string `json:"reason"`
	HTTPStatus      *int   `json:"http_status,omitempty"`
}

type runOpportunityCleanupLinksResponse struct {
	JobRunID    string                            `json:"job_run_id"`
	DryRun      bool                              `json:"dry_run"`
	Stats       runOpportunityCleanupLinksStats   `json:"stats"`
	BrokenLinks []runOpportunityCleanupBrokenLink `json:"broken_links"`
}

type opportunityCleanupCandidate struct {
	RowID           string
	SourceListingID string
	CanonicalURL    string
}

type opportunityLinkCheckResult struct {
	Unavailable bool
	Reason      string
	HTTPStatus  int
}

type opportunityLinkCheckError struct {
	statusCode int
	retryAfter time.Duration
	message    string
}

func (e *opportunityLinkCheckError) Error() string {
	if e == nil {
		return "link check error"
	}
	if e.statusCode > 0 {
		return fmt.Sprintf("%s (status=%d)", e.message, e.statusCode)
	}
	return e.message
}

type opportunityCleanupRateLimiter struct {
	backoff time.Duration
}

func newOpportunityCleanupRateLimiter() *opportunityCleanupRateLimiter {
	return &opportunityCleanupRateLimiter{}
}

func (l *opportunityCleanupRateLimiter) Wait(ctx context.Context) error {
	if l == nil {
		return nil
	}

	jitter := time.Duration(rand.Int63n(int64(opportunityCleanupMaxJitter) + 1))
	delay := opportunityCleanupMinDelay + jitter
	if l.backoff > delay {
		delay = l.backoff
	}

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (l *opportunityCleanupRateLimiter) ApplyBackoff(backoff time.Duration) {
	if l == nil {
		return
	}
	if backoff <= 0 {
		return
	}
	if backoff > opportunityCleanupBackoffMax {
		backoff = opportunityCleanupBackoffMax
	}
	if backoff > l.backoff {
		l.backoff = backoff
	}
}

func (l *opportunityCleanupRateLimiter) ResetBackoff() {
	if l == nil {
		return
	}
	l.backoff = 0
}

// handleAdminOpportunityScraperSubroutes routes /api/v1/admin/opportunities/scraper/*
func (a *api) handleAdminOpportunityScraperSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/opportunities/scraper")

	switch {
	case path == "" || path == "/" || path == "/placeholders" || path == "/placeholders/":
		switch r.Method {
		case http.MethodGet:
			a.handleAdminListOpportunityScraperPlaceholders(w, r)
		case http.MethodPost:
			a.handleAdminCreateOpportunityScraperPlaceholder(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case path == "/run":
		if r.Method == http.MethodPost {
			a.handleAdminRunOpportunityScraper(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case path == "/cleanup-links":
		if r.Method == http.MethodPost {
			a.handleAdminCleanupOpportunityLinks(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	case strings.HasPrefix(path, "/placeholders/"):
		id := strings.Trim(strings.TrimPrefix(path, "/placeholders/"), "/")
		if id == "" || strings.Contains(id, "/") {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "placeholder not found"})
			return
		}

		switch r.Method {
		case http.MethodPut:
			a.handleAdminUpdateOpportunityScraperPlaceholder(w, r, id)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "endpoint not found"})
	}
}

// GET /api/v1/admin/opportunities/scraper/placeholders
func (a *api) handleAdminListOpportunityScraperPlaceholders(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, state, city, neighborhood, last_run_at, last_job_run_id, created_at, updated_at
		FROM opportunity_scraper_placeholders
		ORDER BY state ASC, city ASC, neighborhood ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list placeholders"})
		return
	}
	defer rows.Close()

	items := make([]opportunityScraperPlaceholderResponse, 0)
	for rows.Next() {
		placeholder, scanErr := scanOpportunityScraperPlaceholder(rows)
		if scanErr != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to scan placeholders"})
			return
		}
		items = append(items, placeholder)
	}

	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to iterate placeholders"})
		return
	}

	writeJSON(w, http.StatusOK, listOpportunityScraperPlaceholdersResponse{Items: items})
}

// POST /api/v1/admin/opportunities/scraper/placeholders
func (a *api) handleAdminCreateOpportunityScraperPlaceholder(w http.ResponseWriter, r *http.Request) {
	var req upsertOpportunityScraperPlaceholderRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid request body"})
		return
	}

	city := normalizeLocationLabel(req.City)
	neighborhood := normalizeLocationLabel(req.Neighborhood)
	state, stateErr := normalizeStateCode(req.State)
	if stateErr != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: stateErr.Error()})
		return
	}
	if city == "" || neighborhood == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "state, city and neighborhood are required"})
		return
	}

	placeholderID := uuid.New().String()
	_, err := a.db.ExecContext(r.Context(), `
		INSERT INTO opportunity_scraper_placeholders (id, state, city, neighborhood, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
	`, placeholderID, state, city, neighborhood)

	if err != nil {
		if isDuplicateKeyError(err) {
			writeError(w, http.StatusConflict, apiError{Code: "CONFLICT", Message: "placeholder already exists"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create placeholder"})
		return
	}

	stored, err := a.getOpportunityScraperPlaceholderByID(r.Context(), placeholderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to load created placeholder"})
		return
	}

	writeJSON(w, http.StatusCreated, stored)
}

// PUT /api/v1/admin/opportunities/scraper/placeholders/:id
func (a *api) handleAdminUpdateOpportunityScraperPlaceholder(w http.ResponseWriter, r *http.Request, id string) {
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid placeholder id"})
		return
	}

	var req upsertOpportunityScraperPlaceholderRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid request body"})
		return
	}

	city := normalizeLocationLabel(req.City)
	neighborhood := normalizeLocationLabel(req.Neighborhood)
	state, stateErr := normalizeStateCode(req.State)
	if stateErr != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: stateErr.Error()})
		return
	}
	if city == "" || neighborhood == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "state, city and neighborhood are required"})
		return
	}

	result, err := a.db.ExecContext(r.Context(), `
		UPDATE opportunity_scraper_placeholders
		SET state = $1,
			city = $2,
			neighborhood = $3,
			updated_at = NOW()
		WHERE id = $4
	`, state, city, neighborhood, id)
	if err != nil {
		if isDuplicateKeyError(err) {
			writeError(w, http.StatusConflict, apiError{Code: "CONFLICT", Message: "placeholder already exists"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update placeholder"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to update placeholder"})
		return
	}
	if rowsAffected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "placeholder not found"})
		return
	}

	stored, err := a.getOpportunityScraperPlaceholderByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to load updated placeholder"})
		return
	}

	writeJSON(w, http.StatusOK, stored)
}

// POST /api/v1/admin/opportunities/scraper/run
func (a *api) handleAdminRunOpportunityScraper(w http.ResponseWriter, r *http.Request) {
	var req runOpportunityScraperRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid request body"})
		return
	}

	placeholderID := ""
	if req.PlaceholderID != nil {
		placeholderID = strings.TrimSpace(*req.PlaceholderID)
	}

	var existingPlaceholder *opportunityScraperPlaceholderResponse
	if placeholderID != "" {
		if _, err := uuid.Parse(placeholderID); err != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid placeholder id"})
			return
		}

		placeholder, err := a.getOpportunityScraperPlaceholderByID(r.Context(), placeholderID)
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "placeholder not found"})
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to load placeholder"})
			return
		}
		existingPlaceholder = &placeholder
	}

	city := normalizeLocationLabel(req.City)
	neighborhood := normalizeLocationLabel(req.Neighborhood)
	state, stateErr := normalizeStateCode(req.State)
	if stateErr != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: stateErr.Error()})
		return
	}
	if existingPlaceholder != nil {
		if req.State == "" {
			state = existingPlaceholder.State
		}
		if city == "" {
			city = existingPlaceholder.City
		}
		if neighborhood == "" {
			neighborhood = existingPlaceholder.Neighborhood
		}
	}

	if city == "" || neighborhood == "" {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "state, city and neighborhood are required"})
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = defaultOpportunityScraperLimit
	}
	if limit > maxOpportunityScraperLimit {
		limit = maxOpportunityScraperLimit
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	triggerType := "admin"
	if req.DryRun {
		triggerType = "admin_dry_run"
	}

	jobRunID := uuid.New().String()
	startedAt := time.Now()
	paramsJSON, _ := json.Marshal(map[string]interface{}{
		"source":       "ZAP",
		"city":         city,
		"neighborhood": neighborhood,
		"state":        state,
		"limit":        limit,
		"dry_run":      req.DryRun,
	})

	_, err := a.db.ExecContext(r.Context(), `
		INSERT INTO opportunity_job_runs (id, job_name, status, trigger_type, triggered_by, started_at, params, created_at)
		VALUES ($1, 'ZapOpportunityWorker', 'running', $2, $3, $4, $5, $4)
	`, jobRunID, triggerType, userID, startedAt, paramsJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create job run"})
		return
	}

	runResult, runErr := zapscraper.Run(r.Context(), zapscraper.RunParams{
		City:         city,
		Neighborhood: neighborhood,
		State:        state,
		MaxListings:  limit,
	})

	finishedAt := time.Now()
	if runErr != nil {
		errMessage := runErr.Error()
		if updateErr := a.finishOpportunityJobRun(r.Context(), jobRunID, "failed", nil, &errMessage, finishedAt); updateErr != nil {
			log.Printf("admin scraper: failed to finalize job run %s after error: %v", jobRunID, updateErr)
		}
		if placeholderID != "" {
			if _, touchErr := a.touchOpportunityScraperPlaceholderRun(r.Context(), placeholderID, jobRunID, finishedAt); touchErr != nil {
				log.Printf("admin scraper: failed to touch placeholder %s after failure: %v", placeholderID, touchErr)
			}
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "SCRAPER_ERROR", Message: runErr.Error()})
		return
	}

	ingestListings := make([]IngestListing, 0, len(runResult.Listings))
	resultListings := make([]runOpportunityScraperListing, 0, len(runResult.Listings))
	for _, listing := range runResult.Listings {
		ingestListings = append(ingestListings, mapScraperOpportunityToIngestListing(listing))
		resultListings = append(resultListings, mapScraperOpportunityToRunListing(listing))
	}

	newCount := 0
	updatedCount := 0
	if !req.DryRun {
		newCount, updatedCount = a.ingestOpportunityListings(ingestListings)
	}

	stats := map[string]interface{}{
		"total_received":  len(ingestListings),
		"new_listings":    newCount,
		"updated":         updatedCount,
		"median_price_m2": runResult.MedianPriceM2,
		"dry_run":         req.DryRun,
	}

	if updateErr := a.finishOpportunityJobRun(r.Context(), jobRunID, "completed", stats, nil, finishedAt); updateErr != nil {
		log.Printf("admin scraper: failed to finalize job run %s: %v", jobRunID, updateErr)
	}

	var updatedPlaceholder *opportunityScraperPlaceholderResponse
	if placeholderID != "" {
		placeholder, touchErr := a.touchOpportunityScraperPlaceholderRun(r.Context(), placeholderID, jobRunID, finishedAt)
		if touchErr != nil {
			log.Printf("admin scraper: failed to touch placeholder %s: %v", placeholderID, touchErr)
		} else {
			updatedPlaceholder = &placeholder
		}
	}

	writeJSON(w, http.StatusOK, runOpportunityScraperResponse{
		JobRunID: jobRunID,
		DryRun:   req.DryRun,
		Stats: runOpportunityScraperStats{
			TotalReceived: len(ingestListings),
			NewListings:   newCount,
			Updated:       updatedCount,
			MedianPriceM2: runResult.MedianPriceM2,
		},
		Listings:    resultListings,
		Placeholder: updatedPlaceholder,
	})
}

// POST /api/v1/admin/opportunities/scraper/cleanup-links
func (a *api) handleAdminCleanupOpportunityLinks(w http.ResponseWriter, r *http.Request) {
	var req runOpportunityCleanupLinksRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "INVALID_BODY", Message: "invalid request body"})
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = defaultOpportunityCleanupLimit
	}
	if limit > maxOpportunityCleanupLimit {
		limit = maxOpportunityCleanupLimit
	}

	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth context"})
		return
	}

	triggerType := "admin_cleanup_links"
	if req.DryRun {
		triggerType = "admin_cleanup_links_dry_run"
	}

	jobRunID := uuid.New().String()
	startedAt := time.Now()
	paramsJSON, _ := json.Marshal(map[string]interface{}{
		"source":  "ZAP",
		"limit":   limit,
		"dry_run": req.DryRun,
	})

	_, err := a.db.ExecContext(r.Context(), `
		INSERT INTO opportunity_job_runs (id, job_name, status, trigger_type, triggered_by, started_at, params, created_at)
		VALUES ($1, 'ZapOpportunityCleanupLinksWorker', 'running', $2, $3, $4, $5, $4)
	`, jobRunID, triggerType, userID, startedAt, paramsJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to create cleanup job run"})
		return
	}

	candidates, err := a.listOpportunityCleanupCandidates(r.Context(), limit)
	if err != nil {
		errMessage := err.Error()
		finishedAt := time.Now()
		if updateErr := a.finishOpportunityJobRun(r.Context(), jobRunID, "failed", nil, &errMessage, finishedAt); updateErr != nil {
			log.Printf("cleanup links: failed to finalize job run %s after error: %v", jobRunID, updateErr)
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to load opportunities for cleanup"})
		return
	}

	stats := runOpportunityCleanupLinksStats{
		TotalCandidates: len(candidates),
	}

	brokenLinks := make([]runOpportunityCleanupBrokenLink, 0, len(candidates))
	httpClient := &http.Client{Timeout: 20 * time.Second}
	rateLimiter := newOpportunityCleanupRateLimiter()
	consecutiveThrottleErrors := 0
	throttledResponses := 0
	stoppedEarly := false

	for _, candidate := range candidates {
		if waitErr := rateLimiter.Wait(r.Context()); waitErr != nil {
			stoppedEarly = true
			log.Printf("cleanup links: interrupted before finishing candidate scan: %v", waitErr)
			break
		}

		stats.Checked++

		checkCtx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		checkResult, checkErr := checkOpportunityLinkAvailability(checkCtx, httpClient, candidate.CanonicalURL)
		cancel()

		if checkErr != nil {
			stats.FetchErrors++
			throttleErr, isThrottleErr := asOpportunityLinkCheckError(checkErr)
			if isThrottleErr {
				throttledResponses++
				consecutiveThrottleErrors++
				backoff := computeOpportunityCleanupBackoff(consecutiveThrottleErrors, throttleErr.retryAfter)
				rateLimiter.ApplyBackoff(backoff)

				log.Printf(
					"cleanup links: throttled listing_id=%s url=%s status=%d consecutive=%d backoff=%s",
					candidate.SourceListingID,
					candidate.CanonicalURL,
					throttleErr.statusCode,
					consecutiveThrottleErrors,
					backoff.String(),
				)

				if consecutiveThrottleErrors >= opportunityCleanupMaxConsecutiveThrottle {
					stoppedEarly = true
					log.Printf(
						"cleanup links: stopping early after %d consecutive throttled responses",
						consecutiveThrottleErrors,
					)
					break
				}
			} else {
				consecutiveThrottleErrors = 0
				rateLimiter.ResetBackoff()
				log.Printf("cleanup links: failed to verify listing_id=%s url=%s: %v", candidate.SourceListingID, candidate.CanonicalURL, checkErr)
			}
			continue
		}

		consecutiveThrottleErrors = 0
		rateLimiter.ResetBackoff()

		if !checkResult.Unavailable {
			continue
		}

		stats.Unavailable++
		var statusPtr *int
		if checkResult.HTTPStatus > 0 {
			statusCode := checkResult.HTTPStatus
			statusPtr = &statusCode
		}
		brokenLinks = append(brokenLinks, runOpportunityCleanupBrokenLink{
			SourceListingID: candidate.SourceListingID,
			CanonicalURL:    candidate.CanonicalURL,
			Reason:          checkResult.Reason,
			HTTPStatus:      statusPtr,
		})

		if req.DryRun {
			continue
		}

		deleted, deleteErr := a.deleteOpportunitySourceListingByID(r.Context(), candidate.RowID)
		if deleteErr != nil {
			stats.DeleteErrors++
			log.Printf("cleanup links: failed to delete source_listing_id=%s row_id=%s: %v", candidate.SourceListingID, candidate.RowID, deleteErr)
			continue
		}
		if deleted {
			stats.Deleted++
		}
	}

	finishedAt := time.Now()
	jobStats := map[string]interface{}{
		"total_candidates":  stats.TotalCandidates,
		"checked":           stats.Checked,
		"unavailable_found": stats.Unavailable,
		"deleted":           stats.Deleted,
		"fetch_errors":      stats.FetchErrors,
		"delete_errors":     stats.DeleteErrors,
		"throttled":         throttledResponses,
		"stopped_early":     stoppedEarly,
		"dry_run":           req.DryRun,
	}

	if updateErr := a.finishOpportunityJobRun(r.Context(), jobRunID, "completed", jobStats, nil, finishedAt); updateErr != nil {
		log.Printf("cleanup links: failed to finalize job run %s: %v", jobRunID, updateErr)
	}

	writeJSON(w, http.StatusOK, runOpportunityCleanupLinksResponse{
		JobRunID:    jobRunID,
		DryRun:      req.DryRun,
		Stats:       stats,
		BrokenLinks: brokenLinks,
	})
}

func (a *api) listOpportunityCleanupCandidates(ctx context.Context, limit int) ([]opportunityCleanupCandidate, error) {
	rows, err := a.db.QueryContext(ctx, `
		SELECT sl.id, sl.source_listing_id, sl.canonical_url
		FROM opportunities o
		JOIN source_listings sl ON o.source_listing_id = sl.id
		WHERE LOWER(sl.source) = 'zap'
		ORDER BY sl.last_seen_at ASC, sl.created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	candidates := make([]opportunityCleanupCandidate, 0, limit)
	for rows.Next() {
		var candidate opportunityCleanupCandidate
		if scanErr := rows.Scan(&candidate.RowID, &candidate.SourceListingID, &candidate.CanonicalURL); scanErr != nil {
			return nil, scanErr
		}
		candidates = append(candidates, candidate)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return candidates, nil
}

func (a *api) deleteOpportunitySourceListingByID(ctx context.Context, rowID string) (bool, error) {
	result, err := a.db.ExecContext(ctx, `
		DELETE FROM source_listings
		WHERE id = $1
	`, rowID)
	if err != nil {
		return false, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	return rowsAffected > 0, nil
}

func checkOpportunityLinkAvailability(ctx context.Context, client *http.Client, canonicalURL string) (opportunityLinkCheckResult, error) {
	canonicalURL = strings.TrimSpace(canonicalURL)
	if canonicalURL == "" {
		return opportunityLinkCheckResult{Unavailable: true, Reason: "missing_url"}, nil
	}

	parsedURL, err := url.Parse(canonicalURL)
	if err != nil || parsedURL.Host == "" || parsedURL.Scheme == "" {
		return opportunityLinkCheckResult{Unavailable: true, Reason: "invalid_url"}, nil
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, canonicalURL, nil)
	if err != nil {
		return opportunityLinkCheckResult{}, fmt.Errorf("build request: %w", err)
	}
	request.Header.Set("User-Agent", opportunityCleanupUserAgent)
	request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	response, err := client.Do(request)
	if err != nil {
		return opportunityLinkCheckResult{}, fmt.Errorf("request listing: %w", err)
	}
	defer response.Body.Close()

	statusCode := response.StatusCode
	if statusCode == http.StatusTooManyRequests || statusCode == http.StatusForbidden || statusCode >= 500 {
		retryAfter := parseRetryAfterDuration(response.Header.Get("Retry-After"), time.Now())
		return opportunityLinkCheckResult{}, &opportunityLinkCheckError{
			statusCode: statusCode,
			retryAfter: retryAfter,
			message:    "throttled or unstable response from source listing",
		}
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(response.Body, opportunityCleanupBodyLimit))
	if err != nil {
		return opportunityLinkCheckResult{}, fmt.Errorf("read listing body: %w", err)
	}

	finalURL := canonicalURL
	if response.Request != nil && response.Request.URL != nil {
		finalURL = response.Request.URL.String()
	}

	unavailable, reason := evaluateOpportunityListingAvailability(statusCode, finalURL, string(bodyBytes))
	return opportunityLinkCheckResult{
		Unavailable: unavailable,
		Reason:      reason,
		HTTPStatus:  statusCode,
	}, nil
}

func asOpportunityLinkCheckError(err error) (*opportunityLinkCheckError, bool) {
	if err == nil {
		return nil, false
	}
	var checkErr *opportunityLinkCheckError
	if errors.As(err, &checkErr) {
		return checkErr, true
	}
	return nil, false
}

func parseRetryAfterDuration(raw string, now time.Time) time.Duration {
	value := strings.TrimSpace(raw)
	if value == "" {
		return 0
	}

	seconds, atoiErr := strconv.Atoi(value)
	if atoiErr == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}

	atTime, parseErr := http.ParseTime(value)
	if parseErr != nil {
		return 0
	}

	if now.IsZero() {
		now = time.Now()
	}
	if !atTime.After(now) {
		return 0
	}

	return atTime.Sub(now)
}

func computeOpportunityCleanupBackoff(consecutiveThrottle int, retryAfter time.Duration) time.Duration {
	if consecutiveThrottle <= 0 {
		consecutiveThrottle = 1
	}

	backoff := opportunityCleanupBackoffBase
	for attempt := 1; attempt < consecutiveThrottle; attempt++ {
		if backoff >= opportunityCleanupBackoffMax {
			backoff = opportunityCleanupBackoffMax
			break
		}
		backoff *= 2
	}

	if backoff > opportunityCleanupBackoffMax {
		backoff = opportunityCleanupBackoffMax
	}
	if retryAfter > backoff {
		backoff = retryAfter
	}
	if backoff > opportunityCleanupBackoffMax {
		backoff = opportunityCleanupBackoffMax
	}
	if backoff < opportunityCleanupBackoffBase {
		backoff = opportunityCleanupBackoffBase
	}

	return backoff
}

func evaluateOpportunityListingAvailability(statusCode int, finalURL, body string) (bool, string) {
	if statusCode == http.StatusNotFound || statusCode == http.StatusGone {
		return true, "status_not_found"
	}

	if redirectedAwayFromListing(finalURL) {
		return true, "redirect_without_listing"
	}

	normalizedBody := normalizeOpportunityCheckText(body)
	for _, marker := range unavailableOpportunityMarkers {
		if strings.Contains(normalizedBody, marker) {
			return true, "unavailable_marker"
		}
	}

	return false, ""
}

func redirectedAwayFromListing(finalURL string) bool {
	parsedURL, err := url.Parse(strings.TrimSpace(finalURL))
	if err != nil || parsedURL.Host == "" {
		return false
	}

	host := strings.ToLower(parsedURL.Host)
	if !strings.Contains(host, "zapimoveis.com.br") {
		return false
	}

	path := strings.ToLower(parsedURL.Path)
	if path == "" {
		return false
	}

	return !strings.Contains(path, "/imovel/")
}

var opportunityUnavailableTextReplacer = strings.NewReplacer(
	"á", "a",
	"à", "a",
	"â", "a",
	"ã", "a",
	"ä", "a",
	"é", "e",
	"è", "e",
	"ê", "e",
	"ë", "e",
	"í", "i",
	"ì", "i",
	"î", "i",
	"ï", "i",
	"ó", "o",
	"ò", "o",
	"ô", "o",
	"õ", "o",
	"ö", "o",
	"ú", "u",
	"ù", "u",
	"û", "u",
	"ü", "u",
	"ç", "c",
)

var unavailableOpportunityMarkers = []string{
	"anuncio nao encontrado",
	"anuncio nao esta mais disponivel",
	"este anuncio nao esta mais disponivel",
	"imovel nao encontrado",
	"imovel indisponivel",
	"pagina nao encontrada",
	"nao encontramos este anuncio",
	"ops nao encontramos",
	"conteudo nao encontrado",
}

func normalizeOpportunityCheckText(value string) string {
	value = strings.ToLower(value)
	value = opportunityUnavailableTextReplacer.Replace(value)
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func (a *api) getOpportunityScraperPlaceholderByID(ctx context.Context, id string) (opportunityScraperPlaceholderResponse, error) {
	row := a.db.QueryRowContext(ctx, `
		SELECT id, state, city, neighborhood, last_run_at, last_job_run_id, created_at, updated_at
		FROM opportunity_scraper_placeholders
		WHERE id = $1
	`, id)

	placeholder, err := scanOpportunityScraperPlaceholder(row)
	if err != nil {
		return opportunityScraperPlaceholderResponse{}, err
	}

	return placeholder, nil
}

func (a *api) touchOpportunityScraperPlaceholderRun(
	ctx context.Context,
	id string,
	jobRunID string,
	runAt time.Time,
) (opportunityScraperPlaceholderResponse, error) {
	row := a.db.QueryRowContext(ctx, `
		UPDATE opportunity_scraper_placeholders
		SET last_run_at = $1,
			last_job_run_id = $2,
			updated_at = NOW()
		WHERE id = $3
		RETURNING id, state, city, neighborhood, last_run_at, last_job_run_id, created_at, updated_at
	`, runAt, jobRunID, id)

	placeholder, err := scanOpportunityScraperPlaceholder(row)
	if err != nil {
		return opportunityScraperPlaceholderResponse{}, err
	}

	return placeholder, nil
}

func (a *api) finishOpportunityJobRun(
	ctx context.Context,
	jobRunID string,
	status string,
	stats map[string]interface{},
	errorMessage *string,
	finishedAt time.Time,
) error {
	var statsJSON []byte
	if stats != nil {
		statsJSON, _ = json.Marshal(stats)
	}

	_, err := a.db.ExecContext(ctx, `
		UPDATE opportunity_job_runs
		SET status = $1,
			finished_at = $2,
			stats = $3,
			error_message = $4
		WHERE id = $5
	`, status, finishedAt, statsJSON, errorMessage, jobRunID)
	if err != nil {
		return fmt.Errorf("update job run: %w", err)
	}

	return nil
}

func (a *api) ingestOpportunityListings(listings []IngestListing) (int, int) {
	newCount := 0
	updatedCount := 0

	for _, listing := range listings {
		isNew, err := a.upsertListing(listing)
		if err != nil {
			log.Printf("admin scraper: failed to upsert listing source=%s listing_id=%s: %v", listing.Source, listing.SourceListingID, err)
			continue
		}

		if isNew {
			newCount++
		} else {
			updatedCount++
		}
	}

	return newCount, updatedCount
}

func mapScraperOpportunityToIngestListing(listing zapscraper.Opportunity) IngestListing {
	return IngestListing{
		Source:          listing.Source,
		SourceListingID: listing.SourceListingID,
		CanonicalURL:    listing.CanonicalURL,
		Title:           listing.Title,
		Description:     listing.Description,
		PriceCents:      listing.PriceCents,
		AreaM2:          listing.AreaM2,
		Bedrooms:        listing.Bedrooms,
		Bathrooms:       listing.Bathrooms,
		ParkingSpots:    listing.ParkingSpots,
		CondoFeeCents:   listing.CondoFeeCents,
		IPTUCents:       listing.IPTUCents,
		Address:         listing.Address,
		Neighborhood:    listing.Neighborhood,
		City:            listing.City,
		State:           listing.State,
		Images:          listing.Images,
		PublishedAt:     listing.PublishedAt,
		Score:           listing.Score,
		ScoreBreakdown: ScoreBreakdown{
			Discount:  listing.ScoreBreakdown.Discount,
			Area:      listing.ScoreBreakdown.Area,
			Bedrooms:  listing.ScoreBreakdown.Bedrooms,
			Parking:   listing.ScoreBreakdown.Parking,
			Keywords:  listing.ScoreBreakdown.Keywords,
			Penalties: listing.ScoreBreakdown.Penalties,
			Decay:     listing.ScoreBreakdown.Decay,
		},
		PricePerM2:    listing.PricePerM2,
		MedianPriceM2: listing.MedianPriceM2,
		DiscountPct:   listing.DiscountPct,
	}
}

func mapScraperOpportunityToRunListing(listing zapscraper.Opportunity) runOpportunityScraperListing {
	return runOpportunityScraperListing{
		SourceListingID: listing.SourceListingID,
		CanonicalURL:    listing.CanonicalURL,
		Title:           listing.Title,
		Neighborhood:    listing.Neighborhood,
		City:            listing.City,
		State:           listing.State,
		PriceCents:      listing.PriceCents,
		AreaM2:          listing.AreaM2,
		Bedrooms:        listing.Bedrooms,
		Bathrooms:       listing.Bathrooms,
		ParkingSpots:    listing.ParkingSpots,
		Score:           listing.Score,
		PricePerM2:      listing.PricePerM2,
		MedianPriceM2:   listing.MedianPriceM2,
		DiscountPct:     listing.DiscountPct,
	}
}

func scanOpportunityScraperPlaceholder(scanner interface {
	Scan(dest ...interface{}) error
}) (opportunityScraperPlaceholderResponse, error) {
	var placeholder opportunityScraperPlaceholderResponse
	var lastRunAt sql.NullTime
	var lastJobRunID sql.NullString

	err := scanner.Scan(
		&placeholder.ID,
		&placeholder.State,
		&placeholder.City,
		&placeholder.Neighborhood,
		&lastRunAt,
		&lastJobRunID,
		&placeholder.CreatedAt,
		&placeholder.UpdatedAt,
	)
	if err != nil {
		return opportunityScraperPlaceholderResponse{}, err
	}

	if lastRunAt.Valid {
		placeholder.LastRunAt = &lastRunAt.Time
	}
	if lastJobRunID.Valid {
		placeholder.LastJobRunID = &lastJobRunID.String
	}

	return placeholder, nil
}

func normalizeLocationLabel(value string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
}

func normalizeStateCode(value string) (string, error) {
	state := strings.TrimSpace(strings.ToLower(value))
	if state == "" {
		return defaultOpportunityState, nil
	}
	if len(state) != 2 {
		return "", fmt.Errorf("state must have 2 letters")
	}
	for _, r := range state {
		if r < 'a' || r > 'z' {
			return "", fmt.Errorf("state must contain only letters")
		}
	}
	return state, nil
}

func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(strings.ToLower(err.Error()), "duplicate key value")
}
