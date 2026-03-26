package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/llm"
	"github.com/widia-projects/widia-flip/services/api/internal/offerintelligence"
)

type offerIntelligenceGenerateRequest struct {
	Source string `json:"source"`
}

type offerIntelligenceSaveRequest struct {
	Source string `json:"source"`
}

type offerGatingResponse struct {
	FullAccess       bool     `json:"full_access"`
	AllowedScenarios []string `json:"allowed_scenarios"`
	HistoryEnabled   bool     `json:"history_enabled"`
	MessageLevel     string   `json:"message_level"`
}

type offerIntelligencePreviewResponse struct {
	ProspectID          string                                 `json:"prospect_id"`
	WorkspaceID         string                                 `json:"workspace_id"`
	FormulaVersion      string                                 `json:"formula_version"`
	GeneratedAt         string                                 `json:"generated_at"`
	Decision            string                                 `json:"decision"`
	Confidence          float64                                `json:"confidence"`
	ConfidenceBucket    string                                 `json:"confidence_bucket"`
	ReasonCodes         []string                               `json:"reason_codes"`
	ReasonLabels        []string                               `json:"reason_labels"`
	RiskScore           float64                                `json:"risk_score"`
	Assumptions         []string                               `json:"assumptions"`
	DefaultsUsed        []string                               `json:"defaults_used"`
	Scenarios           []offerintelligence.Scenario           `json:"scenarios"`
	MessageTemplates    offerintelligence.MessageTemplates     `json:"message_templates"`
	Gating              offerGatingResponse                    `json:"gating"`
	InputHash           string                                 `json:"input_hash"`
	SettingsHash        string                                 `json:"settings_hash"`
	Tier                string                                 `json:"tier"`
	Limited             bool                                   `json:"limited"`
	ConfidenceBreakdown offerintelligence.ConfidenceComponents `json:"confidence_breakdown"`
}

type offerIntelligenceSaveResponse struct {
	OfferRecommendationID string   `json:"offer_recommendation_id"`
	CreatedAt             string   `json:"created_at"`
	Decision              string   `json:"decision"`
	ConfidenceBucket      string   `json:"confidence_bucket"`
	RecommendedOfferPrice *float64 `json:"recommended_offer_price"`
}

type offerIntelligenceHistoryItemResponse struct {
	ID                    string                             `json:"id"`
	ProspectID            string                             `json:"prospect_id"`
	WorkspaceID           string                             `json:"workspace_id"`
	CreatedAt             string                             `json:"created_at"`
	FormulaVersion        string                             `json:"formula_version"`
	Decision              string                             `json:"decision"`
	Confidence            float64                            `json:"confidence"`
	ConfidenceBucket      string                             `json:"confidence_bucket"`
	ReasonCodes           []string                           `json:"reason_codes"`
	ReasonLabels          []string                           `json:"reason_labels"`
	RecommendedOfferPrice *float64                           `json:"recommended_offer_price"`
	RecommendedMargin     *float64                           `json:"recommended_margin"`
	RecommendedNetProfit  *float64                           `json:"recommended_net_profit"`
	Scenarios             []offerintelligence.Scenario       `json:"scenarios"`
	MessageTemplates      offerintelligence.MessageTemplates `json:"message_templates"`
	Assumptions           []string                           `json:"assumptions"`
	DefaultsUsed          []string                           `json:"defaults_used"`
	InputHash             string                             `json:"input_hash"`
	SettingsHash          string                             `json:"settings_hash"`
	IsStale               bool                               `json:"is_stale"`
	StaleReason           *string                            `json:"stale_reason,omitempty"`
}

type offerIntelligenceHistoryResponse struct {
	Items      []offerIntelligenceHistoryItemResponse `json:"items"`
	NextCursor *string                                `json:"next_cursor,omitempty"`
}

type offerProspectRecord struct {
	ID                     string
	WorkspaceID            string
	AskingPrice            *float64
	AreaUsable             *float64
	ExpectedSalePrice      *float64
	RenovationCostEstimate *float64
	HoldMonths             *int
	OtherCostsEstimate     *float64
	CondoFee               *float64
	IPTU                   *float64
	OfferPrice             *float64
	Neighborhood           *string
	Address                *string
	Agency                 *string
	BrokerName             *string
	BrokerPhone            *string
	FlipScore              *int
}

type persistedOfferOutputs struct {
	Decision            string                                 `json:"decision"`
	Confidence          float64                                `json:"confidence"`
	ConfidenceBucket    string                                 `json:"confidence_bucket"`
	ReasonCodes         []string                               `json:"reason_codes"`
	ReasonLabels        []string                               `json:"reason_labels"`
	RiskScore           float64                                `json:"risk_score"`
	Assumptions         []string                               `json:"assumptions"`
	DefaultsUsed        []string                               `json:"defaults_used"`
	Scenarios           []offerintelligence.Scenario           `json:"scenarios"`
	MessageTemplates    offerintelligence.MessageTemplates     `json:"message_templates"`
	InputHash           string                                 `json:"input_hash"`
	SettingsHash        string                                 `json:"settings_hash"`
	ConfidenceBreakdown offerintelligence.ConfidenceComponents `json:"confidence_breakdown"`
}

