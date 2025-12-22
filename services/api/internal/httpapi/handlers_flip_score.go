package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/flipscore"
)

const (
	flipScoreRateLimitMinutes = 15
)

type recomputeFlipScoreResponse struct {
	Prospect flipScoreProspect `json:"prospect"`
}

type flipScoreProspect struct {
	ID                   string           `json:"id"`
	FlipScore            *int             `json:"flip_score"`
	FlipScoreVersion     *string          `json:"flip_score_version"`
	FlipScoreConfidence  *float64         `json:"flip_score_confidence"`
	FlipScoreBreakdown   *json.RawMessage `json:"flip_score_breakdown"`
	FlipScoreUpdatedAt   *time.Time       `json:"flip_score_updated_at"`
}

func (a *api) handleFlipScoreRecompute(w http.ResponseWriter, r *http.Request, prospectID string) {
	reqID := r.Header.Get("X-Request-ID")
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Parse force param
	force := r.URL.Query().Get("force") == "true"

	log.Printf("flip_score_recompute_start request_id=%s prospect_id=%s user_id=%s force=%v", reqID, prospectID, userID, force)

	// Fetch prospect with access check
	prospect, err := a.getProspectWithFlipScore(r.Context(), prospectID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		log.Printf("flip_score_error request_id=%s error=%v", reqID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	// Check rate limit
	if prospect.FlipScoreUpdatedAt != nil && !force {
		elapsed := time.Since(*prospect.FlipScoreUpdatedAt)
		if elapsed < time.Duration(flipScoreRateLimitMinutes)*time.Minute {
			remaining := time.Duration(flipScoreRateLimitMinutes)*time.Minute - elapsed
			log.Printf("flip_score_rate_limited request_id=%s prospect_id=%s elapsed_min=%d remaining_min=%d",
				reqID, prospectID, int(elapsed.Minutes()), int(remaining.Minutes())+1)
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "RATE_LIMITED",
				Message: "Score atualizado recentemente. Aguarde ou use force=true.",
			})
			return
		}
	}

	// Get cohort stats for S_price calculation
	cohort := a.getCohortStats(r.Context(), prospect)
	log.Printf("flip_score_cohort request_id=%s prospect_id=%s cohort_scope=%s cohort_n=%d",
		reqID, prospectID, cohort.Scope, cohort.N)

	// Try LLM risk assessment (with fallback)
	var riskAssessment *flipscore.FlipRiskAssessment
	if a.llmClient != nil && prospect.ListingText != nil && *prospect.ListingText != "" {
		startTime := time.Now()
		log.Printf("llm_request_start request_id=%s prospect_id=%s input_len=%d",
			reqID, prospectID, len(*prospect.ListingText))

		assessment, err := a.llmClient.ExtractRiskAssessment(r.Context(), *prospect.ListingText)
		latency := time.Since(startTime).Milliseconds()

		if err != nil {
			log.Printf("llm_request_error request_id=%s prospect_id=%s error=%v latency_ms=%d",
				reqID, prospectID, err, latency)
			// Continue without risk assessment (fallback)
		} else {
			log.Printf("llm_request_success request_id=%s prospect_id=%s latency_ms=%d llm_confidence=%.2f",
				reqID, prospectID, latency, assessment.LLMConfidence)
			riskAssessment = assessment
		}
	}

	// Build inputs
	inputs := flipscore.ProspectInputs{
		AskingPrice:  prospect.AskingPrice,
		AreaUsable:   prospect.AreaUsable,
		CondoFee:     prospect.CondoFee,
		IPTU:         prospect.IPTU,
		Bedrooms:     prospect.Bedrooms,
		Parking:      prospect.Parking,
		Elevator:     prospect.Elevator,
		Neighborhood: prospect.Neighborhood,
	}

	// Calculate score
	result := flipscore.Calculate(inputs, riskAssessment, cohort)

	// Persist to DB
	if err := a.persistFlipScore(r.Context(), prospectID, result); err != nil {
		log.Printf("flip_score_persist_error request_id=%s prospect_id=%s error=%v", reqID, prospectID, err)
		writeError(w, http.StatusInternalServerError, apiError{Code: "SCORE_CALC_FAILED", Message: "failed to persist score"})
		return
	}

	// Build response
	breakdownBytes, _ := json.Marshal(result.Breakdown)
	breakdownRaw := json.RawMessage(breakdownBytes)
	scoreVersion := result.Version
	scoreConfidence := result.Confidence
	computedAt := result.ComputedAt

	log.Printf("flip_score_recompute_done request_id=%s prospect_id=%s score=%d version=%s confidence=%.2f",
		reqID, prospectID, result.Score, result.Version, result.Confidence)

	writeJSON(w, http.StatusOK, recomputeFlipScoreResponse{
		Prospect: flipScoreProspect{
			ID:                   prospectID,
			FlipScore:            &result.Score,
			FlipScoreVersion:     &scoreVersion,
			FlipScoreConfidence:  &scoreConfidence,
			FlipScoreBreakdown:   &breakdownRaw,
			FlipScoreUpdatedAt:   &computedAt,
		},
	})
}

