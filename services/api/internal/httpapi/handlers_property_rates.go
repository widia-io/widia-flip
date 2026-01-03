package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/widia-projects/widia-flip/services/api/internal/auth"
	"github.com/widia-projects/widia-flip/services/api/internal/viability"
)

type propertyRates struct {
	ITBIRate     *float64 `json:"itbi_rate"`
	RegistryRate *float64 `json:"registry_rate"`
	BrokerRate   *float64 `json:"broker_rate"`
	PJTaxRate    *float64 `json:"pj_tax_rate"`
}

type effectiveRates struct {
	ITBIRate     float64 `json:"itbi_rate"`
	RegistryRate float64 `json:"registry_rate"`
	BrokerRate   float64 `json:"broker_rate"`
	PJTaxRate    float64 `json:"pj_tax_rate"`
}

type propertyRatesResponse struct {
	Custom         propertyRates  `json:"custom"`
	Effective      effectiveRates `json:"effective"`
	WorkspaceRates effectiveRates `json:"workspace_rates"`
	UpdatedAt      *time.Time     `json:"updated_at,omitempty"`
}

func (a *api) handlePropertyRates(w http.ResponseWriter, r *http.Request, propertyID string) {
	switch r.Method {
	case http.MethodGet:
		a.handleGetPropertyRates(w, r, propertyID)
	case http.MethodPut:
		a.handleUpdatePropertyRates(w, r, propertyID)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (a *api) handleGetPropertyRates(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	// Check access and get workspace_id
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Get workspace settings
	wsRates, err := a.getWorkspaceCashSettings(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace settings"})
		return
	}

	// Get custom property rates (may not exist)
	var custom propertyRates
	var updatedAt *time.Time
	err = a.db.QueryRowContext(
		r.Context(),
		`SELECT itbi_rate, registry_rate, broker_rate, pj_tax_rate, updated_at
		 FROM property_tax_rates
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&custom.ITBIRate, &custom.RegistryRate, &custom.BrokerRate, &custom.PJTaxRate, &updatedAt)
	if err != nil && err != sql.ErrNoRows {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch property rates"})
		return
	}

	// Calculate effective rates
	effective := effectiveRates{
		ITBIRate:     wsRates.ITBIRate,
		RegistryRate: wsRates.RegistryRate,
		BrokerRate:   wsRates.BrokerRate,
		PJTaxRate:    wsRates.PJTaxRate,
	}
	if custom.ITBIRate != nil {
		effective.ITBIRate = *custom.ITBIRate
	}
	if custom.RegistryRate != nil {
		effective.RegistryRate = *custom.RegistryRate
	}
	if custom.BrokerRate != nil {
		effective.BrokerRate = *custom.BrokerRate
	}
	if custom.PJTaxRate != nil {
		effective.PJTaxRate = *custom.PJTaxRate
	}

	writeJSON(w, http.StatusOK, propertyRatesResponse{
		Custom:    custom,
		Effective: effective,
		WorkspaceRates: effectiveRates{
			ITBIRate:     wsRates.ITBIRate,
			RegistryRate: wsRates.RegistryRate,
			BrokerRate:   wsRates.BrokerRate,
			PJTaxRate:    wsRates.PJTaxRate,
		},
		UpdatedAt: updatedAt,
	})
}

func (a *api) handleUpdatePropertyRates(w http.ResponseWriter, r *http.Request, propertyID string) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, apiError{Code: "UNAUTHORIZED", Message: "missing auth"})
		return
	}

	var req propertyRates
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "invalid json body", Details: []string{err.Error()}})
		return
	}

	// Validate rates (must be between 0 and 1)
	if req.ITBIRate != nil && (*req.ITBIRate < 0 || *req.ITBIRate > 1) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "itbi_rate must be between 0 and 1"})
		return
	}
	if req.RegistryRate != nil && (*req.RegistryRate < 0 || *req.RegistryRate > 1) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "registry_rate must be between 0 and 1"})
		return
	}
	if req.BrokerRate != nil && (*req.BrokerRate < 0 || *req.BrokerRate > 1) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "broker_rate must be between 0 and 1"})
		return
	}
	if req.PJTaxRate != nil && (*req.PJTaxRate < 0 || *req.PJTaxRate > 1) {
		writeError(w, http.StatusBadRequest, apiError{Code: "VALIDATION_ERROR", Message: "pj_tax_rate must be between 0 and 1"})
		return
	}

	// Check access and get workspace_id
	var workspaceID string
	err := a.db.QueryRowContext(
		r.Context(),
		`SELECT p.workspace_id
		 FROM properties p
		 JOIN workspace_memberships m ON m.workspace_id = p.workspace_id
		 WHERE p.id = $1 AND m.user_id = $2`,
		propertyID, userID,
	).Scan(&workspaceID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, apiError{Code: "NOT_FOUND", Message: "property not found"})
			return
		}
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to check property"})
		return
	}

	// Upsert property rates
	var custom propertyRates
	var updatedAt time.Time
	err = a.db.QueryRowContext(
		r.Context(),
		`INSERT INTO property_tax_rates (property_id, workspace_id, itbi_rate, registry_rate, broker_rate, pj_tax_rate)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (property_id)
		 DO UPDATE SET
		   itbi_rate = $3,
		   registry_rate = $4,
		   broker_rate = $5,
		   pj_tax_rate = $6,
		   updated_at = now()
		 RETURNING itbi_rate, registry_rate, broker_rate, pj_tax_rate, updated_at`,
		propertyID, workspaceID, req.ITBIRate, req.RegistryRate, req.BrokerRate, req.PJTaxRate,
	).Scan(&custom.ITBIRate, &custom.RegistryRate, &custom.BrokerRate, &custom.PJTaxRate, &updatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to save property rates", Details: []string{err.Error()}})
		return
	}

	// Get workspace settings for response
	wsRates, err := a.getWorkspaceCashSettings(r.Context(), workspaceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, apiError{Code: "DB_ERROR", Message: "failed to fetch workspace settings"})
		return
	}

	// Calculate effective rates
	effective := effectiveRates{
		ITBIRate:     wsRates.ITBIRate,
		RegistryRate: wsRates.RegistryRate,
		BrokerRate:   wsRates.BrokerRate,
		PJTaxRate:    wsRates.PJTaxRate,
	}
	if custom.ITBIRate != nil {
		effective.ITBIRate = *custom.ITBIRate
	}
	if custom.RegistryRate != nil {
		effective.RegistryRate = *custom.RegistryRate
	}
	if custom.BrokerRate != nil {
		effective.BrokerRate = *custom.BrokerRate
	}
	if custom.PJTaxRate != nil {
		effective.PJTaxRate = *custom.PJTaxRate
	}

	writeJSON(w, http.StatusOK, propertyRatesResponse{
		Custom:    custom,
		Effective: effective,
		WorkspaceRates: effectiveRates{
			ITBIRate:     wsRates.ITBIRate,
			RegistryRate: wsRates.RegistryRate,
			BrokerRate:   wsRates.BrokerRate,
			PJTaxRate:    wsRates.PJTaxRate,
		},
		UpdatedAt: &updatedAt,
	})
}

// settingsToRates converts CashSettings to effectiveRates for API response
func settingsToRates(s viability.CashSettings) effectiveRates {
	return effectiveRates{
		ITBIRate:     s.ITBIRate,
		RegistryRate: s.RegistryRate,
		BrokerRate:   s.BrokerRate,
		PJTaxRate:    s.PJTaxRate,
	}
}

// financingSettingsToRates converts FinancingSettings to effectiveRates for API response
func financingSettingsToRates(s viability.FinancingSettings) effectiveRates {
	return effectiveRates{
		ITBIRate:     s.ITBIRate,
		RegistryRate: s.RegistryRate,
		BrokerRate:   s.BrokerRate,
		PJTaxRate:    s.PJTaxRate,
	}
}

// getEffectivePropertySettings fetches workspace settings and merges with property-level overrides
func (a *api) getEffectivePropertySettings(ctx context.Context, propertyID, workspaceID string) (viability.CashSettings, error) {
	// Get workspace defaults
	ws, err := a.getWorkspaceCashSettings(ctx, workspaceID)
	if err != nil {
		return ws, err
	}

	// Get custom property rates (may not exist)
	var custom propertyRates
	err = a.db.QueryRowContext(
		ctx,
		`SELECT itbi_rate, registry_rate, broker_rate, pj_tax_rate
		 FROM property_tax_rates
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&custom.ITBIRate, &custom.RegistryRate, &custom.BrokerRate, &custom.PJTaxRate)
	if err == sql.ErrNoRows {
		return ws, nil // No custom rates, use workspace
	}
	if err != nil {
		return ws, err
	}

	// Merge: custom overrides workspace where not NULL
	if custom.ITBIRate != nil {
		ws.ITBIRate = *custom.ITBIRate
	}
	if custom.RegistryRate != nil {
		ws.RegistryRate = *custom.RegistryRate
	}
	if custom.BrokerRate != nil {
		ws.BrokerRate = *custom.BrokerRate
	}
	if custom.PJTaxRate != nil {
		ws.PJTaxRate = *custom.PJTaxRate
	}

	return ws, nil
}

// getEffectiveFinancingSettings is the same as getEffectivePropertySettings but returns FinancingSettings
func (a *api) getEffectiveFinancingSettings(ctx context.Context, propertyID, workspaceID string) (viability.FinancingSettings, error) {
	// Get workspace defaults
	ws, err := a.getWorkspaceFinancingSettings(ctx, workspaceID)
	if err != nil {
		return ws, err
	}

	// Get custom property rates (may not exist)
	var custom propertyRates
	err = a.db.QueryRowContext(
		ctx,
		`SELECT itbi_rate, registry_rate, broker_rate, pj_tax_rate
		 FROM property_tax_rates
		 WHERE property_id = $1`,
		propertyID,
	).Scan(&custom.ITBIRate, &custom.RegistryRate, &custom.BrokerRate, &custom.PJTaxRate)
	if err == sql.ErrNoRows {
		return ws, nil // No custom rates, use workspace
	}
	if err != nil {
		return ws, err
	}

	// Merge: custom overrides workspace where not NULL
	if custom.ITBIRate != nil {
		ws.ITBIRate = *custom.ITBIRate
	}
	if custom.RegistryRate != nil {
		ws.RegistryRate = *custom.RegistryRate
	}
	if custom.BrokerRate != nil {
		ws.BrokerRate = *custom.BrokerRate
	}
	if custom.PJTaxRate != nil {
		ws.PJTaxRate = *custom.PJTaxRate
	}

	return ws, nil
}