type persistedOfferInputs struct {
	AskingPrice            *float64 `json:"asking_price"`
	AreaUsable             *float64 `json:"area_usable"`
	ExpectedSalePrice      *float64 `json:"expected_sale_price"`
	RenovationCostEstimate *float64 `json:"renovation_cost_estimate"`
	HoldMonths             *int     `json:"hold_months"`
	OtherCostsEstimate     *float64 `json:"other_costs_estimate"`
	CondoFee               *float64 `json:"condo_fee"`
	IPTU                   *float64 `json:"iptu"`
	OfferPrice             *float64 `json:"offer_price"`
	Neighborhood           *string  `json:"neighborhood"`
	FlipScore              *int     `json:"flip_score"`
}

func (a *api) handleOfferIntelligenceGenerate(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	if !a.enforceOfferRollout(w, r, userID) {
		return
	}

	var req offerIntelligenceGenerateRequest
	if err := decodeOptionalJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	prospect, err := a.getOfferProspect(r.Context(), prospectID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	settings, defaultWeightsApplied, err := a.getOfferWorkspaceSettings(r.Context(), prospect.WorkspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace settings"})
		return
	}

	allowed, retryAfterSec := a.offerLimiter.Allow(prospect.WorkspaceID, settings.GenerateRateLimitPerMin)
	if !allowed {
		w.Header().Set("Retry-After", strconv.Itoa(retryAfterSec))
		writeError(w, http.StatusTooManyRequests, apiError{
			Code:    "RATE_LIMITED",
			Message: "too many offer intelligence generate requests",
			Details: []string{"retry_after_seconds=" + strconv.Itoa(retryAfterSec)},
		})
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_rate_limited", req.Source, map[string]any{
			"prospect_id": prospect.ID,
			"retry_after": retryAfterSec,
		})
		return
	}

	result, err := offerintelligence.Calculate(toOfferInputs(prospect), settings)
	if err != nil {
		if missing, ok := err.(offerintelligence.MissingCriticalInputsError); ok {
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "VALIDATION_ERROR",
				Message: "missing critical inputs",
				Details: missing.Fields,
			})
			a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_blocked_missing_inputs", req.Source, map[string]any{
				"prospect_id":    prospect.ID,
				"missing_fields": missing.Fields,
			})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to generate offer intelligence"})
		return
	}

	if defaultWeightsApplied {
		result.Assumptions = dedupeStringSlice(append(result.Assumptions, "Pesos de confiança inválidos; utilizado padrão do sistema"))
	}
	result = a.maybeEnhanceBrokerOfferMessage(r.Context(), prospect, result)

	ownerUserID, billing, err := a.getWorkspaceOwnerBilling(r.Context(), prospect.WorkspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to evaluate billing"})
		return
	}

	isTrialStarter := billing.Status == "trialing" || billing.Tier == "starter"
	fullAccess := true
	if isTrialStarter {
		if settings.FirstFullPreviewConsumed == nil {
			consumed, markErr := a.markFirstOfferPreviewConsumed(r.Context(), prospect.WorkspaceID, userID)
			if markErr != nil {
				writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to mark first preview consumption"})
				return
			}
			fullAccess = consumed
		} else {
			fullAccess = false
		}
	}

	preview := buildOfferPreviewResponse(prospect, result, billing.Tier, fullAccess)
	preview.GeneratedAt = time.Now().UTC().Format(time.RFC3339Nano)

	writeJSON(w, http.StatusOK, preview)

	eventProps := map[string]any{
		"prospect_id":       prospect.ID,
		"tier":              billing.Tier,
		"decision":          preview.Decision,
		"reason_codes":      preview.ReasonCodes,
		"confidence_bucket": preview.ConfidenceBucket,
		"defaults_count":    len(preview.DefaultsUsed),
		"owner_user_id":     ownerUserID,
	}
	a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_generated", req.Source, eventProps)
	if req.Source == "history_regenerate" {
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_regenerated", req.Source, eventProps)
	}
	if !preview.Gating.FullAccess {
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_paywall_viewed", "generate_limited", map[string]any{
			"prospect_id": prospect.ID,
			"tier":        billing.Tier,
		})
	}
	if len(preview.Assumptions) > 0 {
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_assumptions_used", req.Source, map[string]any{
			"prospect_id":       prospect.ID,
			"assumptions_count": len(preview.Assumptions),
		})
	}
	if preview.Decision == string(offerintelligence.DecisionReview) {
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_decision_review_reason", req.Source, map[string]any{
			"prospect_id":  prospect.ID,
			"reason_codes": preview.ReasonCodes,
			"decision":     preview.Decision,
			"tier":         billing.Tier,
		})
	}
}

