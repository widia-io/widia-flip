package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
)

type onboardingChecklist struct {
	CreatedWorkspace      bool `json:"created_workspace"`
	AddedProspect         bool `json:"added_prospect"`
	CalculatedScore       bool `json:"calculated_score"`
	ConvertedToProperty   bool `json:"converted_to_property"`
}

type userPreferences struct {
	ID                    string              `json:"id"`
	UserID                string              `json:"user_id"`
	OnboardingCompleted   bool                `json:"onboarding_completed"`
	OnboardingChecklist   onboardingChecklist `json:"onboarding_checklist"`
	FeatureTourCompleted  bool                `json:"feature_tour_completed"`
	CreatedAt             time.Time           `json:"created_at"`
	UpdatedAt             time.Time           `json:"updated_at"`
}

type updatePreferencesRequest struct {
	OnboardingCompleted   *bool                `json:"onboarding_completed,omitempty"`
	OnboardingChecklist   *onboardingChecklist `json:"onboarding_checklist,omitempty"`
	FeatureTourCompleted  *bool                `json:"feature_tour_completed,omitempty"`
}

func (a *api) handleUserPreferences(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.handleGetUserPreferences(w, r)
		return
	case http.MethodPut:
		a.handleUpdateUserPreferences(w, r)
		return
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

func (a *api) handleGetUserPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	prefs, err := a.getOrCreateUserPreferences(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to get preferences",
		})
		return
	}

	writeJSON(w, http.StatusOK, prefs)
}

func (a *api) handleUpdateUserPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req updatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{
			Code:    "INVALID_REQUEST",
			Message: "invalid JSON body",
		})
		return
	}

	// Get current preferences or create default
	prefs, err := a.getOrCreateUserPreferences(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to get preferences",
		})
		return
	}

	// Apply updates
	if req.OnboardingCompleted != nil {
		prefs.OnboardingCompleted = *req.OnboardingCompleted
	}
	if req.OnboardingChecklist != nil {
		// Merge checklist fields (only set true, never unset)
		if req.OnboardingChecklist.CreatedWorkspace {
			prefs.OnboardingChecklist.CreatedWorkspace = true
		}
		if req.OnboardingChecklist.AddedProspect {
			prefs.OnboardingChecklist.AddedProspect = true
		}
		if req.OnboardingChecklist.CalculatedScore {
			prefs.OnboardingChecklist.CalculatedScore = true
		}
		if req.OnboardingChecklist.ConvertedToProperty {
			prefs.OnboardingChecklist.ConvertedToProperty = true
		}
	}
	if req.FeatureTourCompleted != nil {
		prefs.FeatureTourCompleted = *req.FeatureTourCompleted
	}

	// Save updates
	checklistJSON, err := json.Marshal(prefs.OnboardingChecklist)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to serialize checklist",
		})
		return
	}

	_, err = a.db.ExecContext(r.Context(), `
		UPDATE flip.user_preferences
		SET onboarding_completed = $1,
		    onboarding_checklist = $2,
		    feature_tour_completed = $3,
		    updated_at = NOW()
		WHERE user_id = $4
	`, prefs.OnboardingCompleted, checklistJSON, prefs.FeatureTourCompleted, userID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to update preferences",
		})
		return
	}

	// Return updated preferences
	updatedPrefs, err := a.getOrCreateUserPreferences(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{
			Code:    "INTERNAL_ERROR",
			Message: "failed to get updated preferences",
		})
		return
	}

	writeJSON(w, http.StatusOK, updatedPrefs)
}

func (a *api) getOrCreateUserPreferences(ctx context.Context, userID string) (*userPreferences, error) {
	var prefs userPreferences
	var checklistJSON []byte

	err := a.db.QueryRowContext(ctx, `
		SELECT id, user_id, onboarding_completed, onboarding_checklist,
		       feature_tour_completed, created_at, updated_at
		FROM flip.user_preferences
		WHERE user_id = $1
	`, userID).Scan(
		&prefs.ID,
		&prefs.UserID,
		&prefs.OnboardingCompleted,
		&checklistJSON,
		&prefs.FeatureTourCompleted,
		&prefs.CreatedAt,
		&prefs.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// Create default preferences
		defaultChecklist := onboardingChecklist{
			CreatedWorkspace:    false,
			AddedProspect:       false,
			CalculatedScore:     false,
			ConvertedToProperty: false,
		}
		checklistJSON, _ := json.Marshal(defaultChecklist)

		err = a.db.QueryRowContext(ctx, `
			INSERT INTO flip.user_preferences (user_id, onboarding_checklist)
			VALUES ($1, $2)
			RETURNING id, user_id, onboarding_completed, onboarding_checklist,
			          feature_tour_completed, created_at, updated_at
		`, userID, checklistJSON).Scan(
			&prefs.ID,
			&prefs.UserID,
			&prefs.OnboardingCompleted,
			&checklistJSON,
			&prefs.FeatureTourCompleted,
			&prefs.CreatedAt,
			&prefs.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	// Parse checklist JSON
	if err := json.Unmarshal(checklistJSON, &prefs.OnboardingChecklist); err != nil {
		return nil, err
	}

	return &prefs, nil
}