// getProspectWithFlipScore fetches a prospect including flip_score fields with access check
func (a *api) getProspectWithFlipScore(ctx context.Context, prospectID, userID string) (*prospect, error) {
	var p prospect
	var tags []byte
	var flipScoreBreakdown []byte

	err := a.db.QueryRowContext(
		ctx,
		`SELECT p.id, p.workspace_id, p.status, p.link, p.neighborhood, p.address,
		        p.area_usable, p.bedrooms, p.suites, p.bathrooms, p.gas, p.floor, p.elevator, p.face, p.parking,
		        p.condo_fee, p.iptu, p.asking_price, p.agency, p.broker_name, p.broker_phone,
		        p.comments, p.tags, p.created_at, p.updated_at,
		        p.listing_text, p.flip_score, p.flip_score_version, p.flip_score_confidence,
		        p.flip_score_breakdown, p.flip_score_updated_at
		 FROM prospecting_properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		prospectID, userID,
	).Scan(
		&p.ID, &p.WorkspaceID, &p.Status, &p.Link, &p.Neighborhood, &p.Address,
		&p.AreaUsable, &p.Bedrooms, &p.Suites, &p.Bathrooms, &p.Gas, &p.Floor, &p.Elevator, &p.Face, &p.Parking,
		&p.CondoFee, &p.IPTU, &p.AskingPrice, &p.Agency, &p.BrokerName, &p.BrokerPhone,
		&p.Comments, &tags, &p.CreatedAt, &p.UpdatedAt,
		&p.ListingText, &p.FlipScore, &p.FlipScoreVersion, &p.FlipScoreConfidence,
		&flipScoreBreakdown, &p.FlipScoreUpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	p.Tags = parseTags(tags)
	p.PricePerSqm = computePricePerSqm(p.AskingPrice, p.AreaUsable)

	if len(flipScoreBreakdown) > 0 {
		raw := json.RawMessage(flipScoreBreakdown)
		p.FlipScoreBreakdown = &raw
	}

	return &p, nil
}

// getCohortStats calculates the cohort statistics for S_price calculation
func (a *api) getCohortStats(ctx context.Context, p *prospect) flipscore.CohortStats {
	// Default: workspace-level cohort
	stats := flipscore.CohortStats{
		Scope:          "workspace",
		N:              0,
		PercentileRank: 0.5, // Default middle rank
	}

	// Calculate price per sqm for current prospect
	if p.AskingPrice == nil || p.AreaUsable == nil || *p.AreaUsable == 0 {
		return stats
	}
	currentPPS := *p.AskingPrice / *p.AreaUsable

	// Try neighborhood-level cohort first (if neighborhood exists and has >= 10 prospects)
	if p.Neighborhood != nil && *p.Neighborhood != "" {
		var count int
		var rank float64
		err := a.db.QueryRowContext(
			ctx,
			`WITH cohort AS (
				SELECT asking_price / NULLIF(area_usable, 0) as pps
				FROM prospecting_properties
				WHERE workspace_id = $1
				  AND neighborhood = $2
				  AND asking_price IS NOT NULL
				  AND area_usable IS NOT NULL
				  AND area_usable > 0
			)
			SELECT COUNT(*) as n,
			       COALESCE(
			         (SELECT COUNT(*) FROM cohort WHERE pps < $3)::float / NULLIF(COUNT(*), 0),
			         0.5
			       ) as percentile
			FROM cohort`,
			p.WorkspaceID, *p.Neighborhood, currentPPS,
		).Scan(&count, &rank)

		if err == nil && count >= 10 {
			stats.Scope = "neighborhood"
			stats.N = count
			stats.PercentileRank = rank
			return stats
		}
	}

	// Fallback to workspace-level cohort
	var count int
	var rank float64
	err := a.db.QueryRowContext(
		ctx,
		`WITH cohort AS (
			SELECT asking_price / NULLIF(area_usable, 0) as pps
			FROM prospecting_properties
			WHERE workspace_id = $1
			  AND asking_price IS NOT NULL
			  AND area_usable IS NOT NULL
			  AND area_usable > 0
		)
		SELECT COUNT(*) as n,
		       COALESCE(
		         (SELECT COUNT(*) FROM cohort WHERE pps < $2)::float / NULLIF(COUNT(*), 0),
		         0.5
		       ) as percentile
		FROM cohort`,
		p.WorkspaceID, currentPPS,
	).Scan(&count, &rank)

	if err == nil {
		stats.N = count
		stats.PercentileRank = rank
	}

	return stats
}

// persistFlipScore saves the flip score result to the database
func (a *api) persistFlipScore(ctx context.Context, prospectID string, result flipscore.Result) error {
	breakdownBytes, err := json.Marshal(result.Breakdown)
	if err != nil {
		return err
	}

	_, err = a.db.ExecContext(
		ctx,
		`UPDATE prospecting_properties
		 SET flip_score = $1,
		     flip_score_version = $2,
		     flip_score_confidence = $3,
		     flip_score_breakdown = $4,
		     flip_score_updated_at = $5,
		     updated_at = now()
		 WHERE id = $6`,
		result.Score,
		result.Version,
		result.Confidence,
		breakdownBytes,
		result.ComputedAt,
		prospectID,
	)
	return err
}