func (a *api) handleOfferIntelligenceSave(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}
	if !a.enforceOfferRollout(w, r, userID) {
		return
	}

	var req offerIntelligenceSaveRequest
	if err := decodeOptionalJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	prospect, err := a.getOfferProspect(r.Context(), prospectID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	settings, defaultWeightsApplied, err := a.getOfferWorkspaceSettings(r.Context(), prospect.WorkspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace settings"})
		return
	}

	result, err := offerintelligence.Calculate(toOfferInputs(prospect), settings)
	if err != nil {
		if missing, ok := err.(offerintelligence.MissingCriticalInputsError); ok {
			writeError(w, http.StatusBadRequest, apiError{
				Code:    "VALIDATION_ERROR",
				Message: "missing critical inputs",
				Details: missing.Fields,
			})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to save offer intelligence"})
		return
	}
	if defaultWeightsApplied {
		result.Assumptions = dedupeStringSlice(append(result.Assumptions, "Pesos de confiança inválidos; utilizado padrão do sistema"))
	}
	result = a.maybeEnhanceBrokerOfferMessage(r.Context(), prospect, result)

	inputsJSON, err := json.Marshal(persistedOfferInputs{
		AskingPrice:            prospect.AskingPrice,
		AreaUsable:             prospect.AreaUsable,
		ExpectedSalePrice:      prospect.ExpectedSalePrice,
		RenovationCostEstimate: prospect.RenovationCostEstimate,
		HoldMonths:             prospect.HoldMonths,
		OtherCostsEstimate:     prospect.OtherCostsEstimate,
		CondoFee:               prospect.CondoFee,
		IPTU:                   prospect.IPTU,
		OfferPrice:             prospect.OfferPrice,
		Neighborhood:           prospect.Neighborhood,
		FlipScore:              prospect.FlipScore,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to encode inputs snapshot"})
		return
	}

	outputsJSON, err := json.Marshal(persistedOfferOutputs{
		Decision:            string(result.Decision),
		Confidence:          result.Confidence,
		ConfidenceBucket:    string(result.ConfidenceBucket),
		ReasonCodes:         reasonCodesToStrings(result.ReasonCodes),
		ReasonLabels:        result.ReasonLabels,
		RiskScore:           result.RiskScore,
		Assumptions:         result.Assumptions,
		DefaultsUsed:        result.DefaultsUsed,
		Scenarios:           result.Scenarios,
		MessageTemplates:    result.MessageTemplates,
		InputHash:           result.InputHash,
		SettingsHash:        result.SettingsHash,
		ConfidenceBreakdown: result.ConfidenceBreakdown,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to encode outputs snapshot"})
		return
	}

	recommended := getScenario(result.Scenarios, offerintelligence.ScenarioRecommended)
	var recPrice, recMargin, recNetProfit *float64
	if recommended != nil {
		recPrice = float64Ptr(recommended.OfferPrice)
		recMargin = float64Ptr(recommended.Margin)
		recNetProfit = float64Ptr(recommended.NetProfit)
	}

	var recommendationID string
	var createdAt time.Time
	err = a.db.QueryRowContext(r.Context(),
		`INSERT INTO offer_recommendations (
			workspace_id,
			prospect_id,
			created_by_user_id,
			formula_version,
			decision,
			confidence,
			confidence_bucket,
			reason_codes,
			recommended_offer_price,
			recommended_margin,
			recommended_net_profit,
			input_hash,
			settings_hash,
			is_stale,
			stale_reason,
			inputs_json,
			outputs_json
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, false, NULL, $14, $15
		)
		RETURNING id, created_at`,
		prospect.WorkspaceID,
		prospect.ID,
		userID,
		result.FormulaVersion,
		string(result.Decision),
		result.Confidence,
		string(result.ConfidenceBucket),
		pq.Array(reasonCodesToStrings(result.ReasonCodes)),
		recPrice,
		recMargin,
		recNetProfit,
		result.InputHash,
		result.SettingsHash,
		inputsJSON,
		outputsJSON,
	).Scan(&recommendationID, &createdAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to persist offer recommendation"})
		return
	}

	_, billing, _ := a.getWorkspaceOwnerBilling(r.Context(), prospect.WorkspaceID)
	a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_saved", req.Source, map[string]any{
		"prospect_id":             prospect.ID,
		"offer_recommendation_id": recommendationID,
		"decision":                string(result.Decision),
		"reason_codes":            reasonCodesToStrings(result.ReasonCodes),
		"confidence_bucket":       string(result.ConfidenceBucket),
		"defaults_count":          len(result.DefaultsUsed),
		"tier":                    billing.Tier,
	})

	writeJSON(w, http.StatusOK, offerIntelligenceSaveResponse{
		OfferRecommendationID: recommendationID,
		CreatedAt:             createdAt.UTC().Format(time.RFC3339Nano),
		Decision:              string(result.Decision),
		ConfidenceBucket:      string(result.ConfidenceBucket),
		RecommendedOfferPrice: recPrice,
	})
}

func (a *api) handleOfferIntelligenceHistory(w http.ResponseWriter, r *http.Request, prospectID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}
	if !a.enforceOfferRollout(w, r, userID) {
		return
	}

	prospect, err := a.getOfferProspect(r.Context(), prospectID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	settings, _, err := a.getOfferWorkspaceSettings(r.Context(), prospect.WorkspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace settings"})
		return
	}

	_, billing, err := a.getWorkspaceOwnerBilling(r.Context(), prospect.WorkspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to evaluate billing"})
		return
	}

	if (billing.Status == "trialing" || billing.Tier == "starter") && settings.FirstFullPreviewConsumed != nil {
		writeEnforcementError(w, ErrCodePaywallRequired,
			"Histórico completo da Oferta Inteligente disponível em planos Pro e Growth.",
			enforcementDetails{Tier: billing.Tier, Metric: "offer_intelligence_history"},
		)
		a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_paywall_viewed", "history", map[string]any{
			"prospect_id": prospect.ID,
			"tier":        billing.Tier,
		})
		return
	}

	limit := 20
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, parseErr := strconv.Atoi(raw)
		if parseErr != nil || parsed < 1 || parsed > 100 {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "limit must be between 1 and 100"})
			return
		}
		limit = parsed
	}

	cursor := strings.TrimSpace(r.URL.Query().Get("cursor"))
	var cursorCreatedAt *time.Time
	var cursorID *string
	if cursor != "" {
		ts, id, parseErr := parseOfferCursor(cursor)
		if parseErr != nil {
			writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid cursor"})
			return
		}
		cursorCreatedAt = &ts
		cursorID = &id
	}

	currentInputHash, currentSettingsHash, err := computeCurrentOfferHashes(prospect, settings)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "INTERNAL_ERROR", Message: "failed to compute current hashes"})
		return
	}

	query := `
		SELECT
			id,
			formula_version,
			decision,
			confidence,
			confidence_bucket,
			reason_codes,
			recommended_offer_price,
			recommended_margin,
			recommended_net_profit,
			input_hash,
			settings_hash,
			outputs_json,
			created_at
		FROM offer_recommendations
		WHERE workspace_id = $1
		  AND prospect_id = $2
	`
	args := []any{prospect.WorkspaceID, prospect.ID}
	argN := 3
	if cursorCreatedAt != nil && cursorID != nil {
		query += ` AND (created_at < $` + strconv.Itoa(argN) + ` OR (created_at = $` + strconv.Itoa(argN) + ` AND id::text < $` + strconv.Itoa(argN+1) + `))`
		args = append(args, *cursorCreatedAt, *cursorID)
		argN += 2
	}
	query += ` ORDER BY created_at DESC, id DESC LIMIT $` + strconv.Itoa(argN)
	args = append(args, limit+1)

	rows, err := a.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to list offer history"})
		return
	}
	defer rows.Close()

	items := make([]offerIntelligenceHistoryItemResponse, 0, limit)
	for rows.Next() {
		var (
			id                string
			formulaVersion    string
			decision          string
			confidence        float64
			confidenceBucket  string
			reasonCodes       []string
			recommendedPrice  *float64
			recommendedMargin *float64
			recommendedProfit *float64
			inputHash         string
			settingsHash      string
			outputsJSON       []byte
			createdAt         time.Time
		)
		if err := rows.Scan(
			&id,
			&formulaVersion,
			&decision,
			&confidence,
			&confidenceBucket,
			pq.Array(&reasonCodes),
			&recommendedPrice,
			&recommendedMargin,
			&recommendedProfit,
			&inputHash,
			&settingsHash,
			&outputsJSON,
			&createdAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to parse history item"})
			return
		}

		persisted := persistedOfferOutputs{}
		if err := json.Unmarshal(outputsJSON, &persisted); err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to decode history payload"})
			return
		}

		isStale := false
		var staleReason *string
		switch {
		case formulaVersion != offerintelligence.FormulaVersion:
			reason := string(offerintelligence.StaleReasonFormulaChanged)
			staleReason = &reason
			isStale = true
		case inputHash != currentInputHash:
			reason := string(offerintelligence.StaleReasonInputChanged)
			staleReason = &reason
			isStale = true
		case settingsHash != currentSettingsHash:
			reason := string(offerintelligence.StaleReasonSettingsChanged)
			staleReason = &reason
			isStale = true
		}

		reasonLabels := persisted.ReasonLabels
		if len(reasonLabels) == 0 {
			reasonLabels = reasonLabelsFromCodes(reasonCodes)
		}

		items = append(items, offerIntelligenceHistoryItemResponse{
			ID:                    id,
			ProspectID:            prospect.ID,
			WorkspaceID:           prospect.WorkspaceID,
			CreatedAt:             createdAt.UTC().Format(time.RFC3339Nano),
			FormulaVersion:        formulaVersion,
			Decision:              decision,
			Confidence:            confidence,
			ConfidenceBucket:      confidenceBucket,
			ReasonCodes:           reasonCodes,
			ReasonLabels:          reasonLabels,
			RecommendedOfferPrice: recommendedPrice,
			RecommendedMargin:     recommendedMargin,
			RecommendedNetProfit:  recommendedProfit,
			Scenarios:             persisted.Scenarios,
			MessageTemplates:      persisted.MessageTemplates,
			Assumptions:           persisted.Assumptions,
			DefaultsUsed:          persisted.DefaultsUsed,
			InputHash:             inputHash,
			SettingsHash:          settingsHash,
			IsStale:               isStale,
			StaleReason:           staleReason,
		})
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed while iterating history rows"})
		return
	}

	var nextCursor *string
	if len(items) > limit {
		trimmed := items[:limit]
		items = trimmed
		last := items[len(items)-1]
		cursorValue := encodeOfferCursor(last.CreatedAt, last.ID)
		nextCursor = &cursorValue
	}

	writeJSON(w, http.StatusOK, offerIntelligenceHistoryResponse{
		Items:      items,
		NextCursor: nextCursor,
	})
}

func (a *api) handleOfferIntelligenceDelete(w http.ResponseWriter, r *http.Request, prospectID string, recommendationID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}
	if !a.enforceOfferRollout(w, r, userID) {
		return
	}

	if _, err := uuid.Parse(recommendationID); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid recommendation id"})
		return
	}

	prospect, err := a.getOfferProspect(r.Context(), prospectID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "prospect not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch prospect"})
		return
	}

	result, err := a.db.ExecContext(r.Context(),
		`DELETE FROM offer_recommendations
		 WHERE workspace_id = $1
		   AND prospect_id = $2
		   AND id = $3`,
		prospect.WorkspaceID,
		prospect.ID,
		recommendationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to delete offer recommendation"})
		return
	}

	affected, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to verify delete result"})
		return
	}
	if affected == 0 {
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "offer recommendation not found"})
		return
	}

	a.trackOfferEvent(r, userID, prospect.WorkspaceID, "offer_intelligence_deleted", "history", map[string]any{
		"prospect_id":             prospect.ID,
		"offer_recommendation_id": recommendationID,
	})

	w.WriteHeader(http.StatusNoContent)
}

func (a *api) enforceOfferRollout(w http.ResponseWriter, r *http.Request, userID string) bool {
	rollout := strings.ToLower(strings.TrimSpace(a.offerIntelligenceRollout))
	switch rollout {
	case "all":
		return true
	case "internal":
		isAdmin, err := a.isUserAdmin(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check rollout"})
			return false
		}
		if !isAdmin {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "not found"})
			return false
		}
		return true
	default:
		writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "not found"})
		return false
	}
}

func (a *api) isUserAdmin(ctx context.Context, userID string) (bool, error) {
	var isAdmin bool
	err := a.db.QueryRowContext(ctx, `SELECT is_admin FROM "user" WHERE id = $1`, userID).Scan(&isAdmin)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return isAdmin, err
}

func (a *api) getOfferProspect(ctx context.Context, prospectID string, userID string) (offerProspectRecord, error) {
	row := offerProspectRecord{}
	err := a.db.QueryRowContext(ctx, `
		SELECT
			p.id,
			p.workspace_id,
			p.asking_price,
			p.area_usable,
			p.expected_sale_price,
			p.renovation_cost_estimate,
			p.hold_months,
			p.other_costs_estimate,
			p.condo_fee,
			p.iptu,
			p.offer_price,
			p.neighborhood,
			p.address,
			p.agency,
			p.broker_name,
			p.broker_phone,
			p.flip_score
		FROM prospecting_properties p
		JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		WHERE p.id = $1
		  AND m.user_id = $2
		  AND p.deleted_at IS NULL
	`, prospectID, userID).Scan(
		&row.ID,
		&row.WorkspaceID,
		&row.AskingPrice,
		&row.AreaUsable,
		&row.ExpectedSalePrice,
		&row.RenovationCostEstimate,
		&row.HoldMonths,
		&row.OtherCostsEstimate,
		&row.CondoFee,
		&row.IPTU,
		&row.OfferPrice,
		&row.Neighborhood,
		&row.Address,
		&row.Agency,
		&row.BrokerName,
		&row.BrokerPhone,
		&row.FlipScore,
	)
	return row, err
}

func (a *api) getOfferWorkspaceSettings(ctx context.Context, workspaceID string) (offerintelligence.WorkspaceSettings, bool, error) {
	var (
		weightsJSON           []byte
		consumedAt            sql.NullTime
		consumedUserID        sql.NullString
		settings              offerintelligence.WorkspaceSettings
		defaultWeightsApplied bool
	)

	err := a.db.QueryRowContext(ctx, `
		SELECT
			itbi_rate,
			registry_rate,
			broker_rate,
			pj_tax_rate,
			offer_min_margin_pct,
			offer_min_net_profit_brl,
			offer_min_confidence,
			offer_max_risk_score,
			offer_confidence_weights_json,
			offer_max_sale_to_ask_ratio,
			offer_generate_rate_limit_per_min,
			offer_first_full_preview_consumed_at,
			offer_first_full_preview_user_id
		FROM workspace_settings
		WHERE workspace_id = $1
	`, workspaceID).Scan(
		&settings.CashSettings.ITBIRate,
		&settings.CashSettings.RegistryRate,
		&settings.CashSettings.BrokerRate,
		&settings.CashSettings.PJTaxRate,
		&settings.MinMarginPct,
		&settings.MinNetProfitBRL,
		&settings.MinConfidence,
		&settings.MaxRiskScore,
		&weightsJSON,
		&settings.MaxSaleToAskRatio,
		&settings.GenerateRateLimitPerMin,
		&consumedAt,
		&consumedUserID,
	)
	if err != nil {
		return offerintelligence.WorkspaceSettings{}, false, err
	}

	weights := offerintelligence.DefaultWeights()
	if len(weightsJSON) > 0 {
		weightsMap := map[string]float64{}
		if unmarshalErr := json.Unmarshal(weightsJSON, &weightsMap); unmarshalErr == nil {
			if parsedWeights, parsedErr := offerintelligence.WeightsFromMap(weightsMap); parsedErr == nil {
				weights = parsedWeights
			} else {
				defaultWeightsApplied = true
			}
		} else {
			defaultWeightsApplied = true
		}
	} else {
		defaultWeightsApplied = true
	}
	settings.ConfidenceWeights = weights
	if settings.GenerateRateLimitPerMin <= 0 {
		settings.GenerateRateLimitPerMin = 10
	}
	if settings.MaxSaleToAskRatio <= 0 {
		settings.MaxSaleToAskRatio = 1.5
	}
	if consumedAt.Valid {
		consumed := consumedAt.Time
		settings.FirstFullPreviewConsumed = &consumed
	}
	if consumedUserID.Valid {
		uid := consumedUserID.String
		settings.FirstFullPreviewUserID = &uid
	}

	return settings, defaultWeightsApplied, nil
}

func (a *api) getWorkspaceOwnerBilling(ctx context.Context, workspaceID string) (string, userBilling, error) {
	var ownerUserID string
	if err := a.db.QueryRowContext(ctx, `SELECT created_by_user_id FROM workspaces WHERE id = $1`, workspaceID).Scan(&ownerUserID); err != nil {
		return "", userBilling{}, err
	}

	billing, err := a.getUserBilling(ctx, ownerUserID)
	if err == sql.ErrNoRows {
		billing, err = a.createDefaultBilling(ctx, ownerUserID)
	}
	if err != nil {
		return ownerUserID, userBilling{}, err
	}

	return ownerUserID, billing, nil
}

func (a *api) markFirstOfferPreviewConsumed(ctx context.Context, workspaceID, userID string) (bool, error) {
	result, err := a.db.ExecContext(ctx, `
		UPDATE workspace_settings
		SET offer_first_full_preview_consumed_at = NOW(),
			offer_first_full_preview_user_id = $2,
			updated_at = NOW()
		WHERE workspace_id = $1
		  AND offer_first_full_preview_consumed_at IS NULL
	`, workspaceID, userID)
	if err != nil {
		return false, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rowsAffected > 0, nil
}

func (a *api) maybeEnhanceBrokerOfferMessage(
	ctx context.Context,
	prospect offerProspectRecord,
	result offerintelligence.CalculationResult,
) offerintelligence.CalculationResult {
	recommended := getScenario(result.Scenarios, offerintelligence.ScenarioRecommended)
	if recommended == nil {
		return result
	}

	result.MessageTemplates.Short = buildDeterministicBrokerShortMessage(prospect, recommended.OfferPrice)
	fallbackFull := buildDeterministicBrokerFullMessage(prospect, askingValue(prospect.AskingPrice), recommended.OfferPrice)
	result.MessageTemplates.Full = fallbackFull

	if a.llmClient == nil {
		return result
	}

	askingPrice := 0.0
	if prospect.AskingPrice != nil {
		askingPrice = *prospect.AskingPrice
	}

	llmCtx, cancel := context.WithTimeout(ctx, 6500*time.Millisecond)
	defer cancel()

	message, err := a.llmClient.GenerateBrokerOfferMessage(llmCtx, llm.BrokerOfferMessageInput{
		BrokerName:       valueOrDefault(prospect.BrokerName, ""),
		Agency:           valueOrDefault(prospect.Agency, ""),
		Address:          valueOrDefault(prospect.Address, ""),
		Neighborhood:     valueOrDefault(prospect.Neighborhood, ""),
		AskingPrice:      askingPrice,
		SuggestedOffer:   recommended.OfferPrice,
		Decision:         string(result.Decision),
		MarginPct:        recommended.Margin,
		NetProfit:        recommended.NetProfit,
		ConfidenceBucket: string(result.ConfidenceBucket),
		ReasonLabels:     result.ReasonLabels,
	})
	if err != nil || strings.TrimSpace(message) == "" {
		if err != nil {
			log.Printf("offer_intelligence_whatsapp_llm_fallback prospect_id=%s reason=%v", prospect.ID, err)
		}
		return result
	}

	result.MessageTemplates.Full = message
	return result
}

func buildOfferPreviewResponse(
	prospect offerProspectRecord,
	result offerintelligence.CalculationResult,
	tier string,
	fullAccess bool,
) offerIntelligencePreviewResponse {
	gating := offerGatingResponse{
		FullAccess:       fullAccess,
		AllowedScenarios: []string{string(offerintelligence.ScenarioAggressive), string(offerintelligence.ScenarioRecommended), string(offerintelligence.ScenarioCeiling)},
		HistoryEnabled:   true,
		MessageLevel:     string(offerintelligence.MessageLevelFull),
	}

	scenarios := result.Scenarios
	messageTemplates := result.MessageTemplates
	limited := false
	if !fullAccess {
		gating = offerGatingResponse{
			FullAccess:       false,
			AllowedScenarios: []string{string(offerintelligence.ScenarioRecommended)},
			HistoryEnabled:   false,
			MessageLevel:     string(offerintelligence.MessageLevelShort),
		}
		recommended := getScenario(result.Scenarios, offerintelligence.ScenarioRecommended)
		if recommended != nil {
			scenarios = []offerintelligence.Scenario{*recommended}
		} else {
			scenarios = []offerintelligence.Scenario{}
		}
		messageTemplates.Full = messageTemplates.Short
		limited = true
	}

	return offerIntelligencePreviewResponse{
		ProspectID:          prospect.ID,
		WorkspaceID:         prospect.WorkspaceID,
		FormulaVersion:      result.FormulaVersion,
		GeneratedAt:         time.Now().UTC().Format(time.RFC3339Nano),
		Decision:            string(result.Decision),
		Confidence:          result.Confidence,
		ConfidenceBucket:    string(result.ConfidenceBucket),
		ReasonCodes:         reasonCodesToStrings(result.ReasonCodes),
		ReasonLabels:        result.ReasonLabels,
		RiskScore:           result.RiskScore,
		Assumptions:         result.Assumptions,
		DefaultsUsed:        result.DefaultsUsed,
		Scenarios:           scenarios,
		MessageTemplates:    messageTemplates,
		Gating:              gating,
		InputHash:           result.InputHash,
		SettingsHash:        result.SettingsHash,
		Tier:                tier,
		Limited:             limited,
		ConfidenceBreakdown: result.ConfidenceBreakdown,
	}
}

func toOfferInputs(p offerProspectRecord) offerintelligence.ProspectInputs {
	return offerintelligence.ProspectInputs{
		ID:                     p.ID,
		WorkspaceID:            p.WorkspaceID,
		AskingPrice:            p.AskingPrice,
		AreaUsable:             p.AreaUsable,
		ExpectedSalePrice:      p.ExpectedSalePrice,
		RenovationCostEstimate: p.RenovationCostEstimate,
		HoldMonths:             p.HoldMonths,
		OtherCostsEstimate:     p.OtherCostsEstimate,
		CondoFee:               p.CondoFee,
		IPTU:                   p.IPTU,
		OfferPrice:             p.OfferPrice,
		Neighborhood:           p.Neighborhood,
		FlipScore:              p.FlipScore,
	}
}

func decodeOptionalJSON[T any](r *http.Request, target *T) error {
	if r.Body == nil {
		return nil
	}
	defer r.Body.Close()

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		if err == io.EOF {
			return nil
		}
		return err
	}
	return nil
}

func reasonCodesToStrings(codes []offerintelligence.ReasonCode) []string {
	out := make([]string, 0, len(codes))
	for _, code := range codes {
		out = append(out, string(code))
	}
	return out
}

func reasonLabelsFromCodes(codes []string) []string {
	labels := make([]string, 0, len(codes))
	for _, code := range codes {
		label, ok := offerintelligence.ReasonLabelByCode[offerintelligence.ReasonCode(code)]
		if ok {
			labels = append(labels, label)
		}
	}
	return labels
}

func getScenario(items []offerintelligence.Scenario, key offerintelligence.ScenarioKey) *offerintelligence.Scenario {
	for i := range items {
		if items[i].Key == key {
			return &items[i]
		}
	}
	return nil
}

func float64Ptr(v float64) *float64 {
	value := v
	return &value
}

func valueOrDefault(v *string, fallback string) string {
	if v == nil {
		return fallback
	}
	trimmed := strings.TrimSpace(*v)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func askingValue(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}

func buildDeterministicBrokerShortMessage(prospect offerProspectRecord, suggestedOffer float64) string {
	greeting := deterministicGreeting(prospect.BrokerName)
	property := deterministicPropertyReference(prospect)
	return fmt.Sprintf(
		"%s Tenho interesse %s e consigo avançar com proposta de R$ %.0f. Você consegue levar ao proprietário e me retornar?",
		greeting,
		property,
		suggestedOffer,
	)
}

func buildDeterministicBrokerFullMessage(prospect offerProspectRecord, askingPrice float64, suggestedOffer float64) string {
	greeting := deterministicGreeting(prospect.BrokerName)
	property := deterministicPropertyReference(prospect)
	agency := deterministicAgencyReference(prospect.Agency)
	if askingPrice > 0 {
		return fmt.Sprintf(
			"%s Tenho interesse %s%s. Vi que o pedido está em R$ %.0f e consigo formalizar proposta de R$ %.0f. Se fizer sentido, você consegue levar ao proprietário e me retornar? Obrigado!",
			greeting,
			property,
			agency,
			askingPrice,
			suggestedOffer,
		)
	}
	return fmt.Sprintf(
		"%s Tenho interesse %s%s e consigo formalizar proposta de R$ %.0f. Se fizer sentido, você consegue levar ao proprietário e me retornar? Obrigado!",
		greeting,
		property,
		agency,
		suggestedOffer,
	)
}

func deterministicGreeting(brokerName *string) string {
	hour := time.Now().Hour()
	period := "Bom dia"
	if hour >= 12 && hour < 18 {
		period = "Boa tarde"
	} else if hour >= 18 || hour < 5 {
		period = "Boa noite"
	}

	name := ""
	if brokerName != nil {
		parts := strings.Fields(strings.TrimSpace(*brokerName))
		if len(parts) > 0 {
			name = parts[0]
		}
	}
	if name != "" {
		return fmt.Sprintf("Olá, %s! %s, tudo bem?", name, period)
	}
	return fmt.Sprintf("Olá! %s, tudo bem?", period)
}

func deterministicPropertyReference(prospect offerProspectRecord) string {
	address := valueOrDefault(prospect.Address, "")
	neighborhood := valueOrDefault(prospect.Neighborhood, "")
	if address != "" && neighborhood != "" {
		return fmt.Sprintf("no imóvel da %s (%s)", address, neighborhood)
	}
	if address != "" {
		return fmt.Sprintf("no imóvel da %s", address)
	}
	if neighborhood != "" {
		return fmt.Sprintf("no imóvel no bairro %s", neighborhood)
	}
	return "neste imóvel"
}

func deterministicAgencyReference(agency *string) string {
	name := valueOrDefault(agency, "")
	if name == "" {
		return ""
	}
	return fmt.Sprintf(" com a %s", name)
}

func computeCurrentOfferHashes(
	prospect offerProspectRecord,
	settings offerintelligence.WorkspaceSettings,
) (string, string, error) {
	holdMonths := 6
	if prospect.HoldMonths != nil && *prospect.HoldMonths > 0 {
		holdMonths = *prospect.HoldMonths
	}
	otherCosts := 0.0
	if prospect.OtherCostsEstimate != nil {
		otherCosts = *prospect.OtherCostsEstimate
	}
	condoFee := 0.0
	if prospect.CondoFee != nil {
		condoFee = *prospect.CondoFee
	}
	iptu := 0.0
	if prospect.IPTU != nil {
		iptu = *prospect.IPTU
	}

	inputHash, err := offerintelligence.HashInputSnapshot(offerintelligence.InputSnapshot{
		AskingPrice:            prospect.AskingPrice,
		AreaUsable:             prospect.AreaUsable,
		ExpectedSalePrice:      prospect.ExpectedSalePrice,
		RenovationCostEstimate: prospect.RenovationCostEstimate,
		HoldMonths:             holdMonths,
		OtherCostsEstimate:     otherCosts,
		CondoFee:               condoFee,
		IPTU:                   iptu,
		OfferPrice:             prospect.OfferPrice,
		Neighborhood:           prospect.Neighborhood,
		FlipScore:              prospect.FlipScore,
	})
	if err != nil {
		return "", "", err
	}

	settingsHash, err := offerintelligence.HashSettingsSnapshot(offerintelligence.SettingsSnapshot{
		FormulaVersion:          offerintelligence.FormulaVersion,
		ITBIRate:                settings.CashSettings.ITBIRate,
		RegistryRate:            settings.CashSettings.RegistryRate,
		BrokerRate:              settings.CashSettings.BrokerRate,
		PJTaxRate:               settings.CashSettings.PJTaxRate,
		MinMarginPct:            settings.MinMarginPct,
		MinNetProfitBRL:         settings.MinNetProfitBRL,
		MinConfidence:           settings.MinConfidence,
		MaxRiskScore:            settings.MaxRiskScore,
		MaxSaleToAskRatio:       settings.MaxSaleToAskRatio,
		GenerateRateLimitPerMin: settings.GenerateRateLimitPerMin,
		ConfidenceWeights:       settings.ConfidenceWeights.ToMap(),
	})
	if err != nil {
		return "", "", err
	}

	return inputHash, settingsHash, nil
}

func encodeOfferCursor(createdAt string, id string) string {
	return createdAt + "|" + id
}

func parseOfferCursor(cursor string) (time.Time, string, error) {
	parts := strings.SplitN(cursor, "|", 2)
	if len(parts) != 2 {
		return time.Time{}, "", io.ErrUnexpectedEOF
	}
	t, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", err
	}
	return t, parts[1], nil
}

func dedupeStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func (a *api) trackOfferEvent(r *http.Request, userID, workspaceID, eventName, source string, metadata map[string]any) {
	if userID == "" || workspaceID == "" || eventName == "" {
		return
	}
	if source == "" {
		source = "direct"
	}
	uid := userID
	wid := workspaceID
	requestID := strings.TrimSpace(r.Header.Get("X-Request-ID"))

	var requestIDPtr *string
	if requestID != "" {
		requestIDPtr = &requestID
	}

	_ = a.insertFunnelEvent(r.Context(), funnelEventInsert{
		EventName:       eventName,
		SessionID:       normalizeSessionID(r.Header.Get("X-Widia-Session-ID"), requestID),
		UserID:          &uid,
		WorkspaceID:     &wid,
		Variant:         "control",
		Source:          source,
		DeviceType:      normalizeDevice(r.Header.Get("X-Widia-Device"), r.Header.Get("User-Agent")),
		Path:            normalizePath(r.Header.Get("X-Widia-Path")),
		RequestID:       requestIDPtr,
		IsAuthenticated: true,
		Metadata:        metadata,
		EventAt:         time.Now().UTC(),
	})
}
